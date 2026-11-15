//! Fuzz target for the text front-end (S1-T12, TEST_PLAN NM-GLD-03, PRD NFR-011).
//!
//! The first byte picks the language and the `normalize` flag; the rest is the text. Invariants:
//! no panic, segments tile the clean text exactly, and with `normalize = true` the output holds
//! no ASCII digit.

#![no_main]

use libfuzzer_sys::fuzz_target;
use yuyin_text::{clean, normalise, LanguageHint, NormaliseOptions};

const HINTS: [LanguageHint; 5] = [
    LanguageHint::Auto,
    LanguageHint::Hi,
    LanguageHint::Hinglish,
    LanguageHint::EnIn,
    LanguageHint::EnUs,
];

fuzz_target!(|data: &[u8]| {
    let Some((&first, rest)) = data.split_first() else {
        return;
    };
    let Ok(text) = std::str::from_utf8(rest) else {
        return;
    };
    let mut opts = NormaliseOptions::new(HINTS[usize::from(first >> 1) % HINTS.len()]);
    opts.normalize = first & 1 == 1;
    let Ok(segments) = normalise(text, &opts) else {
        return;
    };
    let cleaned = clean(text, &opts).expect("normalise succeeded, so clean does");
    let mut next = 0;
    for seg in &segments {
        assert_eq!(seg.char_span.start, next);
        assert!(seg.char_span.end > seg.char_span.start);
        next = seg.char_span.end;
        if opts.normalize {
            assert!(!seg.text.chars().any(|c| c.is_ascii_digit()));
        }
    }
    assert_eq!(next, cleaned.char_count());
});
