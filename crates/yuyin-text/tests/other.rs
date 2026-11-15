//! Percent, unit, range, email and URL scenarios (S1-T08, `TEST_PLAN` 6.2.8 to 6.2.12).

#![allow(clippy::expect_used, clippy::panic)]

use yuyin_text::{normalise_to_string, LanguageHint, Locale, NormaliseOptions};

fn say(text: &str, hint: LanguageHint, locale: Locale) -> String {
    let mut opts = NormaliseOptions::new(hint);
    opts.locale = locale;
    normalise_to_string(text, &opts).expect("normalise")
}

#[test]
fn unit_text_units_mbps_expandedcorrectly() {
    assert_eq!(
        say("Speed is 100 Mbps today", LanguageHint::EnIn, Locale::In),
        "Speed is one hundred megabits per second today"
    );
    assert_eq!(
        say("It is 5 km away", LanguageHint::EnIn, Locale::Us),
        "It is five kilometers away"
    );
    assert_eq!(
        say("It is 5 km away", LanguageHint::EnIn, Locale::In),
        "It is five kilometres away"
    );
}

#[test]
fn unit_text_ranges_daysrange_readasrange() {
    assert_eq!(
        say("Takes 10-15 days", LanguageHint::EnIn, Locale::In),
        "Takes ten to fifteen days"
    );
    assert_eq!(
        say("e-mail and T-shirt", LanguageHint::EnIn, Locale::In),
        "e-mail and T-shirt"
    );
}

#[test]
fn unit_text_email_atdot_spokenform() {
    assert_eq!(
        say(
            "Mail support@example.com now",
            LanguageHint::EnIn,
            Locale::Us
        ),
        "Mail support at example dot com now"
    );
}

#[test]
fn unit_text_url_slashdot_spokenform() {
    assert_eq!(
        say(
            "Go to https://example.com/pay now",
            LanguageHint::EnIn,
            Locale::Us
        ),
        "Go to example dot com slash pay now"
    );
}
