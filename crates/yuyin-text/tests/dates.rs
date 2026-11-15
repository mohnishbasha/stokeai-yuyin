//! Date and time scenarios (S1-T05, `TEST_PLAN` 6.2.2 and 6.2.3, PRD FR-008).

#![allow(clippy::expect_used, clippy::panic)]

use yuyin_text::{normalise_to_string, LanguageHint, NormaliseOptions};

fn say(text: &str, lang: LanguageHint) -> String {
    normalise_to_string(text, &NormaliseOptions::new(lang)).expect("normalise")
}

#[test]
fn unit_text_dates_ambiguousnumeric_enin_readsdaymonth() {
    assert_eq!(
        say("05/12/2026", LanguageHint::EnIn),
        "the fifth of December twenty twenty-six"
    );
    assert_eq!(
        say("05/12/2026", LanguageHint::Hi),
        "पाँच दिसंबर दो हज़ार छब्बीस"
    );
    assert_eq!(
        say("05/12/2026", LanguageHint::Hinglish),
        "पाँच दिसंबर दो हज़ार छब्बीस"
    );
    // `auto` is day first (PRD FR-008).
    assert_eq!(
        say("05/12/2026", LanguageHint::Auto),
        "पाँच दिसंबर दो हज़ार छब्बीस"
    );
}

#[test]
fn unit_text_dates_ambiguousnumeric_enus_readsmonthday() {
    assert_eq!(
        say("05/12/2026", LanguageHint::EnUs),
        "May twelfth twenty twenty-six"
    );
}

#[test]
fn unit_text_dates_ambiguous_never_swaps_across_locales() {
    // 25/03/2026 is valid day first and invalid month first: en-US must not swap it.
    assert_eq!(
        say("25/03/2026", LanguageHint::EnIn),
        "the twenty-fifth of March twenty twenty-six"
    );
    assert_eq!(say("25/03/2026", LanguageHint::EnUs), "25/03/2026");
    // And the other way round.
    assert_eq!(say("03/25/2026", LanguageHint::EnIn), "03/25/2026");
    assert_eq!(
        say("03/25/2026", LanguageHint::EnUs),
        "March twenty-fifth twenty twenty-six"
    );
}

#[test]
fn unit_text_dates_invalid_left_as_written() {
    assert_eq!(say("31/02/2026", LanguageHint::EnIn), "31/02/2026");
    assert_eq!(say("29/02/2025", LanguageHint::EnIn), "29/02/2025");
    assert_eq!(
        say("29/02/2028", LanguageHint::EnIn),
        "the twenty-ninth of February twenty twenty-eight"
    );
}

#[test]
fn unit_text_dates_iso_parses_in_every_locale() {
    for lang in [
        LanguageHint::EnIn,
        LanguageHint::EnUs,
        LanguageHint::Hi,
        LanguageHint::Hinglish,
    ] {
        let spoken = say("2026-03-05", lang);
        assert!(
            spoken.contains("मार्च") || spoken.contains("March"),
            "{lang:?}: {spoken}"
        );
    }
    assert_eq!(
        say("2026-03-05", LanguageHint::EnUs),
        "March fifth twenty twenty-six"
    );
}

#[test]
fn unit_text_dates_month_names_both_languages() {
    assert_eq!(
        say("5 मार्च 2026", LanguageHint::Hi),
        "पाँच मार्च दो हज़ार छब्बीस"
    );
    assert_eq!(
        say("5 March 2026", LanguageHint::EnIn),
        "the fifth of March twenty twenty-six"
    );
    assert_eq!(
        say("March 5, 2026", LanguageHint::EnUs),
        "March fifth twenty twenty-six"
    );
    assert_eq!(
        say("March 2026", LanguageHint::EnIn),
        "March twenty twenty-six"
    );
}

#[test]
fn unit_text_dates_relativeformat_leftuntouched() {
    assert_eq!(say("tomorrow", LanguageHint::EnIn), "tomorrow");
    assert_eq!(
        say("kal milte hain", LanguageHint::Hinglish),
        "kal milte hain"
    );
    assert_eq!(say("कल मिलते हैं", LanguageHint::Hi), "कल मिलते हैं");
    assert_eq!(
        say("See you next week or yesterday", LanguageHint::EnUs),
        "See you next week or yesterday"
    );
    // The clock part is read, the relative word is not touched.
    assert_eq!(
        say("tomorrow at 5:30 PM", LanguageHint::EnIn),
        "tomorrow at five thirty P M"
    );
}

#[test]
fn unit_text_dates_year_only_reads_as_year() {
    assert_eq!(say("in 2026", LanguageHint::EnUs), "in twenty twenty-six");
}

#[test]
fn unit_text_times_24hourhrs_verbalised() {
    assert_eq!(
        say("17:30 hrs", LanguageHint::EnIn),
        "seventeen thirty hours"
    );
    assert_eq!(say("17:30 hrs", LanguageHint::Hi), "सत्रह बजकर तीस मिनट");
}

#[test]
fn unit_text_times_12hour_meridiem_verbalised() {
    assert_eq!(say("5:30 PM", LanguageHint::EnIn), "five thirty P M");
    assert_eq!(say("3:30 pm", LanguageHint::EnUs), "three thirty P M");
    assert_eq!(say("3:30 pm", LanguageHint::Hi), "शाम के साढ़े तीन बजे");
    assert_eq!(say("9:00 AM", LanguageHint::Hi), "सुबह के नौ बजे");
    assert_eq!(say("12:00 AM", LanguageHint::EnUs), "midnight");
    assert_eq!(say("12:00 PM", LanguageHint::EnUs), "noon");
}

#[test]
fn unit_text_times_duration_reads_hours_minutes() {
    assert_eq!(
        say("2h 15m", LanguageHint::EnUs),
        "two hours fifteen minutes"
    );
    assert_eq!(say("2h 15m", LanguageHint::Hi), "दो घंटे पंद्रह मिनट");
}
