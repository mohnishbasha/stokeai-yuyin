//! Number detection: cardinal, ordinal, decimal, negative, fraction (owner: S1-T03).
//!
//! Detected shapes (PRD FR-006):
//!
//! - Integers, plain (`1250000`) or grouped the Indian way (`12,50,000`) or the Western way
//!   (`1,250,000`). Both parse to the same value. ASCII and Devanagari digits are accepted.
//! - Decimals (`3.14`, `1,250.50`). The digits after the point are kept as written.
//! - Negatives: a `-` (or the minus sign `\u{2212}`) directly before a number, not glued to a
//!   word or number on its left (so `10-15` and `COVID-19` are not negative numbers).
//! - Fractions: `3/4`, with a non-zero denominator. A chain such as `5/12/2026` is a date, not
//!   a fraction, and is left alone.
//! - Ordinals: `3rd`, `21st`, `11th`.
//!
//! Not detected, so the span passes through for another class or the engine: integers with a
//! leading zero (`007`, read digit by digit by the digits class), badly grouped numbers
//! (`1,23,4567`), and numbers longer than [`MAX_NUMBER_DIGITS`] digits.
//!
//! Spoken forms are in [`crate::verbalise::number`]. Golden rows: `golden/numbers.tsv`
//! (classes `cardinal`, `ordinal`).

use super::{ClassifyCtx, Detection};
use crate::{Semiotic, SpanKind};

/// Longest digit string read as a number; longer ones are read digit by digit (PRD FR-006).
/// 18 digits always fit in a `u64`.
pub const MAX_NUMBER_DIGITS: usize = 18;

/// Digits in a full group of a Western number (`125,000`) and in the last Indian group.
const WESTERN_GROUP: usize = 3;
/// Digits in a middle group of an Indian number (`1,25,000`).
const INDIAN_GROUP: usize = 2;
/// Longest leading group of an Indian-grouped number (`12,25,000`).
const INDIAN_FIRST_GROUP_MAX: usize = 2;
/// Code point of Devanagari digit zero.
const DEVANAGARI_ZERO: u32 = 0x0966;
/// Code point of Devanagari digit nine.
const DEVANAGARI_NINE: u32 = 0x096F;
/// Radix of the written digits.
const RADIX: u32 = 10;

/// A parsed cardinal number.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum NumberValue {
    /// Whole number, for example `1,25,000` or `-5`.
    Integer {
        /// True for a leading minus sign.
        negative: bool,
        /// Absolute value. `u64` covers 10^15 (खरब) and beyond.
        value: u64,
    },
    /// Decimal number, for example `3.14`.
    Decimal {
        /// True for a leading minus sign.
        negative: bool,
        /// The part before the decimal point.
        integer: u64,
        /// The digits after the decimal point, as written (`"05"` in `1.05`). Read digit by digit.
        fraction_digits: String,
    },
    /// Fraction, for example `3/4`.
    Fraction {
        /// True for a leading minus sign.
        negative: bool,
        /// Top part.
        numerator: u64,
        /// Bottom part, never zero.
        denominator: u64,
    },
}

/// A parsed ordinal, for example `3rd` or `21st`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Ordinal {
    /// The number, `3` for `3rd`.
    pub value: u64,
}

/// Detects a cardinal or ordinal number starting at token `at`.
///
/// # Examples
///
/// ```
/// use yuyin_text::classify::number::{parse_number, NumberValue};
/// // Hindi context and English context read the same digits.
/// assert_eq!(
///     parse_number("1,25,000"),
///     Some(NumberValue::Integer { negative: false, value: 125_000 })
/// );
/// assert_eq!(
///     parse_number("125,000"),
///     Some(NumberValue::Integer { negative: false, value: 125_000 })
/// );
/// assert_eq!(parse_number("1,23,4567"), None);
/// ```
#[must_use]
pub fn detect(ctx: &ClassifyCtx<'_>, at: usize) -> Option<Detection> {
    match ctx.kind(at)? {
        SpanKind::Punctuation => detect_negative(ctx, at),
        SpanKind::Number | SpanKind::Word => detect_unsigned(ctx, at),
        SpanKind::Space => None,
    }
}

/// Parses a plain or grouped number with an optional decimal part: `42`, `1,25,000`, `3.14`.
///
/// Returns `None` for anything else, including a leading zero (`007`) and more than
/// [`MAX_NUMBER_DIGITS`] digits.
#[must_use]
pub fn parse_number(s: &str) -> Option<NumberValue> {
    let ascii: String = s.chars().map(to_ascii).collect::<Option<_>>()?;
    let (int_part, frac_part) = match ascii.split_once('.') {
        Some((i, f)) => (i, Some(f)),
        None => (ascii.as_str(), None),
    };
    let integer = parse_grouped(int_part)?;
    match frac_part {
        None => Some(NumberValue::Integer {
            negative: false,
            value: integer,
        }),
        Some(f) if !f.is_empty() && f.chars().all(|c| c.is_ascii_digit()) => {
            Some(NumberValue::Decimal {
                negative: false,
                integer,
                fraction_digits: f.to_owned(),
            })
        }
        Some(_) => None,
    }
}

/// Parses an ordinal such as `3rd`, `21st`, `11th`.
#[must_use]
pub fn parse_ordinal(s: &str) -> Option<Ordinal> {
    let split = s.find(|c: char| !c.is_ascii_digit())?;
    let (digits, suffix) = s.split_at(split);
    let suffix = suffix.to_ascii_lowercase();
    if !matches!(suffix.as_str(), "st" | "nd" | "rd" | "th") {
        return None;
    }
    parse_grouped(digits).map(|value| Ordinal { value })
}

/// ASCII form of a digit, a comma, or a point; Devanagari digits are mapped to ASCII.
fn to_ascii(c: char) -> Option<char> {
    match c {
        '0'..='9' | ',' | '.' => Some(c),
        _ => {
            let code = u32::from(c);
            if (DEVANAGARI_ZERO..=DEVANAGARI_NINE).contains(&code) {
                char::from_digit(code - DEVANAGARI_ZERO, RADIX)
            } else {
                None
            }
        }
    }
}

/// Parses ASCII digits with optional Indian or Western commas into a value.
fn parse_grouped(s: &str) -> Option<u64> {
    let groups: Vec<&str> = s.split(',').collect();
    let (first, rest) = groups.split_first()?;
    if first.is_empty() || !groups.iter().all(|g| g.chars().all(|c| c.is_ascii_digit())) {
        return None;
    }
    if !rest.is_empty() && !valid_grouping(first, rest) {
        return None;
    }
    // A leading zero means an identifier or code, not a quantity.
    if first.starts_with('0') && (first.len() > 1 || !rest.is_empty()) {
        return None;
    }
    let all: String = groups.concat();
    if all.len() > MAX_NUMBER_DIGITS {
        return None;
    }
    all.parse().ok()
}

/// True if the groups after `first` follow the Indian (2, 2, ..., 3) or Western (3, 3, ...) rule.
fn valid_grouping(first: &str, rest: &[&str]) -> bool {
    let Some((last, middle)) = rest.split_last() else {
        return false;
    };
    let indian = first.len() <= INDIAN_FIRST_GROUP_MAX
        && middle.iter().all(|g| g.len() == INDIAN_GROUP)
        && last.len() == WESTERN_GROUP;
    let western = first.len() <= WESTERN_GROUP && rest.iter().all(|g| g.len() == WESTERN_GROUP);
    indian || western
}

fn is_slash(ctx: &ClassifyCtx<'_>, i: usize) -> bool {
    ctx.token_text(i) == "/"
}

/// A `-` or minus sign before a number, with nothing alphanumeric glued on its left.
fn detect_negative(ctx: &ClassifyCtx<'_>, at: usize) -> Option<Detection> {
    if !matches!(ctx.token_text(at), "-" | "\u{2212}") {
        return None;
    }
    if at > 0 && matches!(ctx.kind(at - 1), Some(SpanKind::Number | SpanKind::Word)) {
        return None;
    }
    let inner = detect_unsigned(ctx, at + 1)?;
    let value = match inner.value {
        Semiotic::Cardinal(NumberValue::Integer { value, .. }) => NumberValue::Integer {
            negative: true,
            value,
        },
        Semiotic::Cardinal(NumberValue::Decimal {
            integer,
            fraction_digits,
            ..
        }) => NumberValue::Decimal {
            negative: true,
            integer,
            fraction_digits,
        },
        Semiotic::Cardinal(NumberValue::Fraction {
            numerator,
            denominator,
            ..
        }) => NumberValue::Fraction {
            negative: true,
            numerator,
            denominator,
        },
        _ => return None,
    };
    Some(Detection {
        end: inner.end,
        value: Semiotic::Cardinal(value),
    })
}

/// A number, fraction, or ordinal starting at token `at`.
fn detect_unsigned(ctx: &ClassifyCtx<'_>, at: usize) -> Option<Detection> {
    let text = ctx.token_text(at);
    if ctx.kind(at) == Some(SpanKind::Word) {
        let ord = parse_ordinal(text)?;
        return Some(Detection {
            end: at + 1,
            value: Semiotic::Ordinal(ord),
        });
    }
    // `5/12/2026` is a date: leave every part of a slash chain alone.
    if at >= 2 && is_slash(ctx, at - 1) && ctx.kind(at - 2) == Some(SpanKind::Number) {
        return None;
    }
    let value = parse_number(text)?;
    if let NumberValue::Integer {
        value: numerator, ..
    } = value
    {
        if is_slash(ctx, at + 1) && ctx.kind(at + 2) == Some(SpanKind::Number) {
            if is_slash(ctx, at + 3) && ctx.kind(at + 4) == Some(SpanKind::Number) {
                return None;
            }
            let denominator = match parse_number(ctx.token_text(at + 2)) {
                Some(NumberValue::Integer { value, .. }) if value > 0 => value,
                _ => return None,
            };
            return Some(Detection {
                end: at + 3,
                value: Semiotic::Cardinal(NumberValue::Fraction {
                    negative: false,
                    numerator,
                    denominator,
                }),
            });
        }
    }
    Some(Detection {
        end: at + 1,
        value: Semiotic::Cardinal(value),
    })
}

#[cfg(test)]
mod tests {
    use super::super::testutil::Fixture;
    use super::*;
    use crate::LanguageHint;

    fn first_value(text: &str, hint: LanguageHint) -> Option<(usize, Detection)> {
        Fixture::new(text, hint).first(detect)
    }

    fn int(value: u64) -> Semiotic {
        Semiotic::Cardinal(NumberValue::Integer {
            negative: false,
            value,
        })
    }

    #[test]
    fn test_number_detect_indian_and_western_grouping_same_value() {
        for (text, hint) in [
            ("कुल 1,25,000 और", LanguageHint::Hi),
            ("total 125,000 and", LanguageHint::EnUs),
            ("kul 1,25,000 hai", LanguageHint::Hinglish),
        ] {
            let (_, d) = first_value(text, hint).expect("number found");
            assert_eq!(d.value, int(125_000), "{text}");
        }
    }

    #[test]
    fn test_number_detect_decimal_negative_fraction_ordinal() {
        let (_, d) = first_value("pi is 3.14 ok", LanguageHint::EnIn).expect("decimal");
        assert_eq!(
            d.value,
            Semiotic::Cardinal(NumberValue::Decimal {
                negative: false,
                integer: 3,
                fraction_digits: "14".into()
            })
        );
        let (at, d) = first_value("it is -5 today", LanguageHint::EnIn).expect("negative");
        assert_eq!((at, d.end), (4, 6));
        assert_eq!(
            d.value,
            Semiotic::Cardinal(NumberValue::Integer {
                negative: true,
                value: 5
            })
        );
        let (_, d) = first_value("temp \u{2212}2.5 now", LanguageHint::EnIn).expect("minus sign");
        assert!(matches!(
            d.value,
            Semiotic::Cardinal(NumberValue::Decimal { negative: true, .. })
        ));
        let (_, d) = first_value("-3/4 cup", LanguageHint::EnUs).expect("neg fraction");
        assert_eq!(
            d.value,
            Semiotic::Cardinal(NumberValue::Fraction {
                negative: true,
                numerator: 3,
                denominator: 4
            })
        );
        let (_, d) = first_value("the 3rd floor", LanguageHint::EnIn).expect("ordinal");
        assert_eq!(d.value, Semiotic::Ordinal(Ordinal { value: 3 }));
    }

    #[test]
    fn test_number_detect_devanagari_digits() {
        let (_, d) = first_value("कुल १,२५,००० रुपये", LanguageHint::Hi).expect("number");
        assert_eq!(d.value, int(125_000));
    }

    #[test]
    fn test_number_detect_rejects_non_numbers() {
        for text in [
            "code 007 here",
            "1,23,4567 x",
            "x 0,500",
            "a 1234567890123456789 b",
            "a 1.2.3 b",
            "5/12/2026",
            "3/0 now",
            "see 3x",
        ] {
            let f = Fixture::new(text, LanguageHint::EnIn);
            let ctx = f.ctx();
            let found: Vec<_> = (0..ctx.len()).filter_map(|i| detect(&ctx, i)).collect();
            assert!(found.is_empty(), "{text}: {found:?}");
        }
    }

    #[test]
    fn test_number_detect_minus_glued_to_word_or_number_is_not_negative() {
        let f = Fixture::new("10-15 and COVID-19", LanguageHint::EnIn);
        let ctx = f.ctx();
        let dashes: Vec<usize> = (0..ctx.len())
            .filter(|&i| ctx.token_text(i) == "-")
            .collect();
        assert_eq!(dashes.len(), 2);
        for i in dashes {
            assert_eq!(detect(&ctx, i), None);
        }
    }

    #[test]
    fn test_number_detect_lone_dash_and_spaces_and_end_of_input() {
        let f = Fixture::new("a - b -", LanguageHint::EnIn);
        let ctx = f.ctx();
        assert!((0..ctx.len()).all(|i| detect(&ctx, i).is_none()));
        assert_eq!(detect(&ctx, 99), None);
        let f = Fixture::new("x -", LanguageHint::EnIn);
        assert_eq!(f.first(detect), None);
        let f = Fixture::new("x -y", LanguageHint::EnIn);
        assert_eq!(f.first(detect), None);
    }

    #[test]
    fn test_number_detect_ordinal_suffix_rules() {
        assert_eq!(parse_ordinal("21ST"), Some(Ordinal { value: 21 }));
        assert_eq!(parse_ordinal("11th"), Some(Ordinal { value: 11 }));
        assert_eq!(parse_ordinal("3x"), None);
        assert_eq!(parse_ordinal("rd"), None);
        assert_eq!(parse_ordinal("1,000th"), None);
        assert_eq!(parse_ordinal("123"), None);
    }

    #[test]
    fn test_number_parse_number_edge_cases() {
        assert_eq!(
            parse_number("0"),
            Some(NumberValue::Integer {
                negative: false,
                value: 0
            })
        );
        assert_eq!(
            parse_number("0.5").map(|v| matches!(v, NumberValue::Decimal { .. })),
            Some(true)
        );
        assert_eq!(parse_number(""), None);
        assert_eq!(parse_number(",5"), None);
        assert_eq!(parse_number("1,"), None);
        assert_eq!(parse_number("12,34"), None);
        assert_eq!(parse_number("1,234,56"), None);
        assert_eq!(
            parse_number("1,23,456"),
            Some(NumberValue::Integer {
                negative: false,
                value: 123_456
            })
        );
        assert_eq!(
            parse_number("12,34,56,789"),
            Some(NumberValue::Integer {
                negative: false,
                value: 123_456_789
            })
        );
        assert_eq!(
            parse_number("123,456,789"),
            Some(NumberValue::Integer {
                negative: false,
                value: 123_456_789
            })
        );
        assert_eq!(parse_number("1.5x"), None);
        assert_eq!(parse_number("abc"), None);
        assert!(parse_number("999999999999999999").is_some());
        assert_eq!(parse_number("1,2"), None);
    }
}
