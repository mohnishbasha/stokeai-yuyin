//! Number words: the shared number API (owner: S1-T03).
//!
//! Every class that speaks a number (money, dates, times, percent, units, ranges) calls these
//! functions, so their signatures are stable. S1-T03 replaces the stub bodies:
//!
//! - Hindi: 0 to 99 from [`crate::lexicon::HindiNumbers`] (irregular, a table), then सौ,
//!   हज़ार, लाख, करोड़, अरब, खरब. Hindi always uses Indian grouping.
//! - English with [`Locale::In`]: lakh and crore. With [`Locale::Us`]: thousand, million,
//!   billion, trillion. Tens and units are hyphenated ("twenty-five"); no "and" inside numbers.
//! - All values up to `u64::MAX` must work; 10^15 (one खरब, one quadrillion) is in the corpus.
//!
//! Stub behaviour: [`cardinal`], [`ordinal`], [`decimal`], [`fraction`], and [`number`] return
//! digits (they are not spoken yet). [`digit`], [`digits`], and [`minus_word`] are real.

use super::{VerbaliseCtx, Verbalised};
use crate::classify::number::NumberValue;
use crate::{Lang, Locale, Semiotic};

/// The cardinal words for `n`.
///
/// Stub: returns the digits.
///
/// # Examples
///
/// ```
/// use yuyin_text::verbalise::number::cardinal;
/// use yuyin_text::{Lang, Locale};
/// // Target (S1-T03): "पच्चीस" and "twenty-five".
/// assert!(!cardinal(25, Lang::Hi, Locale::In).is_empty());
/// assert!(!cardinal(1_000_000_000_000_000, Lang::En, Locale::Us).is_empty());
/// ```
#[must_use]
pub fn cardinal(n: u64, lang: Lang, locale: Locale) -> String {
    let _ = (lang, locale);
    n.to_string()
}

/// The ordinal words for `n` ("third", "तीसरा").
///
/// Stub: returns the digits.
///
/// # Examples
///
/// ```
/// use yuyin_text::verbalise::number::ordinal;
/// use yuyin_text::{Lang, Locale};
/// // Target (S1-T03): "तीसरा" and "third".
/// assert!(!ordinal(3, Lang::Hi, Locale::In).is_empty());
/// assert!(!ordinal(3, Lang::En, Locale::In).is_empty());
/// ```
#[must_use]
pub fn ordinal(n: u64, lang: Lang, locale: Locale) -> String {
    let _ = (lang, locale);
    n.to_string()
}

/// A decimal: the integer part as a cardinal, the point word, then each fraction digit.
///
/// Stub: returns `integer.fraction_digits`.
///
/// # Examples
///
/// ```
/// use yuyin_text::verbalise::number::decimal;
/// use yuyin_text::{Lang, Locale};
/// // Target (S1-T03): "तीन दशमलव एक चार" and "three point one four".
/// assert!(!decimal(3, "14", Lang::Hi, Locale::In).is_empty());
/// assert!(!decimal(3, "14", Lang::En, Locale::Us).is_empty());
/// ```
#[must_use]
pub fn decimal(integer: u64, fraction_digits: &str, lang: Lang, locale: Locale) -> String {
    let _ = (lang, locale);
    format!("{integer}.{fraction_digits}")
}

/// A fraction ("three quarters", "तीन बटा चार").
///
/// Stub: returns `numerator/denominator`.
///
/// # Examples
///
/// ```
/// use yuyin_text::verbalise::number::fraction;
/// use yuyin_text::{Lang, Locale};
/// assert!(!fraction(3, 4, Lang::Hi, Locale::In).is_empty());
/// assert!(!fraction(3, 4, Lang::En, Locale::In).is_empty());
/// ```
#[must_use]
pub fn fraction(numerator: u64, denominator: u64, lang: Lang, locale: Locale) -> String {
    let _ = (lang, locale);
    format!("{numerator}/{denominator}")
}

/// Any [`NumberValue`], with [`minus_word`] in front when negative.
///
/// # Examples
///
/// ```
/// use yuyin_text::classify::number::NumberValue;
/// use yuyin_text::verbalise::number::number;
/// use yuyin_text::{Lang, Locale};
/// let v = NumberValue::Integer { negative: true, value: 5 };
/// assert!(number(&v, Lang::Hi, Locale::In).starts_with("माइनस "));
/// assert!(number(&v, Lang::En, Locale::In).starts_with("minus "));
/// ```
#[must_use]
pub fn number(value: &NumberValue, lang: Lang, locale: Locale) -> String {
    let (negative, words) = match value {
        NumberValue::Integer { negative, value } => (*negative, cardinal(*value, lang, locale)),
        NumberValue::Decimal {
            negative,
            integer,
            fraction_digits,
        } => (*negative, decimal(*integer, fraction_digits, lang, locale)),
        NumberValue::Fraction {
            negative,
            numerator,
            denominator,
        } => (*negative, fraction(*numerator, *denominator, lang, locale)),
    };
    if negative {
        format!("{} {words}", minus_word(lang))
    } else {
        words
    }
}

const DIGITS_HI: [&str; 10] = [
    "शून्य",
    "एक",
    "दो",
    "तीन",
    "चार",
    "पाँच",
    "छह",
    "सात",
    "आठ",
    "नौ",
];
const DIGITS_EN: [&str; 10] = [
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
];

/// The word for one digit, `0` to `9`. Values above 9 return `""`.
///
/// # Examples
///
/// ```
/// use yuyin_text::verbalise::number::digit;
/// use yuyin_text::Lang;
/// assert_eq!(digit(5, Lang::Hi), "पाँच");
/// assert_eq!(digit(0, Lang::En), "zero");
/// ```
#[must_use]
pub fn digit(d: u8, lang: Lang) -> &'static str {
    let table = match lang {
        Lang::Hi => &DIGITS_HI,
        Lang::En => &DIGITS_EN,
    };
    table.get(usize::from(d)).copied().unwrap_or_default()
}

/// Every ASCII digit in `s` read one by one, separated by spaces. Other characters are skipped.
///
/// # Examples
///
/// ```
/// use yuyin_text::verbalise::number::digits;
/// use yuyin_text::Lang;
/// assert_eq!(digits("405", Lang::Hi), "चार शून्य पाँच");
/// assert_eq!(digits("4-0-5", Lang::En), "four zero five");
/// ```
#[must_use]
pub fn digits(s: &str, lang: Lang) -> String {
    s.chars()
        .filter_map(|c| c.to_digit(10))
        .filter_map(|d| u8::try_from(d).ok())
        .map(|d| digit(d, lang))
        .collect::<Vec<_>>()
        .join(" ")
}

/// The word for a minus sign.
///
/// # Examples
///
/// ```
/// use yuyin_text::verbalise::number::minus_word;
/// use yuyin_text::Lang;
/// assert_eq!(minus_word(Lang::Hi), "माइनस");
/// assert_eq!(minus_word(Lang::En), "minus");
/// ```
#[must_use]
pub fn minus_word(lang: Lang) -> &'static str {
    match lang {
        Lang::Hi => "माइनस",
        Lang::En => "minus",
    }
}

/// Verbaliser for `Cardinal` and `Ordinal`.
///
/// Stub: always `None` (the source text passes through).
#[must_use]
pub fn verbalise(sem: &Semiotic, ctx: &VerbaliseCtx<'_>) -> Option<Verbalised> {
    let _ = (sem, ctx);
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::verbalise::{samples, test_ctx};

    #[test]
    fn test_number_api_stubs_return_digits() {
        assert_eq!(
            cardinal(1_000_000_000_000_000, Lang::Hi, Locale::In),
            "1000000000000000"
        );
        assert_eq!(ordinal(3, Lang::En, Locale::Us), "3");
        assert_eq!(decimal(1, "05", Lang::En, Locale::In), "1.05");
        assert_eq!(fraction(3, 4, Lang::Hi, Locale::In), "3/4");
    }

    #[test]
    fn test_number_value_variants_and_minus() {
        let dec = NumberValue::Decimal {
            negative: false,
            integer: 2,
            fraction_digits: "5".into(),
        };
        assert_eq!(number(&dec, Lang::En, Locale::In), "2.5");
        let frac = NumberValue::Fraction {
            negative: true,
            numerator: 1,
            denominator: 2,
        };
        assert_eq!(number(&frac, Lang::Hi, Locale::In), "माइनस 1/2");
        assert_eq!(number(&samples::int(7), Lang::En, Locale::Us), "7");
    }

    #[test]
    fn test_digit_words_both_languages() {
        assert_eq!(digits("0123456789", Lang::Hi), DIGITS_HI.join(" "));
        assert_eq!(digits("0123456789", Lang::En), DIGITS_EN.join(" "));
        assert_eq!(digit(10, Lang::En), "");
        assert_eq!(digits("", Lang::Hi), "");
    }

    #[test]
    fn test_number_verbalise_stub_returns_none() {
        for s in samples::all() {
            assert_eq!(verbalise(&s, &test_ctx(Lang::Hi, "25")), None);
        }
    }
}
