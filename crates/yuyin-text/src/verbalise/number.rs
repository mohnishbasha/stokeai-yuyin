//! Number words: the shared number API (owner: S1-T03).
//!
//! Every class that speaks a number (money, dates, times, percent, units, ranges) calls these
//! functions, so their signatures are stable.
//!
//! - Hindi: 0 to 99 from [`crate::lexicon::HindiNumbers`] (irregular, a table), then सौ,
//!   हज़ार, लाख, करोड़, अरब, खरब. Hindi always uses Indian grouping, whatever the locale.
//! - English with [`Locale::In`]: hundred, thousand, lakh, crore, arab, kharab. With
//!   [`Locale::Us`]: hundred, thousand, million, billion, trillion, quadrillion, quintillion.
//!   Tens and units are hyphenated ("twenty-five"); there is no "and" inside numbers.
//! - Every `u64` works. 10^15 is "दस हज़ार खरब" (ten thousand kharab) in Hindi and
//!   "one quadrillion" in en-US: Indian grouping has no word above खरब, so the count of
//!   खरब is spoken as an ordinary cardinal.
//! - Decimals read the integer part as a cardinal, then the point word, then each digit.
//! - Fractions: Hindi आधा (1/2), डेढ़ (3/2), ढाई (5/2), otherwise "तीन बटा चार"; English
//!   "one half", "three quarters", "two thirds".
//! - Ordinals: Hindi पहला, दूसरा, तीसरा, चौथा, छठा, then the cardinal plus वाँ (पाँचवाँ,
//!   सातवाँ, पच्चीसवाँ); English first, second, twenty-first.

use super::{VerbaliseCtx, Verbalised};
use crate::classify::number::NumberValue;
use crate::lexicon::Lexicons;
use crate::{Lang, Locale, Semiotic};

/// Smallest value that needs more than the 0 to 99 table.
const HUNDRED: u64 = 100;
/// Values below this are spoken from the 0 to 19 table in English.
const TWENTY: u64 = 20;
/// Size of one tens step in English.
const TEN: u64 = 10;

/// Indian scale values, largest first, with the English word. The Hindi word comes from the
/// lexicon table by value. 100 is last so a three-digit remainder reads "तीन सौ बीस".
const INDIAN_SCALES: [(u64, &str); 6] = [
    (100_000_000_000, "kharab"),
    (1_000_000_000, "arab"),
    (10_000_000, "crore"),
    (100_000, "lakh"),
    (1_000, "thousand"),
    (HUNDRED, "hundred"),
];

/// Western scale values, largest first, with the English word.
const WESTERN_SCALES: [(u64, &str); 6] = [
    (1_000_000_000_000_000_000, "quintillion"),
    (1_000_000_000_000_000, "quadrillion"),
    (1_000_000_000_000, "trillion"),
    (1_000_000_000, "billion"),
    (1_000_000, "million"),
    (1_000, "thousand"),
];

const EN_SMALL: [&str; 20] = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
];
/// English tens words, index 2 is "twenty".
const EN_TENS: [&str; 10] = [
    "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety",
];

/// Hindi irregular ordinals; every other ordinal is the cardinal plus [`HI_ORDINAL_SUFFIX`].
const HI_ORDINALS: [(u64, &str); 5] = [
    (1, "पहला"),
    (2, "दूसरा"),
    (3, "तीसरा"),
    (4, "चौथा"),
    (6, "छठा"),
];
const HI_ORDINAL_SUFFIX: &str = "वाँ";
const HI_POINT: &str = "दशमलव";
const EN_POINT: &str = "point";
const HI_OVER: &str = "बटा";
const EN_OVER: &str = "over";
const HI_HALF: &str = "आधा";
const HI_ONE_AND_HALF: &str = "डेढ़";
const HI_TWO_AND_HALF: &str = "ढाई";

/// The cardinal words for `n`.
///
/// # Examples
///
/// ```
/// use yuyin_text::verbalise::number::cardinal;
/// use yuyin_text::{Lang, Locale};
/// assert_eq!(cardinal(25, Lang::Hi, Locale::In), "पच्चीस");
/// assert_eq!(cardinal(125_000, Lang::Hi, Locale::In), "एक लाख पच्चीस हज़ार");
/// assert_eq!(cardinal(25, Lang::En, Locale::Us), "twenty-five");
/// assert_eq!(cardinal(2_500_000, Lang::En, Locale::Us), "two million five hundred thousand");
/// assert_eq!(cardinal(250_000, Lang::En, Locale::In), "two lakh fifty thousand");
/// ```
#[must_use]
pub fn cardinal(n: u64, lang: Lang, locale: Locale) -> String {
    match (lang, locale) {
        (Lang::En, Locale::Us) => western(n),
        _ => indian(n, lang),
    }
}

fn hindi_word(n: u64) -> &'static str {
    Lexicons::builtin().hindi_numbers.get(n).unwrap_or_default()
}

fn en_small(n: u64) -> &'static str {
    usize::try_from(n)
        .ok()
        .and_then(|i| EN_SMALL.get(i))
        .copied()
        .unwrap_or_default()
}

fn en_below_hundred(n: u64) -> String {
    if n < TWENTY {
        return en_small(n).to_owned();
    }
    let tens = usize::try_from(n / TEN)
        .ok()
        .and_then(|i| EN_TENS.get(i))
        .copied()
        .unwrap_or_default();
    match n % TEN {
        0 => tens.to_owned(),
        unit => format!("{tens}-{}", en_small(unit)),
    }
}

fn small(n: u64, lang: Lang) -> String {
    match lang {
        Lang::Hi => hindi_word(n).to_owned(),
        Lang::En => en_below_hundred(n),
    }
}

/// Indian grouping, used for Hindi always and for English in [`Locale::In`].
fn indian(n: u64, lang: Lang) -> String {
    if n < HUNDRED {
        return small(n, lang);
    }
    let mut parts: Vec<String> = Vec::new();
    let mut rest = n;
    for (scale, en) in INDIAN_SCALES {
        let count = rest / scale;
        if count > 0 {
            let word = match lang {
                Lang::Hi => hindi_word(scale),
                Lang::En => en,
            };
            // Only the largest scale can have a count of 100 or more; it recurses.
            parts.push(format!("{} {word}", indian(count, lang)));
            rest %= scale;
        }
    }
    if rest > 0 {
        parts.push(small(rest, lang));
    }
    parts.join(" ")
}

fn en_below_thousand(n: u64) -> String {
    let hundreds = n / HUNDRED;
    let rest = n % HUNDRED;
    match (hundreds, rest) {
        (0, r) => en_below_hundred(r),
        (h, 0) => format!("{} hundred", en_below_hundred(h)),
        (h, r) => format!("{} hundred {}", en_below_hundred(h), en_below_hundred(r)),
    }
}

/// Western grouping, used for English in [`Locale::Us`].
fn western(n: u64) -> String {
    let mut parts: Vec<String> = Vec::new();
    let mut rest = n;
    for (scale, word) in WESTERN_SCALES {
        let count = rest / scale;
        if count > 0 {
            parts.push(format!("{} {word}", en_below_thousand(count)));
            rest %= scale;
        }
    }
    if rest > 0 || parts.is_empty() {
        parts.push(en_below_thousand(rest));
    }
    parts.join(" ")
}

/// The ordinal words for `n` ("third", "तीसरा").
///
/// # Examples
///
/// ```
/// use yuyin_text::verbalise::number::ordinal;
/// use yuyin_text::{Lang, Locale};
/// assert_eq!(ordinal(3, Lang::Hi, Locale::In), "तीसरा");
/// assert_eq!(ordinal(25, Lang::Hi, Locale::In), "पच्चीसवाँ");
/// assert_eq!(ordinal(3, Lang::En, Locale::In), "third");
/// assert_eq!(ordinal(21, Lang::En, Locale::Us), "twenty-first");
/// ```
#[must_use]
pub fn ordinal(n: u64, lang: Lang, locale: Locale) -> String {
    match lang {
        Lang::Hi => HI_ORDINALS.iter().find(|(v, _)| *v == n).map_or_else(
            || format!("{}{HI_ORDINAL_SUFFIX}", cardinal(n, lang, locale)),
            |(_, word)| (*word).to_owned(),
        ),
        Lang::En => en_ordinal(&cardinal(n, lang, locale)),
    }
}

/// Turns the last word of English cardinal words into its ordinal form.
fn en_ordinal(words: &str) -> String {
    let split = words.rfind([' ', '-']).map_or(0, |i| i + 1);
    let (prefix, last) = words.split_at(split);
    let ord = match last {
        "one" => "first".to_owned(),
        "two" => "second".to_owned(),
        "three" => "third".to_owned(),
        "five" => "fifth".to_owned(),
        "eight" => "eighth".to_owned(),
        "nine" => "ninth".to_owned(),
        "twelve" => "twelfth".to_owned(),
        _ => match last.strip_suffix('y') {
            Some(stem) => format!("{stem}ieth"),
            None => format!("{last}th"),
        },
    };
    format!("{prefix}{ord}")
}

/// A decimal: the integer part as a cardinal, the point word, then each fraction digit.
///
/// Without any digit after the point, only the integer part is read.
///
/// # Examples
///
/// ```
/// use yuyin_text::verbalise::number::decimal;
/// use yuyin_text::{Lang, Locale};
/// assert_eq!(decimal(3, "14", Lang::Hi, Locale::In), "तीन दशमलव एक चार");
/// assert_eq!(decimal(3, "14", Lang::En, Locale::Us), "three point one four");
/// ```
#[must_use]
pub fn decimal(integer: u64, fraction_digits: &str, lang: Lang, locale: Locale) -> String {
    let whole = cardinal(integer, lang, locale);
    let frac = digits(fraction_digits, lang);
    if frac.is_empty() {
        return whole;
    }
    let point = match lang {
        Lang::Hi => HI_POINT,
        Lang::En => EN_POINT,
    };
    format!("{whole} {point} {frac}")
}

/// A fraction ("three quarters", "तीन बटा चार").
///
/// # Examples
///
/// ```
/// use yuyin_text::verbalise::number::fraction;
/// use yuyin_text::{Lang, Locale};
/// assert_eq!(fraction(3, 4, Lang::Hi, Locale::In), "तीन बटा चार");
/// assert_eq!(fraction(1, 2, Lang::Hi, Locale::In), "आधा");
/// assert_eq!(fraction(3, 4, Lang::En, Locale::In), "three quarters");
/// assert_eq!(fraction(1, 2, Lang::En, Locale::Us), "one half");
/// ```
#[must_use]
pub fn fraction(numerator: u64, denominator: u64, lang: Lang, locale: Locale) -> String {
    let top = cardinal(numerator, lang, locale);
    match (lang, numerator, denominator) {
        (Lang::Hi, 1, 2) => HI_HALF.to_owned(),
        (Lang::Hi, 3, 2) => HI_ONE_AND_HALF.to_owned(),
        (Lang::Hi, 5, 2) => HI_TWO_AND_HALF.to_owned(),
        (Lang::Hi, _, d) => format!("{top} {HI_OVER} {}", cardinal(d, lang, locale)),
        (Lang::En, _, d) if d <= 1 => format!("{top} {EN_OVER} {}", cardinal(d, lang, locale)),
        (Lang::En, n, 2) => format!("{top} {}", if n == 1 { "half" } else { "halves" }),
        (Lang::En, n, 4) => format!("{top} {}", if n == 1 { "quarter" } else { "quarters" }),
        (Lang::En, 1, d) => format!("{top} {}", ordinal(d, lang, locale)),
        (Lang::En, _, d) => format!("{top} {}s", ordinal(d, lang, locale)),
    }
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
/// assert_eq!(number(&v, Lang::Hi, Locale::In), "माइनस पाँच");
/// assert_eq!(number(&v, Lang::En, Locale::In), "minus five");
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

/// Verbaliser for `Cardinal` and `Ordinal`, spoken in the context language.
#[must_use]
pub fn verbalise(sem: &Semiotic, ctx: &VerbaliseCtx<'_>) -> Option<Verbalised> {
    let text = match sem {
        Semiotic::Cardinal(value) => number(value, ctx.lang, ctx.locale),
        Semiotic::Ordinal(o) => ordinal(o.value, ctx.lang, ctx.locale),
        _ => return None,
    };
    Some(Verbalised {
        text,
        lang: ctx.lang,
        pace_hint: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::verbalise::{samples, test_ctx};

    const HI: Lang = Lang::Hi;
    const EN: Lang = Lang::En;
    const IN: Locale = Locale::In;
    const US: Locale = Locale::Us;

    #[test]
    fn test_number_hindi_0_to_99_irregular_forms() {
        let expect = [
            (0, "शून्य"),
            (6, "छह"),
            (11, "ग्यारह"),
            (15, "पंद्रह"),
            (19, "उन्नीस"),
            (29, "उनतीस"),
            (39, "उनतालीस"),
            (49, "उनचास"),
            (59, "उनसठ"),
            (69, "उनहत्तर"),
            (79, "उनासी"),
            (89, "नवासी"),
            (99, "निन्यानवे"),
        ];
        for (n, word) in expect {
            assert_eq!(cardinal(n, HI, IN), word, "{n}");
        }
        for n in 0..100 {
            assert!(!cardinal(n, HI, IN).is_empty(), "{n}");
        }
    }

    #[test]
    fn test_number_hindi_indian_grouping() {
        assert_eq!(cardinal(100, HI, IN), "एक सौ");
        assert_eq!(cardinal(999, HI, IN), "नौ सौ निन्यानवे");
        assert_eq!(cardinal(1_000, HI, IN), "एक हज़ार");
        assert_eq!(cardinal(99_999, HI, IN), "निन्यानवे हज़ार नौ सौ निन्यानवे");
        assert_eq!(cardinal(100_000, HI, IN), "एक लाख");
        assert_eq!(cardinal(10_000_000, HI, IN), "एक करोड़");
        assert_eq!(cardinal(1_000_000_000, HI, IN), "एक अरब");
        assert_eq!(cardinal(100_000_000_000, HI, IN), "एक खरब");
        assert_eq!(cardinal(1_000_000_000_000_000, HI, IN), "दस हज़ार खरब");
        // Hindi ignores the Western locale.
        assert_eq!(cardinal(100_000, HI, US), "एक लाख");
    }

    #[test]
    fn test_number_english_indian_and_western() {
        assert_eq!(cardinal(0, EN, IN), "zero");
        assert_eq!(cardinal(0, EN, US), "zero");
        assert_eq!(cardinal(21, EN, IN), "twenty-one");
        assert_eq!(cardinal(40, EN, IN), "forty");
        assert_eq!(cardinal(100, EN, IN), "one hundred");
        assert_eq!(cardinal(105, EN, US), "one hundred five");
        assert_eq!(cardinal(10_000_000, EN, IN), "one crore");
        assert_eq!(cardinal(1_000_000_000, EN, IN), "one arab");
        assert_eq!(cardinal(100_000_000_000, EN, IN), "one kharab");
        assert_eq!(
            cardinal(1_000_000_000_000_000, EN, IN),
            "ten thousand kharab"
        );
        assert_eq!(cardinal(1_000_000_000_000_000, EN, US), "one quadrillion");
        assert_eq!(cardinal(1_000_000_000, EN, US), "one billion");
        assert_eq!(
            cardinal(123_456_789, EN, US),
            "one hundred twenty-three million four hundred fifty-six thousand seven hundred eighty-nine"
        );
        assert_eq!(
            cardinal(u64::MAX, EN, US),
            "eighteen quintillion four hundred forty-six quadrillion seven hundred forty-four trillion \
             seventy-three billion seven hundred nine million five hundred fifty-one thousand six hundred fifteen"
        );
        assert_ne!(cardinal(u64::MAX, HI, IN), "");
        assert_ne!(cardinal(u64::MAX, EN, IN), "");
    }

    #[test]
    fn test_number_ordinals() {
        let hi = [
            (1, "पहला"),
            (2, "दूसरा"),
            (3, "तीसरा"),
            (4, "चौथा"),
            (5, "पाँचवाँ"),
            (6, "छठा"),
            (7, "सातवाँ"),
            (11, "ग्यारहवाँ"),
            (21, "इक्कीसवाँ"),
            (100, "एक सौवाँ"),
        ];
        for (n, w) in hi {
            assert_eq!(ordinal(n, HI, IN), w, "{n}");
        }
        let en = [
            (1, "first"),
            (2, "second"),
            (3, "third"),
            (4, "fourth"),
            (5, "fifth"),
            (8, "eighth"),
            (9, "ninth"),
            (11, "eleventh"),
            (12, "twelfth"),
            (13, "thirteenth"),
            (20, "twentieth"),
            (21, "twenty-first"),
            (100, "one hundredth"),
            (101, "one hundred first"),
        ];
        for (n, w) in en {
            assert_eq!(ordinal(n, EN, US), w, "{n}");
        }
    }

    #[test]
    fn test_number_decimal_and_fraction_words() {
        assert_eq!(decimal(1, "05", EN, IN), "one point zero five");
        assert_eq!(decimal(0, "5", HI, IN), "शून्य दशमलव पाँच");
        assert_eq!(decimal(7, "", EN, IN), "seven");
        assert_eq!(fraction(3, 2, HI, IN), "डेढ़");
        assert_eq!(fraction(5, 2, HI, IN), "ढाई");
        assert_eq!(fraction(2, 3, HI, IN), "दो बटा तीन");
        assert_eq!(fraction(1, 4, EN, IN), "one quarter");
        assert_eq!(fraction(3, 4, EN, US), "three quarters");
        assert_eq!(fraction(3, 2, EN, US), "three halves");
        assert_eq!(fraction(2, 3, EN, US), "two thirds");
        assert_eq!(fraction(1, 5, EN, US), "one fifth");
        assert_eq!(fraction(3, 1, EN, US), "three over one");
        assert_eq!(fraction(3, 0, EN, US), "three over zero");
    }

    #[test]
    fn test_number_value_variants_and_minus() {
        let dec = NumberValue::Decimal {
            negative: true,
            integer: 3,
            fraction_digits: "14".into(),
        };
        assert_eq!(number(&dec, EN, US), "minus three point one four");
        let frac = NumberValue::Fraction {
            negative: true,
            numerator: 1,
            denominator: 2,
        };
        assert_eq!(number(&frac, HI, IN), "माइनस आधा");
        assert_eq!(number(&samples::int(7), EN, US), "seven");
    }

    #[test]
    fn test_digit_words_both_languages() {
        assert_eq!(digits("0123456789", HI), DIGITS_HI.join(" "));
        assert_eq!(digits("0123456789", EN), DIGITS_EN.join(" "));
        assert_eq!(digit(10, EN), "");
        assert_eq!(digits("", HI), "");
    }

    #[test]
    fn test_number_verbalise_speaks_cardinal_and_ordinal_only() {
        for s in samples::all() {
            let spoken = verbalise(&s, &test_ctx(HI, "25"));
            let owned = matches!(s, Semiotic::Cardinal(_) | Semiotic::Ordinal(_));
            assert_eq!(spoken.is_some(), owned, "{s:?}");
        }
        let v = verbalise(&Semiotic::Cardinal(samples::int(25)), &test_ctx(HI, "25"));
        assert_eq!(v.map(|v| v.text), Some("पच्चीस".to_owned()));
        let o = verbalise(
            &Semiotic::Ordinal(crate::classify::number::Ordinal { value: 3 }),
            &test_ctx(EN, "3rd"),
        );
        assert_eq!(o.map(|v| (v.text, v.lang)), Some(("third".to_owned(), EN)));
    }
}
