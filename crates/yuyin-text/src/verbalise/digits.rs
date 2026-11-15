//! Phone and digit-string verbaliser (owner: S1-T06, PRD FR-009).
//!
//! Digits are read one at a time in the context language. Groups are separated by a comma, so
//! the voice pauses between them:
//!
//! - Phone: `+91 98765 43210` reads "plus nine one, nine eight seven six five, four three two
//!   one zero". Indian numbers group 5 and 5, US numbers 3, 3, and 4.
//! - OTP, PIN, tails: one run of digits, no commas. OTPs, PINs, and IDs carry a pace hint of
//!   [`DIGIT_PACE`].
//! - ID-like and long strings: letters are spelled, digits are read one by one, and an all-digit
//!   string is grouped by 4.

use super::acronym::spell;
use super::number::digit;
use super::{VerbaliseCtx, Verbalised};
use crate::classify::digits::{DigitString, DigitStringKind, Phone, PhoneStyle};
use crate::{Lang, Semiotic};

/// Pace multiplier for OTPs, PINs, and IDs read digit by digit (ARCHITECTURE 5.2).
pub const DIGIT_PACE: f32 = 0.85;
/// Group size for all-digit IDs and long strings.
const ID_GROUP: usize = 4;
/// Separator between spoken groups.
const GROUP_SEPARATOR: &str = ", ";

/// The word for `+`.
#[must_use]
pub fn plus_word(lang: Lang) -> &'static str {
    match lang {
        Lang::Hi => "प्लस",
        Lang::En => "plus",
    }
}

/// One character read aloud: a digit as its word, a letter as its name.
fn char_word(c: char, lang: Lang) -> Option<String> {
    if let Some(d) = c.to_digit(10).and_then(|d| u8::try_from(d).ok()) {
        return Some(digit(d, lang).to_owned());
    }
    spell(&c.to_ascii_uppercase().to_string(), lang)
}

/// Every character of `s` read aloud, separated by spaces. Characters with no reading are skipped.
fn chars_spoken(s: &str, lang: Lang) -> String {
    s.chars()
        .filter_map(|c| char_word(c, lang))
        .collect::<Vec<_>>()
        .join(" ")
}

/// `s` split into consecutive groups of the given sizes (the last group takes any remainder).
fn grouped(s: &str, sizes: &[usize], lang: Lang) -> String {
    let chars: Vec<char> = s.chars().collect();
    let mut parts = Vec::new();
    let mut at = 0;
    for &size in sizes {
        let group: String = chars.iter().skip(at).take(size).collect();
        if !group.is_empty() {
            parts.push(chars_spoken(&group, lang));
        }
        at += size;
    }
    let rest: String = chars.iter().skip(at).collect();
    if !rest.is_empty() {
        parts.push(chars_spoken(&rest, lang));
    }
    parts.join(GROUP_SEPARATOR)
}

/// `s` split into groups of `size` characters, each read aloud.
fn chunked(s: &str, size: usize, lang: Lang) -> String {
    let chars: Vec<char> = s.chars().collect();
    chars
        .chunks(size)
        .map(|c| chars_spoken(&c.iter().collect::<String>(), lang))
        .collect::<Vec<_>>()
        .join(GROUP_SEPARATOR)
}

fn phone(p: &Phone, lang: Lang) -> String {
    let sizes: &[usize] = match (p.style, p.digits.chars().count()) {
        (PhoneStyle::Indian, 11) => &[1, 5, 5],
        (PhoneStyle::Indian, _) => &[5, 5],
        (PhoneStyle::Us, _) => &[3, 3, 4],
    };
    let body = grouped(&p.digits, sizes, lang);
    match &p.country_code {
        Some(cc) => format!(
            "{} {}{GROUP_SEPARATOR}{body}",
            plus_word(lang),
            chars_spoken(cc, lang)
        ),
        None => body,
    }
}

fn digit_string(d: &DigitString, lang: Lang) -> (String, Option<f32>) {
    use DigitStringKind::{AccountTail, CardTail, IdLike, Long, Otp, Pin, PostalPin};
    let all_digits = d.digits.chars().all(|c| c.is_ascii_digit());
    match d.kind {
        CardTail | AccountTail => (chars_spoken(&d.digits, lang), None),
        IdLike | Long if all_digits => (chunked(&d.digits, ID_GROUP, lang), Some(DIGIT_PACE)),
        Otp | Pin | PostalPin | IdLike | Long => (chars_spoken(&d.digits, lang), Some(DIGIT_PACE)),
    }
}

/// Verbaliser for `Phone` and `Otp` (every digit-string kind).
///
/// # Examples
///
/// ```
/// use yuyin_text::{normalise_to_string, LanguageHint, NormaliseOptions};
/// let en = normalise_to_string("card ending 4321", &NormaliseOptions::new(LanguageHint::EnIn)).unwrap();
/// assert_eq!(en, "card ending four three two one");
/// let hi = normalise_to_string("कार्ड अंत 4321", &NormaliseOptions::new(LanguageHint::Hi)).unwrap();
/// assert_eq!(hi, "कार्ड अंत चार तीन दो एक");
/// ```
#[must_use]
pub fn verbalise(sem: &Semiotic, ctx: &VerbaliseCtx<'_>) -> Option<Verbalised> {
    let (text, pace_hint) = match sem {
        Semiotic::Phone(p) => (phone(p, ctx.lang), None),
        Semiotic::Otp(d) => digit_string(d, ctx.lang),
        _ => return None,
    };
    Some(Verbalised {
        text,
        lang: ctx.lang,
        pace_hint,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::verbalise::{samples, test_ctx};

    fn say(sem: &Semiotic, lang: Lang) -> Option<Verbalised> {
        verbalise(sem, &test_ctx(lang, "x"))
    }

    fn ds(kind: DigitStringKind, digits: &str) -> Semiotic {
        Semiotic::Otp(DigitString {
            kind,
            digits: digits.to_owned(),
        })
    }

    #[test]
    fn test_digits_verbalise_ignores_other_variants() {
        for s in samples::all() {
            let owned = matches!(s, Semiotic::Phone(_) | Semiotic::Otp(_));
            assert_eq!(say(&s, Lang::En).is_some(), owned, "{s:?}");
        }
    }

    #[test]
    fn test_digits_verbalise_otp_pace_and_language() {
        let v = say(&ds(DigitStringKind::Otp, "4829"), Lang::En).unwrap_or_else(|| panic!("none"));
        assert_eq!(v.text, "four eight two nine");
        assert_eq!(v.pace_hint, Some(DIGIT_PACE));
        let v = say(&ds(DigitStringKind::Otp, "4829"), Lang::Hi).unwrap_or_else(|| panic!("none"));
        assert_eq!(v.text, "चार आठ दो नौ");
        assert_eq!(v.lang, Lang::Hi);
    }

    #[test]
    fn test_digits_verbalise_tails_have_no_pace_hint() {
        for kind in [DigitStringKind::CardTail, DigitStringKind::AccountTail] {
            let v = say(&ds(kind, "4417"), Lang::En).unwrap_or_else(|| panic!("none"));
            assert_eq!(v.pace_hint, None);
        }
    }

    #[test]
    fn test_digits_verbalise_id_letters_and_groups() {
        let v =
            say(&ds(DigitStringKind::IdLike, "AB1"), Lang::En).unwrap_or_else(|| panic!("none"));
        assert_eq!(v.text, "A B one");
        let v =
            say(&ds(DigitStringKind::IdLike, "AB1"), Lang::Hi).unwrap_or_else(|| panic!("none"));
        assert_eq!(v.text, "ए बी एक");
        let v = say(&ds(DigitStringKind::Long, "123456789"), Lang::En)
            .unwrap_or_else(|| panic!("none"));
        assert_eq!(v.text, "one two three four, five six seven eight, nine");
    }

    #[test]
    fn test_digits_verbalise_phone_styles() {
        let p = |cc: Option<&str>, digits: &str, style| {
            Semiotic::Phone(Phone {
                country_code: cc.map(str::to_owned),
                digits: digits.to_owned(),
                style,
            })
        };
        let v = say(&p(Some("91"), "9876543210", PhoneStyle::Indian), Lang::Hi)
            .unwrap_or_else(|| panic!("none"));
        assert_eq!(v.text, "प्लस नौ एक, नौ आठ सात छह पाँच, चार तीन दो एक शून्य");
        let v = say(&p(None, "09876543210", PhoneStyle::Indian), Lang::En)
            .unwrap_or_else(|| panic!("none"));
        assert_eq!(
            v.text,
            "zero, nine eight seven six five, four three two one zero"
        );
        let v =
            say(&p(None, "5550101234", PhoneStyle::Us), Lang::En).unwrap_or_else(|| panic!("none"));
        assert_eq!(v.text, "five five five, zero one zero, one two three four");
        assert_eq!(v.pace_hint, None);
    }

    #[test]
    fn test_digits_verbalise_skips_characters_with_no_reading() {
        let v =
            say(&ds(DigitStringKind::IdLike, "A-1"), Lang::En).unwrap_or_else(|| panic!("none"));
        assert_eq!(v.text, "A one");
    }
}
