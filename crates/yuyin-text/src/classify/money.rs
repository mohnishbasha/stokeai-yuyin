//! Currency detection (owner: S1-T04, PRD FR-007).
//!
//! Detected shapes:
//!
//! - A currency marker before the amount: `₹`, `Rs`, `Rs.`, `INR`, `रु` (rupee) and `$`, `USD`
//!   (dollar). Letters are matched ignoring case. One space may sit between marker and amount.
//!   `₹1,25,000`, `Rs. 500`, `$4.25`, `USD 5`.
//! - The same markers after the amount: `500 INR`, `250 Rs`.
//! - Indian or Western digit grouping, ASCII or Devanagari digits (same rules as numbers).
//! - Minor units as the digits after the point: `₹250.50` is 250 rupees and 50 paise.
//! - A scale word after the amount: `₹1.5 lakh`, `₹2 Cr`, `$3 million` (see [`Scale`]).
//! - A trailing `/-` (cheque style, `Rs 12,450/-`) is part of the span and is not spoken.
//! - A minus sign before the marker or between marker and amount makes the amount negative.
//!
//! A marker with no amount, or an amount with no marker, is not money; the number class and
//! plain text rules handle those. Other currencies (`€`, `£`) are not detected yet and pass
//! through (PRD FR-007: unrecognised symbols are left to the engine).
//!
//! Spoken forms are in [`crate::verbalise::money`]. Golden rows: `golden/money.tsv`
//! (class `money`).

use super::number::{parse_number, NumberValue};
use super::{ClassifyCtx, Detection};
use crate::{Semiotic, SpanKind};

/// A currency.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Currency {
    /// Indian rupee: `₹`, `Rs`, `Rs.`, `INR`, `रु`.
    Inr,
    /// US dollar: `$`, `USD`.
    Usd,
    /// Euro: `€`, `EUR`.
    Eur,
    /// Pound sterling: `£`, `GBP`.
    Gbp,
}

/// A scale word written after the amount.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Scale {
    /// Thousand: `k`, `thousand`, `हज़ार`.
    Thousand,
    /// Lakh (100,000): `lakh`, `lac`, `lakhs`, `लाख`.
    Lakh,
    /// Crore (10,000,000): `crore`, `Cr`, `करोड़`.
    Crore,
    /// Million: `million`, `mn`.
    Million,
    /// Billion: `billion`, `bn`.
    Billion,
}

impl Scale {
    /// The value one unit of this scale stands for.
    #[must_use]
    pub fn multiplier(self) -> u64 {
        match self {
            Self::Thousand => 1_000,
            Self::Lakh => 100_000,
            Self::Crore => 10_000_000,
            Self::Million => 1_000_000,
            Self::Billion => 1_000_000_000,
        }
    }

    /// The scale a written word stands for, or `None`.
    ///
    /// # Examples
    ///
    /// ```
    /// use yuyin_text::classify::money::Scale;
    /// assert_eq!(Scale::parse("Cr"), Some(Scale::Crore));
    /// assert_eq!(Scale::parse("lakh"), Some(Scale::Lakh));
    /// assert_eq!(Scale::parse("kilo"), None);
    /// ```
    #[must_use]
    pub fn parse(word: &str) -> Option<Self> {
        match word.to_lowercase().as_str() {
            "k" | "thousand" | "हज़ार" | "हजार" => Some(Self::Thousand),
            "lakh" | "lakhs" | "lac" | "lacs" | "लाख" => Some(Self::Lakh),
            "crore" | "crores" | "cr" | "करोड़" | "करोड" => Some(Self::Crore),
            "million" | "mn" => Some(Self::Million),
            "billion" | "bn" => Some(Self::Billion),
            _ => None,
        }
    }
}

/// A parsed currency amount.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Money {
    /// The currency.
    pub currency: Currency,
    /// The amount in major units as written. A decimal amount carries the minor units in its
    /// fraction digits (`₹12.50` is `Decimal { integer: 12, fraction_digits: "50" }`). With a
    /// [`Self::scale`] it is the number in front of the scale word (`1.5` in `₹1.5 lakh`).
    pub amount: NumberValue,
    /// The scale word, if one was written. The value is `amount` times the scale.
    pub scale: Option<Scale>,
}

/// The currency a marker token stands for, ignoring case for letters.
fn marker(text: &str) -> Option<Currency> {
    match text.to_lowercase().as_str() {
        "₹" | "rs" | "inr" | "रु" | "रू" => Some(Currency::Inr),
        "$" | "usd" => Some(Currency::Usd),
        _ => None,
    }
}

fn is_minus(text: &str) -> bool {
    matches!(text, "-" | "\u{2212}")
}

/// True if token `i` is a space that does not break the line.
fn is_blank(ctx: &ClassifyCtx<'_>, i: usize) -> bool {
    ctx.kind(i) == Some(SpanKind::Space) && !ctx.token_text(i).contains(['\n', '\r'])
}

/// Index of the token after an optional single blank at `i`.
fn skip_blank(ctx: &ClassifyCtx<'_>, i: usize) -> usize {
    if is_blank(ctx, i) {
        i + 1
    } else {
        i
    }
}

/// A plain or decimal amount in token `i`, made negative when `negative`.
fn amount_at(ctx: &ClassifyCtx<'_>, i: usize, negative: bool) -> Option<NumberValue> {
    if ctx.kind(i) != Some(SpanKind::Number) {
        return None;
    }
    match parse_number(ctx.token_text(i))? {
        NumberValue::Integer { value, .. } => Some(NumberValue::Integer { negative, value }),
        NumberValue::Decimal {
            integer,
            fraction_digits,
            ..
        } => Some(NumberValue::Decimal {
            negative,
            integer,
            fraction_digits,
        }),
        NumberValue::Fraction { .. } => None,
    }
}

/// A scale word after the amount that ends at token `end - 1`: returns the scale and new end.
fn scale_after(ctx: &ClassifyCtx<'_>, end: usize) -> (Option<Scale>, usize) {
    let word = skip_blank(ctx, end);
    if ctx.kind(word) == Some(SpanKind::Word) {
        if let Some(scale) = Scale::parse(ctx.token_text(word)) {
            return (Some(scale), word + 1);
        }
    }
    (None, end)
}

/// Token index after an optional trailing `/-`.
fn skip_slash_dash(ctx: &ClassifyCtx<'_>, end: usize) -> usize {
    if ctx.token_text(end) == "/" && is_minus(ctx.token_text(end + 1)) {
        end + 2
    } else {
        end
    }
}

/// Detects a currency amount starting at token `at`.
///
/// # Examples
///
/// ```
/// use yuyin_text::{normalise_to_string, LanguageHint, NormaliseOptions};
/// let opts = NormaliseOptions::new(LanguageHint::EnIn);
/// assert_eq!(
///     normalise_to_string("Rs 12,450/-", &opts).unwrap(),
///     "twelve thousand four hundred fifty rupees"
/// );
/// ```
#[must_use]
pub fn detect(ctx: &ClassifyCtx<'_>, at: usize) -> Option<Detection> {
    let (leading_minus, start) = if is_minus(ctx.token_text(at)) {
        // A minus glued to a word or number on its left is a hyphen, not a sign.
        if at > 0 && matches!(ctx.kind(at - 1), Some(SpanKind::Number | SpanKind::Word)) {
            return None;
        }
        (true, at + 1)
    } else {
        (false, at)
    };
    detect_prefixed(ctx, start, leading_minus).or_else(|| {
        if leading_minus {
            None
        } else {
            detect_suffixed(ctx, start)
        }
    })
}

/// `₹500`, `Rs. 500/-`, `$-5`, and `-₹5`: the marker comes first.
fn detect_prefixed(ctx: &ClassifyCtx<'_>, at: usize, leading_minus: bool) -> Option<Detection> {
    let currency = marker(ctx.token_text(at))?;
    if !matches!(ctx.kind(at), Some(SpanKind::Word | SpanKind::Punctuation)) {
        return None;
    }
    let mut next = at + 1;
    // `Rs.` and `रु.`: the point belongs to the marker when an amount follows.
    if ctx.token_text(next) == "." && ctx.kind(at) == Some(SpanKind::Word) {
        next += 1;
    }
    next = skip_blank(ctx, next);
    let mut negative = leading_minus;
    if !negative && is_minus(ctx.token_text(next)) {
        negative = true;
        next += 1;
    }
    let amount = amount_at(ctx, next, negative)?;
    let (scale, end) = scale_after(ctx, next + 1);
    Some(Detection {
        end: skip_slash_dash(ctx, end),
        value: Semiotic::Money(Money {
            currency,
            amount,
            scale,
        }),
    })
}

/// `500 INR`, `250 Rs`: the marker comes after the amount (and its scale word).
fn detect_suffixed(ctx: &ClassifyCtx<'_>, at: usize) -> Option<Detection> {
    let amount = amount_at(ctx, at, false)?;
    let (scale, after) = scale_after(ctx, at + 1);
    let at_marker = skip_blank(ctx, after);
    let currency = marker(ctx.token_text(at_marker))?;
    if !matches!(
        ctx.kind(at_marker),
        Some(SpanKind::Word | SpanKind::Punctuation)
    ) {
        return None;
    }
    // `5 Rs 10` is more likely a marker for the next amount than for this one.
    if let Some(n) = ctx.next_non_space(at_marker) {
        if ctx.kind(n) == Some(SpanKind::Number) {
            return None;
        }
    }
    Some(Detection {
        end: at_marker + 1,
        value: Semiotic::Money(Money {
            currency,
            amount,
            scale,
        }),
    })
}

#[cfg(test)]
mod tests {
    use super::super::testutil::Fixture;
    use super::*;
    use crate::LanguageHint;

    fn find(text: &str) -> Option<(usize, Detection)> {
        Fixture::new(text, LanguageHint::EnIn).first(detect)
    }

    fn money(text: &str) -> Money {
        match find(text) {
            Some((
                _,
                Detection {
                    value: Semiotic::Money(m),
                    ..
                },
            )) => m,
            other => panic!("no money in {text:?}: {other:?}"),
        }
    }

    fn int(value: u64) -> NumberValue {
        NumberValue::Integer {
            negative: false,
            value,
        }
    }

    #[test]
    fn test_money_detect_all_markers_before_amount() {
        for (text, currency) in [
            ("₹500", Currency::Inr),
            ("Rs 500", Currency::Inr),
            ("Rs. 500", Currency::Inr),
            ("rs.500", Currency::Inr),
            ("INR 500", Currency::Inr),
            ("रु 500", Currency::Inr),
            ("$500", Currency::Usd),
            ("USD 500", Currency::Usd),
        ] {
            let m = money(text);
            assert_eq!((m.currency, m.amount), (currency, int(500)), "{text}");
        }
    }

    #[test]
    fn test_money_detect_marker_after_amount() {
        let m = money("pay 500 INR now");
        assert_eq!((m.currency, m.amount), (Currency::Inr, int(500)));
        assert_eq!(money("250 Rs").amount, int(250));
        assert_eq!(find("5 Rs 10").map(|(at, _)| at), Some(2));
    }

    #[test]
    fn test_money_detect_indian_and_western_grouping_and_devanagari_digits() {
        assert_eq!(money("₹1,25,000").amount, int(125_000));
        assert_eq!(money("$125,000").amount, int(125_000));
        assert_eq!(money("₹१,२५,०००").amount, int(125_000));
    }

    #[test]
    fn test_money_detect_scale_words() {
        let m = money("₹1.5 lakh");
        assert_eq!(m.scale, Some(Scale::Lakh));
        assert_eq!(
            m.amount,
            NumberValue::Decimal {
                negative: false,
                integer: 1,
                fraction_digits: "5".into()
            }
        );
        assert_eq!(money("₹2 Cr").scale, Some(Scale::Crore));
        assert_eq!(money("$3 million").scale, Some(Scale::Million));
        assert_eq!(money("5 lakh INR").scale, Some(Scale::Lakh));
        assert_eq!(Scale::Billion.multiplier(), 1_000_000_000);
        assert_eq!(Scale::Thousand.multiplier(), 1_000);
        assert_eq!(Scale::parse("bn"), Some(Scale::Billion));
        assert_eq!(Scale::parse("k"), Some(Scale::Thousand));
    }

    #[test]
    fn test_money_detect_trailing_slash_dash_is_in_span() {
        let (at, d) = find("Rs 12,450/- only").expect("money");
        assert_eq!(at, 0);
        // Rs, space, 12,450, slash, dash.
        assert_eq!(d.end, 5);
        let (_, d) = find("Rs 12,450/").expect("money");
        assert_eq!(d.end, 3);
    }

    #[test]
    fn test_money_detect_negative_forms() {
        let neg = NumberValue::Integer {
            negative: true,
            value: 5,
        };
        assert_eq!(money("-₹5").amount, neg);
        assert_eq!(money("₹-5").amount, neg);
        assert_eq!(money("\u{2212}$5").amount, neg);
        // A hyphen glued to a word is not a sign.
        assert!(find("pre-₹5").is_some_and(|(at, _)| at != 1));
    }

    #[test]
    fn test_money_detect_rejects_marker_without_amount() {
        for text in ["Rs", "₹ only", "$ and", "USD rates", "Rs. next"] {
            assert!(find(text).is_none(), "{text}");
        }
        assert!(find("1,23,4567 Rs").is_none());
        assert!(find("₹007").is_none());
    }

    #[test]
    fn test_money_detect_does_not_cross_lines() {
        let m = money("₹5\nlakh");
        assert_eq!(m.scale, None);
    }
}
