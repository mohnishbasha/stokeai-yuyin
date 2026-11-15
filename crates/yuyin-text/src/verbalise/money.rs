//! Money verbaliser (owner: S1-T04, PRD FR-007).
//!
//! Speaks the amount in the context language, then the currency word:
//!
//! - Hindi: `₹12,450` is "बारह हज़ार चार सौ पचास रुपये"; one is "एक रुपया". Minor units follow
//!   without a joiner: "दो सौ पचास रुपये पचास पैसे". Dollars are "डॉलर" and "सेंट".
//! - English: "twelve thousand four hundred fifty rupees", "one thousand two hundred
//!   thirty-four dollars and fifty-six cents". One is singular ("one dollar and one cent").
//! - Grouping words (lakh or million) follow the locale through [`crate::verbalise::number`].
//! - A scale word keeps the writer's choice: `₹2 Cr` is "दो करोड़ रुपये" or "two crore rupees"
//!   in any locale. In Hindi, 0.5, 1.5, and 2.5 of a scale use आधा, डेढ़, ढाई ("डेढ़ लाख
//!   रुपये"); in English the digits are read ("one point five lakh rupees").
//! - More than two minor digits (`₹1.234`) are read as a decimal number of major units.
//! - A negative amount starts with the minus word. A trailing `/-` is never spoken.

use super::number::{cardinal, decimal, fraction, minus_word};
use super::{VerbaliseCtx, Verbalised};
use crate::classify::money::{Currency, Money, Scale};
use crate::classify::number::NumberValue;
use crate::{Lang, Locale, Semiotic};

/// Minor units per major unit, as digits (`"00"` to `"99"`).
const MINOR_DIGITS: usize = 2;

/// Singular and plural words of a currency's major and minor unit, per language.
struct Words {
    major: (&'static str, &'static str),
    minor: (&'static str, &'static str),
}

fn words(currency: Currency, lang: Lang) -> Option<Words> {
    Some(match (currency, lang) {
        (Currency::Inr, Lang::Hi) => Words {
            major: ("रुपया", "रुपये"),
            minor: ("पैसा", "पैसे"),
        },
        (Currency::Inr, Lang::En) => Words {
            major: ("rupee", "rupees"),
            minor: ("paisa", "paise"),
        },
        (Currency::Usd, Lang::Hi) => Words {
            major: ("डॉलर", "डॉलर"),
            minor: ("सेंट", "सेंट"),
        },
        (Currency::Usd, Lang::En) => Words {
            major: ("dollar", "dollars"),
            minor: ("cent", "cents"),
        },
        (Currency::Eur | Currency::Gbp, _) => return None,
    })
}

fn pick(pair: (&'static str, &'static str), one: bool) -> &'static str {
    if one {
        pair.0
    } else {
        pair.1
    }
}

fn scale_word(scale: Scale, lang: Lang) -> &'static str {
    match (scale, lang) {
        (Scale::Thousand, Lang::Hi) => "हज़ार",
        (Scale::Lakh, Lang::Hi) => "लाख",
        (Scale::Crore, Lang::Hi) => "करोड़",
        (Scale::Million, Lang::Hi) => "मिलियन",
        (Scale::Billion, Lang::Hi) => "बिलियन",
        (Scale::Thousand, Lang::En) => "thousand",
        (Scale::Lakh, Lang::En) => "lakh",
        (Scale::Crore, Lang::En) => "crore",
        (Scale::Million, Lang::En) => "million",
        (Scale::Billion, Lang::En) => "billion",
    }
}

/// The number in front of a scale word, with the Hindi half forms.
fn mantissa(integer: u64, fraction_digits: &str, lang: Lang, locale: Locale) -> String {
    if lang == Lang::Hi && fraction_digits == "5" {
        match integer {
            0 => return fraction(1, 2, lang, locale),
            1 => return fraction(3, 2, lang, locale),
            2 => return fraction(5, 2, lang, locale),
            _ => {}
        }
    }
    decimal(integer, fraction_digits, lang, locale)
}

/// The spoken form of a currency amount.
///
/// Returns `None` for a currency without words in the language.
///
/// # Examples
///
/// ```
/// use yuyin_text::classify::money::{Currency, Money};
/// use yuyin_text::classify::number::NumberValue;
/// use yuyin_text::verbalise::money::money_words;
/// use yuyin_text::{Lang, Locale};
/// let m = Money {
///     currency: Currency::Usd,
///     amount: NumberValue::Decimal { negative: false, integer: 4, fraction_digits: "25".into() },
///     scale: None,
/// };
/// assert_eq!(
///     money_words(&m, Lang::En, Locale::Us).as_deref(),
///     Some("four dollars and twenty-five cents")
/// );
/// ```
#[must_use]
pub fn money_words(m: &Money, lang: Lang, locale: Locale) -> Option<String> {
    let w = words(m.currency, lang)?;
    let (negative, integer, fraction_digits) = match &m.amount {
        NumberValue::Integer { negative, value } => (*negative, *value, ""),
        NumberValue::Decimal {
            negative,
            integer,
            fraction_digits,
        } => (*negative, *integer, fraction_digits.as_str()),
        NumberValue::Fraction { .. } => return None,
    };
    let body = if let Some(scale) = m.scale {
        format!(
            "{} {} {}",
            mantissa(integer, fraction_digits, lang, locale),
            scale_word(scale, lang),
            w.major.1
        )
    } else if fraction_digits.len() > MINOR_DIGITS {
        format!(
            "{} {}",
            decimal(integer, fraction_digits, lang, locale),
            w.major.1
        )
    } else {
        let padded = format!("{fraction_digits:0<MINOR_DIGITS$}");
        let minor: u64 = padded.parse().unwrap_or(0);
        let mut parts = Vec::new();
        if integer > 0 || minor == 0 {
            parts.push(format!(
                "{} {}",
                cardinal(integer, lang, locale),
                pick(w.major, integer == 1)
            ));
        }
        if minor > 0 {
            parts.push(format!(
                "{} {}",
                cardinal(minor, lang, locale),
                pick(w.minor, minor == 1)
            ));
        }
        let joiner = match lang {
            Lang::En => " and ",
            Lang::Hi => " ",
        };
        parts.join(joiner)
    };
    Some(if negative {
        format!("{} {body}", minus_word(lang))
    } else {
        body
    })
}

/// Verbaliser for `Money`, spoken in the context language.
#[must_use]
pub fn verbalise(sem: &Semiotic, ctx: &VerbaliseCtx<'_>) -> Option<Verbalised> {
    let Semiotic::Money(m) = sem else {
        return None;
    };
    Some(Verbalised {
        text: money_words(m, ctx.lang, ctx.locale)?,
        lang: ctx.lang,
        pace_hint: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::verbalise::{samples, test_ctx};

    fn inr(amount: NumberValue, scale: Option<Scale>) -> Money {
        Money {
            currency: Currency::Inr,
            amount,
            scale,
        }
    }

    fn int(value: u64) -> NumberValue {
        NumberValue::Integer {
            negative: false,
            value,
        }
    }

    fn dec(integer: u64, f: &str) -> NumberValue {
        NumberValue::Decimal {
            negative: false,
            integer,
            fraction_digits: f.into(),
        }
    }

    fn say(m: &Money, lang: Lang, locale: Locale) -> String {
        money_words(m, lang, locale).expect("spoken")
    }

    #[test]
    fn test_money_verbalise_whole_amount_hindi_and_english() {
        let m = inr(int(12_450), None);
        assert_eq!(say(&m, Lang::Hi, Locale::In), "बारह हज़ार चार सौ पचास रुपये");
        assert_eq!(
            say(&m, Lang::En, Locale::In),
            "twelve thousand four hundred fifty rupees"
        );
    }

    #[test]
    fn test_money_verbalise_singular_and_zero() {
        assert_eq!(say(&inr(int(1), None), Lang::Hi, Locale::In), "एक रुपया");
        assert_eq!(say(&inr(int(1), None), Lang::En, Locale::In), "one rupee");
        assert_eq!(say(&inr(int(0), None), Lang::En, Locale::In), "zero rupees");
        assert_eq!(
            say(&inr(dec(1, "01"), None), Lang::En, Locale::In),
            "one rupee and one paisa"
        );
    }

    #[test]
    fn test_money_verbalise_paise_only_and_zero_minor() {
        assert_eq!(
            say(&inr(dec(0, "50"), None), Lang::En, Locale::In),
            "fifty paise"
        );
        assert_eq!(
            say(&inr(dec(0, "50"), None), Lang::Hi, Locale::In),
            "पचास पैसे"
        );
        assert_eq!(
            say(&inr(dec(5, "00"), None), Lang::En, Locale::In),
            "five rupees"
        );
        assert_eq!(
            say(&inr(dec(99, "5"), None), Lang::En, Locale::In),
            "ninety-nine rupees and fifty paise"
        );
    }

    #[test]
    fn test_money_verbalise_many_minor_digits_reads_decimal() {
        assert_eq!(
            say(&inr(dec(1, "234"), None), Lang::En, Locale::In),
            "one point two three four rupees"
        );
    }

    #[test]
    fn test_money_verbalise_scale_forms() {
        assert_eq!(
            say(&inr(dec(1, "5"), Some(Scale::Lakh)), Lang::Hi, Locale::In),
            "डेढ़ लाख रुपये"
        );
        assert_eq!(
            say(&inr(dec(2, "5"), Some(Scale::Crore)), Lang::Hi, Locale::In),
            "ढाई करोड़ रुपये"
        );
        assert_eq!(
            say(&inr(dec(0, "5"), Some(Scale::Lakh)), Lang::Hi, Locale::In),
            "आधा लाख रुपये"
        );
        assert_eq!(
            say(&inr(dec(3, "5"), Some(Scale::Lakh)), Lang::Hi, Locale::In),
            "तीन दशमलव पाँच लाख रुपये"
        );
        assert_eq!(
            say(&inr(int(2), Some(Scale::Crore)), Lang::En, Locale::Us),
            "two crore rupees"
        );
        assert_eq!(
            say(&inr(dec(1, "5"), Some(Scale::Lakh)), Lang::En, Locale::In),
            "one point five lakh rupees"
        );
    }

    #[test]
    fn test_money_verbalise_negative() {
        let m = inr(
            NumberValue::Integer {
                negative: true,
                value: 500,
            },
            None,
        );
        assert_eq!(say(&m, Lang::En, Locale::In), "minus five hundred rupees");
        let s = inr(
            NumberValue::Decimal {
                negative: true,
                integer: 1,
                fraction_digits: "5".into(),
            },
            Some(Scale::Lakh),
        );
        assert_eq!(say(&s, Lang::Hi, Locale::In), "माइनस डेढ़ लाख रुपये");
        assert_eq!(
            say(&s, Lang::En, Locale::In),
            "minus one point five lakh rupees"
        );
    }

    #[test]
    fn test_money_verbalise_dollars_and_cents() {
        let m = Money {
            currency: Currency::Usd,
            amount: dec(1_234, "56"),
            scale: None,
        };
        assert_eq!(
            say(&m, Lang::En, Locale::Us),
            "one thousand two hundred thirty-four dollars and fifty-six cents"
        );
        assert_eq!(
            say(&m, Lang::Hi, Locale::In),
            "एक हज़ार दो सौ चौंतीस डॉलर छप्पन सेंट"
        );
    }

    #[test]
    fn test_money_verbalise_unspoken_currency_and_other_variants_are_none() {
        let eur = Money {
            currency: Currency::Eur,
            amount: int(5),
            scale: None,
        };
        assert_eq!(money_words(&eur, Lang::En, Locale::In), None);
        let frac = inr(
            NumberValue::Fraction {
                negative: false,
                numerator: 1,
                denominator: 2,
            },
            None,
        );
        assert_eq!(money_words(&frac, Lang::En, Locale::In), None);
        let ctx = test_ctx(Lang::En, "5");
        for s in samples::all() {
            if !matches!(s, Semiotic::Money(_)) {
                assert_eq!(verbalise(&s, &ctx), None);
            }
        }
        assert_eq!(verbalise(&Semiotic::Money(eur), &ctx), None);
    }

    #[test]
    fn test_money_verbalise_sample_speaks_in_context_language() {
        for s in samples::all() {
            if matches!(s, Semiotic::Money(_)) {
                let hi = verbalise(&s, &test_ctx(Lang::Hi, "4500")).expect("hi");
                assert_eq!(hi.text, "चार हज़ार पाँच सौ रुपये");
                assert_eq!(hi.lang, Lang::Hi);
                let en = verbalise(&s, &test_ctx(Lang::En, "4500")).expect("en");
                assert_eq!(en.text, "four thousand five hundred rupees");
            }
        }
    }
}
