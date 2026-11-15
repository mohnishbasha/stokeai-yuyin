//! Currency scenarios (S1-T04, `TEST_PLAN` 6.2.1, PRD FR-007).
//!
//! Each test runs text through the whole pipeline in all four languages. Expected strings are
//! written by hand from the spoken-form rules in `verbalise::money`, not computed.

#![allow(clippy::expect_used, clippy::panic)]

use yuyin_text::{normalise_to_string, LanguageHint, NormaliseOptions};

const HINDI: [LanguageHint; 2] = [LanguageHint::Hi, LanguageHint::Hinglish];
const ENGLISH: [LanguageHint; 2] = [LanguageHint::EnIn, LanguageHint::EnUs];

fn say(text: &str, hint: LanguageHint) -> String {
    normalise_to_string(text, &NormaliseOptions::new(hint)).expect("normalises")
}

#[test]
fn unit_text_currency_rupeesymbol_spoken_matchesgolden() {
    // Every rupee marker reads the same, before or after the amount.
    for text in [
        "₹12,450",
        "Rs 12,450",
        "Rs. 12,450",
        "INR 12,450",
        "रु 12,450",
        "12,450 INR",
    ] {
        for hint in HINDI {
            assert_eq!(
                say(text, hint),
                "बारह हज़ार चार सौ पचास रुपये",
                "{text} {hint:?}"
            );
        }
        for hint in ENGLISH {
            assert_eq!(
                say(text, hint),
                "twelve thousand four hundred fifty rupees",
                "{text} {hint:?}"
            );
        }
    }
    // Dollar markers.
    for text in ["$20", "USD 20", "20 USD"] {
        assert_eq!(say(text, LanguageHint::EnUs), "twenty dollars", "{text}");
        assert_eq!(say(text, LanguageHint::Hi), "बीस डॉलर", "{text}");
    }
    // Indian and Western grouping parse alike; the locale picks the words.
    assert_eq!(
        say("₹1,25,000", LanguageHint::EnIn),
        "one lakh twenty-five thousand rupees"
    );
    assert_eq!(
        say("₹125,000", LanguageHint::EnIn),
        "one lakh twenty-five thousand rupees"
    );
    assert_eq!(
        say("₹1,25,000", LanguageHint::EnUs),
        "one hundred twenty-five thousand rupees"
    );
}

#[test]
fn unit_text_currency_paise_fractionalamount_verbalised() {
    assert_eq!(say("₹250.50", LanguageHint::Hi), "दो सौ पचास रुपये पचास पैसे");
    assert_eq!(
        say("₹250.50", LanguageHint::EnIn),
        "two hundred fifty rupees and fifty paise"
    );
    assert_eq!(
        say("$1,234.56", LanguageHint::EnUs),
        "one thousand two hundred thirty-four dollars and fifty-six cents"
    );
    // A single minor digit is tenths, so `.5` is fifty.
    assert_eq!(
        say("₹10.5", LanguageHint::EnIn),
        "ten rupees and fifty paise"
    );
    // Singular forms, minor-only amounts, and an empty minor part.
    assert_eq!(say("$1.01", LanguageHint::EnUs), "one dollar and one cent");
    assert_eq!(say("₹0.75", LanguageHint::EnIn), "seventy-five paise");
    assert_eq!(say("Rs 5.00", LanguageHint::EnIn), "five rupees");
}

#[test]
fn unit_text_currency_lakhcroreshorthand_expanded() {
    assert_eq!(say("₹1.5 lakh", LanguageHint::Hi), "डेढ़ लाख रुपये");
    assert_eq!(say("₹2 Cr", LanguageHint::Hi), "दो करोड़ रुपये");
    assert_eq!(say("₹2.5 crore", LanguageHint::Hinglish), "ढाई करोड़ रुपये");
    assert_eq!(
        say("₹1.5 lakh", LanguageHint::EnIn),
        "one point five lakh rupees"
    );
    assert_eq!(say("₹2 Cr", LanguageHint::EnIn), "two crore rupees");
    // The writer's scale word is kept in any locale.
    assert_eq!(say("₹2 Cr", LanguageHint::EnUs), "two crore rupees");
    assert_eq!(
        say("$3 million", LanguageHint::EnUs),
        "three million dollars"
    );
}

#[test]
fn unit_text_currency_trailingslashdash_ignored() {
    for hint in HINDI {
        assert_eq!(say("Rs 12,450/-", hint), "बारह हज़ार चार सौ पचास रुपये");
        assert_eq!(say("कुल Rs. 500/- है।", hint), "कुल पाँच सौ रुपये है।");
    }
    for hint in ENGLISH {
        assert_eq!(
            say("Rs 12,450/-", hint),
            "twelve thousand four hundred fifty rupees"
        );
    }
    // Neither a dash nor a slash is spoken or left behind.
    let out = say("Total Rs. 1,000.25/-", LanguageHint::EnIn);
    assert_eq!(out, "Total one thousand rupees and twenty-five paise");
    assert!(!out.contains('/') && !out.ends_with('-'));
}

#[test]
fn unit_text_currency_markerwithoutamount_passesthrough() {
    assert_eq!(
        say("The $ sign is common.", LanguageHint::EnUs),
        "The $ sign is common."
    );
    assert_eq!(
        say("Rs ki value badhi", LanguageHint::Hinglish),
        "Rs ki value badhi"
    );
}
