//! Property tests for the normaliser and segmenter (S1-T12, `TEST_PLAN` NM-DET-01 to NM-DET-03
//! and SG-12, PRD NFR-011). Each property runs 10,000 cases.
//!
//! Inputs come from two kinds of strategy: fully arbitrary Unicode (including controls and
//! unassigned code points), and a "realistic" mix that is dense in digits, separators, currency
//! signs, Devanagari, and Roman Hindi so the semiotic classes are actually reached.

#![allow(clippy::expect_used, clippy::panic)]

use proptest::prelude::*;
use yuyin_text::segment::{segment, Piece, SegmentOptions};
use yuyin_text::{
    clean, normalise, tag, tokenise, LanguageHint, Lexicons, NormaliseOptions, TextError,
};

const CASES: u32 = 10_000;

fn config() -> ProptestConfig {
    ProptestConfig {
        cases: CASES,
        // No regression files in the tree: a failure prints its seed and the shrunk input, and
        // the minimal case is added as a unit or golden row.
        failure_persistence: None,
        max_shrink_iters: 4_096,
        ..ProptestConfig::default()
    }
}

fn hint() -> impl Strategy<Value = LanguageHint> {
    prop_oneof![
        Just(LanguageHint::Auto),
        Just(LanguageHint::Hi),
        Just(LanguageHint::Hinglish),
        Just(LanguageHint::EnIn),
        Just(LanguageHint::EnUs),
    ]
}

/// Text dense in the characters the classifiers care about.
fn realistic() -> impl Strategy<Value = String> {
    let piece = prop_oneof![
        3 => "[0-9]{1,12}",
        2 => "[0-9]{1,3}([,.][0-9]{1,3}){0,3}",
        2 => "[a-zA-Z]{1,8}",
        2 => "[\u{0900}-\u{097F}]{1,8}",
        1 => "[\u{0966}-\u{096F}]{1,6}",
        1 => "[\u{FF10}-\u{FF19}\u{0660}-\u{0669}\u{06F0}-\u{06F9}]{1,6}",
        2 => prop::sample::select(vec![
            " ", "  ", "\n", "\t", ".", ",", ";", ":", "!", "?", "\u{0964}", "\u{0965}",
            "-", "/", "@", "%", "#", "+", "(", ")", "\u{20B9}", "$", "Rs.", "Rs", "INR",
            "OTP", "PIN", "code", "\u{0915}\u{094B}\u{0921}", "lakh", "crore", "paise",
            "cents", "am", "pm", "kg", "km", "GB", "http://", "https://", "www.", ".com",
            "a@b.in", "\u{200D}", "\u{200C}", "\u{FEFF}", "\u{0}", "\u{7}",
        ]).prop_map(str::to_owned),
    ];
    prop::collection::vec(piece, 0..40).prop_map(|v| v.concat())
}

fn any_text() -> impl Strategy<Value = String> {
    prop_oneof![
        3 => realistic(),
        2 => any::<String>(),
        // Raw code points over the whole range, controls and noncharacters included.
        1 => prop::collection::vec(any::<char>(), 0..200)
            .prop_map(|v| v.into_iter().collect::<String>()),
        // Long inputs, around and above the default 5,000 code point limit.
        1 => (realistic(), 1usize..300).prop_map(|(s, n)| s.repeat(n)),
    ]
}

fn options(language: LanguageHint, normalize: bool) -> NormaliseOptions<'static> {
    NormaliseOptions {
        normalize,
        ..NormaliseOptions::new(language)
    }
}

proptest! {
    #![proptest_config(config())]

    /// property_text_normalise_arbitraryunicode_neverpanics
    #[test]
    fn property_text_normalise_arbitraryunicode_neverpanics(
        text in any_text(),
        language in hint(),
        normalize in any::<bool>(),
    ) {
        // Any outcome is fine except a panic; only the documented errors may appear.
        match normalise(&text, &options(language, normalize)) {
            Ok(_) | Err(TextError::Empty | TextError::TooLong { .. }) => {}
            Err(other) => prop_assert!(false, "unexpected error: {other}"),
        }
    }

    /// property_text_normalise_sameinput_deterministicoutput
    #[test]
    fn property_text_normalise_sameinput_deterministicoutput(
        text in any_text(),
        language in hint(),
        normalize in any::<bool>(),
    ) {
        let opts = options(language, normalize);
        prop_assert_eq!(normalise(&text, &opts), normalise(&text, &opts));
    }

    /// property_text_normalise_normalizetrue_noasciidigits
    #[test]
    fn property_text_normalise_normalizetrue_noasciidigits(
        text in any_text(),
        language in hint(),
    ) {
        if let Ok(segments) = normalise(&text, &options(language, true)) {
            for seg in &segments {
                prop_assert!(
                    !seg.text.chars().any(|c| c.is_ascii_digit()),
                    "ascii digit in output {:?} for input {:?}", seg.text, text
                );
            }
        }
    }

    /// property_text_segmenter_anyinput_spancoverageexact
    ///
    /// Through the public pipeline: the `char_span` values of the segments start at 0, are
    /// contiguous, never overlap, and end at the code point count of the clean text.
    #[test]
    fn property_text_segmenter_anyinput_spancoverageexact(
        text in any_text(),
        language in hint(),
        normalize in any::<bool>(),
    ) {
        let opts = options(language, normalize);
        let Ok(segments) = normalise(&text, &opts) else { return Ok(()); };
        let cleaned = clean(&text, &opts).expect("normalise succeeded, so clean does");
        let mut next = 0;
        for seg in &segments {
            prop_assert_eq!(seg.char_span.start, next, "gap or overlap before {:?}", seg);
            prop_assert!(seg.char_span.end > seg.char_span.start, "empty span {:?}", seg);
            next = seg.char_span.end;
        }
        prop_assert_eq!(next, cleaned.char_count());
    }

    /// The same coverage guarantee for the bare segmenter with arbitrary segment budgets,
    /// fed passthrough pieces from the tokeniser.
    #[test]
    fn property_text_segmenter_anybudget_spancoverageexact(
        text in any_text(),
        first in 1usize..80,
        later in 1usize..300,
    ) {
        let opts = NormaliseOptions::default();
        let Ok(cleaned) = clean(&text, &opts) else { return Ok(()); };
        let spans = tokenise(&cleaned);
        let tagged = tag::tag(&spans, &cleaned, Lexicons::builtin(), opts.language);
        let context = tag::context_languages(&tagged, &cleaned, opts.language);
        let pieces: Vec<Piece> = tagged
            .iter()
            .zip(&context)
            .map(|(t, lang)| Piece::passthrough(t, *lang, cleaned.as_str()))
            .collect();
        let segments = segment(
            &cleaned,
            &pieces,
            &SegmentOptions { first_max_chars: first, max_chars: later },
        );
        let mut next = 0;
        for seg in &segments {
            prop_assert_eq!(seg.char_span.start, next);
            prop_assert!(seg.char_span.end > seg.char_span.start);
            next = seg.char_span.end;
        }
        prop_assert_eq!(next, cleaned.char_count());
    }
}
