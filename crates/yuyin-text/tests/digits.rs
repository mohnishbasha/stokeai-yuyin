//! Digit-string scenarios (S1-T06, `TEST_PLAN` 6.2.4 and 6.2.5, PRD FR-009).
//!
//! Every number in a fixture is fictitious.

#![allow(clippy::expect_used, clippy::panic)]

use yuyin_text::{normalise, normalise_to_string, LanguageHint, NormaliseOptions};

fn say(text: &str, hint: LanguageHint) -> String {
    normalise_to_string(text, &NormaliseOptions::new(hint)).expect("normalises")
}

#[test]
fn unit_text_digits_otp_readdigitbydigit() {
    assert_eq!(
        say("Your OTP is 482916", LanguageHint::EnIn),
        "Your O T P is four eight two nine one six"
    );
    assert_eq!(
        say("आपका ओटीपी 1357 है", LanguageHint::Hi),
        "आपका ओटीपी एक तीन पाँच सात है"
    );
    // The OTP segment carries the slow pace; nothing else does.
    let segs = normalise(
        "Your OTP is 482916",
        &NormaliseOptions::new(LanguageHint::EnIn),
    )
    .expect("normalises");
    assert!(segs
        .iter()
        .any(|s| (s.pace_hint - 0.85).abs() < f32::EPSILON));
}

#[test]
fn unit_text_digits_otp_outsidefourtoeight_notdigitbydigit() {
    assert_eq!(
        say("OTP 123", LanguageHint::EnIn),
        "O T P one hundred twenty-three"
    );
    assert_eq!(
        say("OTP 123456789", LanguageHint::EnIn),
        "O T P twelve crore thirty-four lakh fifty-six thousand seven hundred eighty-nine"
    );
}

#[test]
fn unit_text_digits_cardtail_xxxxprefix_readcorrectly() {
    assert_eq!(
        say("card ending 4417", LanguageHint::EnIn),
        "card ending four four one seven"
    );
    assert_eq!(
        say("card XXXX1234", LanguageHint::EnUs),
        "card one two three four"
    );
    assert_eq!(
        say("XXXX XXXX XXXX 4321", LanguageHint::EnIn),
        "four three two one"
    );
}

#[test]
fn unit_text_digits_year_negativecase_readasnumber() {
    for text in ["1999", "the year 2026", "I have 1234 items"] {
        let out = say(text, LanguageHint::EnIn);
        assert!(
            !out.contains("one nine nine nine") && !out.contains("two zero two six"),
            "{text}: {out}"
        );
        assert!(
            !out.contains("one two three four"),
            "{text} read digit by digit: {out}"
        );
    }
    assert_eq!(
        say("I have 1234 items", LanguageHint::EnIn),
        "I have one thousand two hundred thirty-four items"
    );
}

#[test]
fn unit_text_digits_pincode_withprefix_readbydigit() {
    assert_eq!(
        say("पिन कोड 560001", LanguageHint::Hi),
        "पिन कोड पाँच छह शून्य शून्य शून्य एक"
    );
    assert_eq!(
        say("PIN 560001", LanguageHint::EnIn),
        "pin five six zero zero zero one"
    );
    // No prefix: a number.
    assert_eq!(
        say("560001", LanguageHint::EnIn),
        "five lakh sixty thousand one"
    );
}

#[test]
fn unit_text_digits_panlike_readcharbychar() {
    assert_eq!(
        say("PAN ABCDE1234F", LanguageHint::EnIn),
        "pan A B C D E one two three four F"
    );
    assert_eq!(
        say("Aadhaar 2345 6789 0123", LanguageHint::EnIn),
        "Aadhaar two three four five, six seven eight nine, zero one two three"
    );
}

#[test]
fn unit_text_digits_phone_groupsfiveandfive() {
    assert_eq!(
        say("+91 98765 43210", LanguageHint::EnIn),
        "plus nine one, nine eight seven six five, four three two one zero"
    );
    assert_eq!(
        say("(555) 010-1234", LanguageHint::EnUs),
        "five five five, zero one zero, one two three four"
    );
}
