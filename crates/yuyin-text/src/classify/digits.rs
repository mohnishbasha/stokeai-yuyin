//! Phone numbers and digit-by-digit strings (owner: S1-T06).
//!
//! Spoken forms are in [`crate::verbalise::digits`]. Golden rows: `golden/digits.tsv` (classes
//! `phone`, `otp`, `tail`, `pin`, `id`, `long`, `neg`). Fixtures use fictitious numbers only
//! (AGENTS.md).
//!
//! Rules (ARCHITECTURE 5.2, PRD FR-009), tried in this order at each token:
//!
//! 1. Phone: Indian mobile (`98765 43210`, `+91 98765 43210`, `098765 43210`) and US
//!    (`(555) 010-1234`, `+1 555 010 1234`).
//! 2. Masked tail: `XXXX1234`, `**** 1234`, `XXXX-XXXX-1234`.
//! 3. ID-like: PAN-like `ABCDE1234F`, Aadhaar-like `2345 6789 0123`, 16-digit card groups.
//! 4. Trigger digits: 4 to 8 digits near OTP, code, PIN, or verification words; 3 to 6 digits
//!    after "ending"; 6 to 18 digits after account, card, or reference words.
//!
//! Plain numbers (quantities, years) have no trigger, so they fall through to the number class.

use super::{ClassifyCtx, Detection, Semiotic};
use crate::SpanKind;

/// A parsed phone number.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Phone {
    /// Country code digits without `+`, for example `"91"`, if written.
    pub country_code: Option<String>,
    /// The remaining digits, without separators. An Indian trunk `0` stays as the first digit.
    pub digits: String,
    /// The grouping convention the number was written in.
    pub style: PhoneStyle,
}

/// How a phone number is grouped when read aloud.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum PhoneStyle {
    /// Indian mobile: groups of 5 and 5 (a trunk `0` is read first).
    Indian,
    /// US: groups of 3, 3, and 4.
    Us,
}

/// What kind of digit string this is. The verbaliser may group digits by kind.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum DigitStringKind {
    /// One-time password.
    Otp,
    /// PIN.
    Pin,
    /// Indian postal PIN code.
    PostalPin,
    /// Last digits of a card.
    CardTail,
    /// Last digits of an account.
    AccountTail,
    /// PAN-like or Aadhaar-like identifier.
    IdLike,
    /// Any other long digit string read digit by digit.
    Long,
}

/// A string read digit by digit.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DigitString {
    /// The kind, from trigger words around the span.
    pub kind: DigitStringKind,
    /// The characters to read, without separators. May contain letters for ID-like strings.
    pub digits: String,
}

/// Fewest digits of an OTP or PIN.
pub const OTP_MIN_DIGITS: usize = 4;
/// Most digits of an OTP or PIN.
pub const OTP_MAX_DIGITS: usize = 8;
/// Digits in an Indian postal PIN code.
const POSTAL_PIN_DIGITS: usize = 6;
/// Digits in an Aadhaar-like number.
const AADHAAR_DIGITS: usize = 12;
/// Fewest and most digits of a card or account tail.
const TAIL_DIGITS: std::ops::RangeInclusive<usize> = 3..=6;
/// Fewest and most digits of a long reference, account, or card number.
const LONG_DIGITS: std::ops::RangeInclusive<usize> = 6..=18;
/// Fewest mask characters before a tail that is not glued to its mask (`**** 1234`).
const MIN_SPACED_MASK: usize = 4;
/// Fewest mask characters before a tail that is glued to its mask (`XX1234`).
const MIN_GLUED_MASK: usize = 2;
/// How many tokens before a number a trigger word may sit.
const LOOKBACK: usize = 3;
/// Most digit groups collected for one number.
const MAX_GROUPS: usize = 5;

const OTP_WORDS: &[&str] = &[
    "otp",
    "code",
    "passcode",
    "verification",
    "ओटीपी",
    "कोड",
    "पासकोड",
];
const PIN_WORDS: &[&str] = &["pin", "pincode", "पिन", "पिनकोड"];
const TAIL_WORDS: &[&str] = &["ending", "ends", "अंत", "अंतिम", "आखिरी", "समाप्त", "खत्म"];
const ACCOUNT_WORDS: &[&str] = &["account", "acct", "खाता", "खाते", "अकाउंट"];
const CARD_WORDS: &[&str] = &["card", "कार्ड"];
const LONG_WORDS: &[&str] = &[
    "account",
    "acct",
    "card",
    "reference",
    "ref",
    "utr",
    "txn",
    "transaction",
    "खाता",
    "खाते",
    "अकाउंट",
    "कार्ड",
    "संदर्भ",
];
const AADHAAR_WORDS: &[&str] = &["aadhaar", "aadhar", "uid", "आधार"];
/// Words that may sit between a number and a trigger that follows it ("4829 is your OTP").
const FILLER_WORDS: &[&str] = &[
    "is",
    "your",
    "the",
    "a",
    "hai",
    "है",
    "आपका",
    "आपकी",
    "आपके",
    "aapka",
    "aapki",
    "aapke",
    "ka",
    "ki",
    "ke",
];

/// The digit value of `c`, accepting ASCII and Devanagari digits.
fn digit_value(c: char) -> Option<char> {
    match c {
        '0'..='9' => Some(c),
        '\u{0966}'..='\u{096F}' => char::from_digit(u32::from(c) - 0x0966, 10),
        _ => None,
    }
}

/// `s` as ASCII digits, or `None` if it is empty or has any other character.
fn ascii_digits(s: &str) -> Option<String> {
    let out: String = s.chars().map(digit_value).collect::<Option<_>>()?;
    (!out.is_empty()).then_some(out)
}

/// The ASCII digits of token `i` if it is a number token made only of digits.
fn number_digits(ctx: &ClassifyCtx<'_>, i: usize) -> Option<String> {
    if ctx.kind(i) == Some(SpanKind::Number) {
        ascii_digits(ctx.token_text(i))
    } else {
        None
    }
}

fn is_sentence_end(text: &str) -> bool {
    matches!(text, "." | "!" | "?" | "।" | ";")
}

fn lower(ctx: &ClassifyCtx<'_>, i: usize) -> String {
    ctx.token_text(i).to_lowercase()
}

/// True if the token right before `at` touches the token at `at` and is a letter, digit, or
/// number joiner, which means `at` is the middle of a larger token or number.
fn glued_before(ctx: &ClassifyCtx<'_>, at: usize) -> bool {
    let Some(prev) = at.checked_sub(1) else {
        return false;
    };
    match ctx.kind(prev) {
        Some(SpanKind::Number | SpanKind::Word) => true,
        Some(SpanKind::Punctuation) => matches!(ctx.token_text(prev), "." | ","),
        _ => false,
    }
}

/// True if the token at `end` continues the number with a decimal part or a thousands group.
fn continues_after(ctx: &ClassifyCtx<'_>, end: usize) -> bool {
    matches!(ctx.token_text(end), "." | ",") && ctx.kind(end + 1) == Some(SpanKind::Number)
        || ctx.kind(end) == Some(SpanKind::Word)
        || ctx.kind(end) == Some(SpanKind::Number)
}

/// Words before `at` (up to `max` non-space tokens), nearest first. Stops at a sentence end or
/// at another number.
fn words_before(ctx: &ClassifyCtx<'_>, at: usize, max: usize) -> Vec<String> {
    let mut out = Vec::new();
    let mut i = at;
    while out.len() < max {
        let Some(p) = ctx.prev_non_space(i) else {
            break;
        };
        match ctx.kind(p) {
            Some(SpanKind::Number) => break,
            Some(SpanKind::Punctuation) if is_sentence_end(ctx.token_text(p)) => break,
            Some(SpanKind::Word) => out.push(lower(ctx, p)),
            _ => {}
        }
        i = p;
    }
    out
}

/// True if a trigger word follows the span ending at `end`, allowing filler words between.
fn trigger_after(ctx: &ClassifyCtx<'_>, end: usize, words: &[&[&str]]) -> bool {
    let mut last = end.saturating_sub(1);
    for _ in 0..LOOKBACK {
        let Some(n) = ctx.next_non_space(last) else {
            return false;
        };
        match ctx.kind(n) {
            Some(SpanKind::Word) => {
                let w = lower(ctx, n);
                if words.iter().any(|set| set.contains(&w.as_str())) {
                    return true;
                }
                if !FILLER_WORDS.contains(&w.as_str()) {
                    return false;
                }
            }
            _ => return false,
        }
        last = n;
    }
    false
}

fn any_in(found: &[String], set: &[&str]) -> bool {
    found.iter().any(|w| set.contains(&w.as_str()))
}

/// Collects digit groups from token `start`: number tokens separated by spaces, hyphens,
/// parentheses, or a lone point. Returns each group with the index one past its token.
fn collect_groups(ctx: &ClassifyCtx<'_>, start: usize) -> Vec<(String, usize)> {
    let mut groups = Vec::new();
    let mut i = start;
    while groups.len() < MAX_GROUPS {
        let Some(d) = number_digits(ctx, i) else {
            break;
        };
        groups.push((d, i + 1));
        // Skip a short run of separators, then expect another number.
        let mut j = i + 1;
        let mut seps = 0;
        while seps < 3 {
            let t = ctx.token_text(j);
            let sep = match ctx.kind(j) {
                Some(SpanKind::Space) => true,
                Some(SpanKind::Punctuation) => matches!(t, "-" | "(" | ")" | "."),
                _ => false,
            };
            if !sep {
                break;
            }
            // A point is a separator only when it sits directly between two numbers.
            if t == "." && ctx.kind(j + 1) != Some(SpanKind::Number) {
                break;
            }
            j += 1;
            seps += 1;
        }
        if seps == 0 || ctx.kind(j) != Some(SpanKind::Number) {
            break;
        }
        i = j;
    }
    groups
}

fn lens(groups: &[(String, usize)]) -> Vec<usize> {
    groups.iter().map(|(d, _)| d.len()).collect()
}

fn joined(groups: &[(String, usize)]) -> String {
    groups.iter().map(|(d, _)| d.as_str()).collect()
}

fn is_indian_mobile_start(c: Option<char>) -> bool {
    matches!(c, Some('6'..='9'))
}

fn phone_detection(cc: Option<&str>, digits: String, style: PhoneStyle, end: usize) -> Detection {
    Detection {
        end,
        value: Semiotic::Phone(Phone {
            country_code: cc.map(str::to_owned),
            digits,
            style,
        }),
    }
}

/// True if `at` follows an unsupported country code, as in `+44 98765 43210`.
fn after_foreign_country_code(ctx: &ClassifyCtx<'_>, at: usize) -> bool {
    ctx.prev_non_space(at).is_some_and(|p| {
        ctx.kind(p) == Some(SpanKind::Number)
            && p.checked_sub(1).is_some_and(|q| ctx.token_text(q) == "+")
    })
}

/// The digits of a US number written with points, `555.010.1234`, which tokenises as one number.
fn dotted_us_digits(text: &str) -> Option<String> {
    let parts: Vec<&str> = text.split('.').collect();
    let ok = parts.len() == 3
        && parts
            .iter()
            .zip([3, 3, 4])
            .all(|(p, n)| p.len() == n && p.chars().all(|c| c.is_ascii_digit()));
    ok.then(|| parts.concat())
}

/// Phone numbers: `+91 98765 43210`, `98765-43210`, `098765 43210`, `(555) 010-1234`.
fn detect_phone(ctx: &ClassifyCtx<'_>, at: usize) -> Option<Detection> {
    if glued_before(ctx, at) || after_foreign_country_code(ctx, at) {
        return None;
    }
    let text = ctx.token_text(at);
    if let Some(d) = dotted_us_digits(text) {
        let end = at + 1;
        return (!continues_after(ctx, end)).then(|| phone_detection(None, d, PhoneStyle::Us, end));
    }
    let plus = text == "+" && ctx.kind(at + 1) == Some(SpanKind::Number);
    let paren = text == "(" && ctx.kind(at + 1) == Some(SpanKind::Number);
    let start = if plus || paren { at + 1 } else { at };
    let groups = collect_groups(ctx, start);
    let end = groups.last()?.1;
    if continues_after(ctx, end) {
        return None;
    }
    let all = lens(&groups);
    let first = groups.first().map(|(d, _)| d.as_str())?;
    let rest =
        |from: usize| -> Vec<(String, usize)> { groups.iter().skip(from).cloned().collect() };
    if plus {
        return detect_plus_phone(first, &all, &rest(1), end);
    }
    let digits = joined(&groups);
    let formatted = paren || ctx.text_between(start, end).contains(['-', '.', '(', ')']);
    match all.as_slice() {
        [10] | [5, 5] if is_indian_mobile_start(digits.chars().next()) => {
            Some(phone_detection(None, digits, PhoneStyle::Indian, end))
        }
        [11] | [6, 5]
            if digits.starts_with('0') && is_indian_mobile_start(digits.chars().nth(1)) =>
        {
            Some(phone_detection(None, digits, PhoneStyle::Indian, end))
        }
        [3, 3, 4] if formatted => Some(phone_detection(None, digits, PhoneStyle::Us, end)),
        _ => None,
    }
}

/// The part of a phone number after `+`: country code `91` or `1`, then the national number.
fn detect_plus_phone(
    first: &str,
    all: &[usize],
    rest: &[(String, usize)],
    end: usize,
) -> Option<Detection> {
    // `+919876543210`: country code and number in one token.
    if all == [12] && first.starts_with("91") {
        let national = first.get(2..)?.to_owned();
        return is_indian_mobile_start(national.chars().next())
            .then(|| phone_detection(Some("91"), national, PhoneStyle::Indian, end));
    }
    if all == [11] && first.starts_with('1') {
        let national = first.get(1..)?.to_owned();
        return Some(phone_detection(Some("1"), national, PhoneStyle::Us, end));
    }
    let national = joined(rest);
    let rest_lens = lens(rest);
    match (first, rest_lens.as_slice()) {
        ("91", [10] | [5, 5]) if is_indian_mobile_start(national.chars().next()) => Some(
            phone_detection(Some("91"), national, PhoneStyle::Indian, end),
        ),
        ("1", [10] | [3, 3, 4] | [3, 7]) => {
            Some(phone_detection(Some("1"), national, PhoneStyle::Us, end))
        }
        _ => None,
    }
}

fn is_mask_word(t: &str) -> bool {
    !t.is_empty() && t.chars().all(|c| matches!(c, 'x' | 'X'))
}

fn is_mask_punct(t: &str) -> bool {
    matches!(t, "*" | "•" | "●")
}

/// Masked tails: `XXXX1234`, `XX1234`, `**** 1234`, `XXXX-XXXX-1234`. Returns the digits.
fn detect_masked_tail(ctx: &ClassifyCtx<'_>, at: usize) -> Option<Detection> {
    let mut i = at;
    let mut masks = 0usize;
    loop {
        let t = ctx.token_text(i);
        match ctx.kind(i)? {
            SpanKind::Word if is_mask_word(t) => masks += t.chars().count(),
            SpanKind::Word => {
                // Mask glued to digits in one token: `XXXX1234`.
                let split = t.find(|c: char| !matches!(c, 'x' | 'X'))?;
                let (mask, digits) = t.split_at(split);
                let glued_masks = masks + mask.chars().count();
                let digits = ascii_digits(digits)?;
                return (glued_masks >= MIN_GLUED_MASK && TAIL_DIGITS.contains(&digits.len()))
                    .then(|| tail_detection(ctx, at, i + 1, digits));
            }
            SpanKind::Punctuation if is_mask_punct(t) => masks += 1,
            SpanKind::Space | SpanKind::Punctuation
                if masks > 0 && (t == "-" || t.trim().is_empty()) => {}
            SpanKind::Number => {
                let digits = ascii_digits(t)?;
                return (masks >= MIN_SPACED_MASK && TAIL_DIGITS.contains(&digits.len()))
                    .then(|| tail_detection(ctx, at, i + 1, digits));
            }
            _ => return None,
        }
        i += 1;
    }
}

fn tail_kind(ctx: &ClassifyCtx<'_>, at: usize) -> DigitStringKind {
    let before = words_before(ctx, at, LOOKBACK + 2);
    if any_in(&before, ACCOUNT_WORDS) && !any_in(&before, CARD_WORDS) {
        DigitStringKind::AccountTail
    } else {
        DigitStringKind::CardTail
    }
}

fn tail_detection(ctx: &ClassifyCtx<'_>, at: usize, end: usize, digits: String) -> Detection {
    Detection {
        end,
        value: Semiotic::Otp(DigitString {
            kind: tail_kind(ctx, at),
            digits,
        }),
    }
}

fn id_detection(end: usize, kind: DigitStringKind, digits: String) -> Detection {
    Detection {
        end,
        value: Semiotic::Otp(DigitString { kind, digits }),
    }
}

/// PAN-like (`ABCDE1234F`), Aadhaar-like (`2345 6789 0123`), and card-like (4-4-4-4) strings.
fn detect_id_like(ctx: &ClassifyCtx<'_>, at: usize) -> Option<Detection> {
    if ctx.kind(at) == Some(SpanKind::Word) {
        let t = ctx.token_text(at);
        let b = t.as_bytes();
        let pan = b.len() == 10
            && b.iter().take(5).all(u8::is_ascii_alphabetic)
            && b.iter().skip(5).take(4).all(u8::is_ascii_digit)
            && b.last().is_some_and(u8::is_ascii_alphabetic);
        return pan.then(|| id_detection(at + 1, DigitStringKind::IdLike, t.to_ascii_uppercase()));
    }
    if glued_before(ctx, at) {
        return None;
    }
    let groups = collect_groups(ctx, at);
    let all = lens(&groups);
    let end = groups.last()?.1;
    if continues_after(ctx, end) {
        return None;
    }
    // Only spaces or hyphens between groups.
    let plain_seps = ctx
        .text_between(at, end)
        .chars()
        .all(|c| c.is_ascii_digit() || c == ' ' || c == '-');
    let digits = joined(&groups);
    if !plain_seps {
        return None;
    }
    match all.as_slice() {
        [4, 4, 4] if is_aadhaar_start(&digits) => {
            Some(id_detection(end, DigitStringKind::IdLike, digits))
        }
        [4, 4, 4, 4] => Some(id_detection(end, DigitStringKind::Long, digits)),
        [12] if is_aadhaar_start(&digits) => {
            let before = words_before(ctx, at, LOOKBACK);
            any_in(&before, AADHAAR_WORDS)
                .then(|| id_detection(end, DigitStringKind::IdLike, digits))
        }
        _ => None,
    }
}

fn is_aadhaar_start(digits: &str) -> bool {
    digits.len() == AADHAAR_DIGITS && matches!(digits.chars().next(), Some('2'..='9'))
}

/// OTPs, PINs, tails after "ending", and long digit strings after account or card words.
fn detect_trigger_digits(ctx: &ClassifyCtx<'_>, at: usize) -> Option<Detection> {
    let digits = number_digits(ctx, at)?;
    if glued_before(ctx, at) || continues_after(ctx, at + 1) {
        return None;
    }
    let n = digits.len();
    let end = at + 1;
    let before = words_before(ctx, at, LOOKBACK);
    let kind = if any_in(&before, TAIL_WORDS) && TAIL_DIGITS.contains(&n) {
        Some(tail_kind(ctx, at))
    } else if (OTP_MIN_DIGITS..=OTP_MAX_DIGITS).contains(&n) && any_in_pin_or_otp(&before, ctx, end)
    {
        Some(otp_kind(&before, n))
    } else if LONG_DIGITS.contains(&n) && any_in(&before, LONG_WORDS) {
        Some(DigitStringKind::Long)
    } else {
        None
    }?;
    Some(Detection {
        end,
        value: Semiotic::Otp(DigitString { kind, digits }),
    })
}

fn any_in_pin_or_otp(before: &[String], ctx: &ClassifyCtx<'_>, end: usize) -> bool {
    any_in(before, OTP_WORDS)
        || any_in(before, PIN_WORDS)
        || trigger_after(ctx, end, &[OTP_WORDS, PIN_WORDS])
}

fn otp_kind(before: &[String], n: usize) -> DigitStringKind {
    if any_in(before, PIN_WORDS) {
        if n == POSTAL_PIN_DIGITS {
            DigitStringKind::PostalPin
        } else {
            DigitStringKind::Pin
        }
    } else {
        DigitStringKind::Otp
    }
}

/// Detects a phone number or digit string starting at token `at`.
///
/// Plain numbers with no trigger word (quantities, years, `560001` alone) return `None` and
/// fall through to the number class.
///
/// # Examples
///
/// ```
/// use yuyin_text::{normalise_to_string, LanguageHint, NormaliseOptions};
/// let en = normalise_to_string("Your OTP is 482916", &NormaliseOptions::new(LanguageHint::EnIn)).unwrap();
/// assert_eq!(en, "Your O T P is four eight two nine one six");
/// let hi = normalise_to_string("आपका ओटीपी 1357 है", &NormaliseOptions::new(LanguageHint::Hi)).unwrap();
/// assert_eq!(hi, "आपका ओटीपी एक तीन पाँच सात है");
/// ```
#[must_use]
pub fn detect(ctx: &ClassifyCtx<'_>, at: usize) -> Option<Detection> {
    detect_phone(ctx, at)
        .or_else(|| detect_masked_tail(ctx, at))
        .or_else(|| detect_id_like(ctx, at))
        .or_else(|| detect_trigger_digits(ctx, at))
}

#[cfg(test)]
// The helpers return `Option` so the assertions read `found(..) == string(..)`.
#[allow(clippy::unnecessary_wraps)]
mod tests {
    use super::super::testutil::Fixture;
    use super::*;
    use crate::LanguageHint;

    fn found(text: &str) -> Option<Semiotic> {
        Fixture::new(text, LanguageHint::EnIn)
            .first(detect)
            .map(|(_, d)| d.value)
    }

    fn string(kind: DigitStringKind, digits: &str) -> Option<Semiotic> {
        Some(Semiotic::Otp(DigitString {
            kind,
            digits: digits.to_owned(),
        }))
    }

    fn phone(cc: Option<&str>, digits: &str, style: PhoneStyle) -> Option<Semiotic> {
        Some(Semiotic::Phone(Phone {
            country_code: cc.map(str::to_owned),
            digits: digits.to_owned(),
            style,
        }))
    }

    #[test]
    fn test_digits_detect_otp_before_and_after_trigger() {
        assert_eq!(
            found("Your OTP is 482916"),
            string(DigitStringKind::Otp, "482916")
        );
        assert_eq!(
            found("4829 is your OTP"),
            string(DigitStringKind::Otp, "4829")
        );
        assert_eq!(
            found("Aapka code 000000 hai"),
            string(DigitStringKind::Otp, "000000")
        );
        assert_eq!(found("OTP ४८२९"), string(DigitStringKind::Otp, "4829"));
    }

    #[test]
    fn test_digits_detect_otp_length_bounds() {
        assert_eq!(found("OTP 123"), None);
        assert_eq!(found("OTP 123456789"), None);
        assert!(found("OTP 1234").is_some());
        assert!(found("OTP 12345678").is_some());
    }

    #[test]
    fn test_digits_detect_without_trigger_is_none() {
        for text in [
            "I have 1234 items",
            "in 1999",
            "the year 2026",
            "560001",
            "Total 4829 units. Enter code",
            "482916 items sold",
            "OTP is sent. Then 4829",
        ] {
            assert_eq!(found(text), None, "{text}");
        }
    }

    #[test]
    fn test_digits_detect_pin_kinds() {
        assert_eq!(
            found("PIN code 560001"),
            string(DigitStringKind::PostalPin, "560001")
        );
        assert_eq!(
            found("पिन कोड 560001"),
            string(DigitStringKind::PostalPin, "560001")
        );
        assert_eq!(found("PIN 4829"), string(DigitStringKind::Pin, "4829"));
    }

    #[test]
    fn test_digits_detect_tails() {
        assert_eq!(
            found("card ending 4417"),
            string(DigitStringKind::CardTail, "4417")
        );
        assert_eq!(
            found("account ending in 4417"),
            string(DigitStringKind::AccountTail, "4417")
        );
        assert_eq!(found("XXXX1234"), string(DigitStringKind::CardTail, "1234"));
        assert_eq!(
            found("XXXX XXXX XXXX 1234"),
            string(DigitStringKind::CardTail, "1234")
        );
        assert_eq!(
            found("**** 1234"),
            string(DigitStringKind::CardTail, "1234")
        );
        assert_eq!(found("ending 12"), None);
    }

    #[test]
    fn test_digits_detect_masks_need_enough_characters() {
        assert_eq!(found("X 1234"), None);
        assert_eq!(found("XX 2024"), None);
        assert_eq!(found("XXXX12"), None);
        assert_eq!(found("XXXX12345678"), None);
        assert_eq!(found("XXXX abc"), None);
        assert_eq!(found("XXXX"), None);
    }

    #[test]
    fn test_digits_detect_id_like() {
        assert_eq!(
            found("PAN ABCDE1234F"),
            string(DigitStringKind::IdLike, "ABCDE1234F")
        );
        assert_eq!(
            found("abcde1234f"),
            string(DigitStringKind::IdLike, "ABCDE1234F")
        );
        assert_eq!(found("ABCD1234EF"), None);
        assert_eq!(
            found("2345 6789 0123"),
            string(DigitStringKind::IdLike, "234567890123")
        );
        assert_eq!(found("1345 6789 0123"), None);
        assert_eq!(
            found("Aadhaar 234567890123"),
            string(DigitStringKind::IdLike, "234567890123")
        );
        assert_eq!(found("234567890123"), None);
        assert_eq!(
            found("4000 0000 0000 0000"),
            string(DigitStringKind::Long, "4000000000000000")
        );
    }

    #[test]
    fn test_digits_detect_long_after_account_word() {
        assert_eq!(
            found("account number 123456789012"),
            string(DigitStringKind::Long, "123456789012")
        );
        assert_eq!(found("number 123456789012"), None);
    }

    #[test]
    fn test_digits_detect_phone_forms() {
        let ind = |cc: Option<&str>, d: &str| phone(cc, d, PhoneStyle::Indian);
        assert_eq!(found("9876543210"), ind(None, "9876543210"));
        assert_eq!(found("98765 43210"), ind(None, "9876543210"));
        assert_eq!(found("98765-43210"), ind(None, "9876543210"));
        assert_eq!(found("+91 98765 43210"), ind(Some("91"), "9876543210"));
        assert_eq!(found("+919876543210"), ind(Some("91"), "9876543210"));
        assert_eq!(found("+91 9876543210"), ind(Some("91"), "9876543210"));
        assert_eq!(found("09876543210"), ind(None, "09876543210"));
        assert_eq!(found("098765 43210"), ind(None, "09876543210"));
        let us = |cc: Option<&str>, d: &str| phone(cc, d, PhoneStyle::Us);
        assert_eq!(found("(555) 010-1234"), us(None, "5550101234"));
        assert_eq!(found("555-010-1234"), us(None, "5550101234"));
        assert_eq!(found("555.010.1234"), us(None, "5550101234"));
        assert_eq!(found("+1 555 010 1234"), us(Some("1"), "5550101234"));
        assert_eq!(found("+15550101234"), us(Some("1"), "5550101234"));
        assert_eq!(found("+1 5550101234"), us(Some("1"), "5550101234"));
    }

    #[test]
    fn test_digits_detect_phone_rejects_lookalikes() {
        for text in [
            "1234567890",
            "555 010 1234",
            "9876543210.5",
            "98765 43210 123",
            "+44 98765 43210",
            "+91 12345 67890",
            "+919876543",
            "1.2.3",
            "5550.010.1234",
        ] {
            assert_eq!(found(text), None, "{text}");
        }
    }

    #[test]
    fn test_digits_detect_does_not_start_inside_a_number() {
        let f = Fixture::new("price 1,9876543210", LanguageHint::EnIn);
        assert_eq!(f.first(detect), None);
        let f = Fixture::new("a1 4417", LanguageHint::EnIn);
        assert_eq!(f.first(detect), None);
    }

    #[test]
    fn test_digits_dispatch_runs_before_number_and_after_datetime() {
        let f = Fixture::new("Your OTP is 000000. कोड 1234 है।", LanguageHint::Auto);
        let hits: Vec<_> = (0..f.ctx().len())
            .filter_map(|i| detect(&f.ctx(), i).map(|d| d.value))
            .collect();
        assert_eq!(hits.len(), 2);
    }
}
