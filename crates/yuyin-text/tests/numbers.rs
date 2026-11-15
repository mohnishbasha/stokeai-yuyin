//! Number verbalisation scenarios (S1-T03, `TEST_PLAN` 6.2.6 and 6.2.7).
//!
//! The round-trip property test speaks random values through the whole pipeline in all four
//! languages and parses the words back with a small, test-only parser. The parser is written
//! from the spoken-form rules, not from the verbaliser, so a shared mistake cannot hide.

#![allow(clippy::expect_used, clippy::panic)]

use std::collections::{BTreeMap, BTreeSet};

use proptest::prelude::*;
use proptest::test_runner::{Config, TestRunner};
use yuyin_text::lexicon::HindiNumbers;
use yuyin_text::verbalise::number::{cardinal, ordinal};
use yuyin_text::{normalise_to_string, Lang, LanguageHint, Locale, NormaliseOptions};

const GOLDEN: &str = include_str!("../golden/numbers.tsv");
const HI_TABLE: &str = include_str!("../data/hindi_numbers.tsv");
const CASES: u32 = 128;
/// Largest value the pipeline reads as a number (18 digits, PRD FR-006).
const PIPELINE_LIMIT: u64 = 1_000_000_000_000_000_000;

// ---------------------------------------------------------------- test-only parser

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
const EN_TENS: [(&str, u128); 8] = [
    ("twenty", 20),
    ("thirty", 30),
    ("forty", 40),
    ("fifty", 50),
    ("sixty", 60),
    ("seventy", 70),
    ("eighty", 80),
    ("ninety", 90),
];
const HI_SCALES: [(&str, u128); 5] = [
    ("हज़ार", 1_000),
    ("लाख", 100_000),
    ("करोड़", 10_000_000),
    ("अरब", 1_000_000_000),
    ("खरब", 100_000_000_000),
];
const EN_IN_SCALES: [(&str, u128); 5] = [
    ("thousand", 1_000),
    ("lakh", 100_000),
    ("crore", 10_000_000),
    ("arab", 1_000_000_000),
    ("kharab", 100_000_000_000),
];
const EN_US_SCALES: [(&str, u128); 6] = [
    ("thousand", 1_000),
    ("million", 1_000_000),
    ("billion", 1_000_000_000),
    ("trillion", 1_000_000_000_000),
    ("quadrillion", 1_000_000_000_000_000),
    ("quintillion", 1_000_000_000_000_000_000),
];

#[derive(Clone, Copy, Debug)]
enum Style {
    Hindi,
    EnIn,
    EnUs,
}

fn small_words(style: Style) -> BTreeMap<String, u128> {
    let mut m = BTreeMap::new();
    match style {
        Style::Hindi => {
            let t = HindiNumbers::from_tsv(HI_TABLE);
            for n in 0..100 {
                m.insert(t.get(n).expect("table entry").to_owned(), u128::from(n));
            }
        }
        Style::EnIn | Style::EnUs => {
            for (i, w) in EN_SMALL.iter().enumerate() {
                m.insert((*w).to_owned(), i as u128);
            }
            for (w, v) in EN_TENS {
                m.insert(w.to_owned(), v);
                for (i, u) in EN_SMALL.iter().enumerate().take(10).skip(1) {
                    m.insert(format!("{w}-{u}"), v + i as u128);
                }
            }
        }
    }
    m
}

/// Parses spoken integer words back to a value. `None` if a word is unknown.
fn parse_integer(words: &str, style: Style) -> Option<u128> {
    let small = small_words(style);
    let (hundred, scales): (&str, &[(&str, u128)]) = match style {
        Style::Hindi => ("सौ", &HI_SCALES),
        Style::EnIn => ("hundred", &EN_IN_SCALES),
        Style::EnUs => ("hundred", &EN_US_SCALES),
    };
    let (mut total, mut cur) = (0u128, 0u128);
    for w in words.split_whitespace() {
        if let Some(v) = small.get(w) {
            cur += v;
        } else if w == hundred {
            cur *= 100;
        } else if let Some((_, v)) = scales.iter().find(|(s, _)| *s == w) {
            // The largest Indian scale takes everything said before it as its count.
            if matches!(style, Style::Hindi | Style::EnIn) && *v == 100_000_000_000 {
                total = (total + cur) * v;
            } else {
                total += cur * v;
            }
            cur = 0;
        } else {
            return None;
        }
    }
    Some(total + cur)
}

#[derive(Debug, PartialEq, Eq)]
struct Parsed {
    negative: bool,
    integer: u128,
    fraction: String,
}

fn parse_number(spoken: &str, style: Style) -> Option<Parsed> {
    let (minus, point) = match style {
        Style::Hindi => ("माइनस", "दशमलव"),
        Style::EnIn | Style::EnUs => ("minus", "point"),
    };
    let (negative, rest) = match spoken.strip_prefix(minus) {
        Some(r) => (true, r.trim_start()),
        None => (false, spoken),
    };
    let words: Vec<&str> = rest.split_whitespace().collect();
    let (int_words, frac_words) = match words.iter().position(|w| *w == point) {
        Some(i) => (&words[..i], &words[i + 1..]),
        None => (&words[..], &words[..0]),
    };
    let integer = parse_integer(&int_words.join(" "), style)?;
    let small = small_words(style);
    let fraction = frac_words
        .iter()
        .map(|w| small.get(*w).filter(|v| **v < 10).map(ToString::to_string))
        .collect::<Option<String>>()?;
    Some(Parsed {
        negative,
        integer,
        fraction,
    })
}

// ---------------------------------------------------------------- helpers

fn indian_commas(n: u64) -> String {
    let s = n.to_string();
    if s.len() <= 3 {
        return s;
    }
    let (mut head, tail) = (s[..s.len() - 3].to_owned(), &s[s.len() - 3..]);
    let mut parts = vec![tail.to_owned()];
    while head.len() > 2 {
        parts.push(head.split_off(head.len() - 2));
    }
    parts.push(head);
    parts.reverse();
    parts.join(",")
}

fn western_commas(n: u64) -> String {
    let s = n.to_string();
    let mut out = String::new();
    for (i, c) in s.chars().enumerate() {
        if i > 0 && (s.len() - i).is_multiple_of(3) {
            out.push(',');
        }
        out.push(c);
    }
    out
}

fn style_for(hint: LanguageHint) -> Style {
    match hint {
        LanguageHint::EnUs => Style::EnUs,
        LanguageHint::EnIn => Style::EnIn,
        _ => Style::Hindi,
    }
}

fn written(n: u64, frac: &str, negative: bool, hint: LanguageHint) -> String {
    let int = if hint == LanguageHint::EnUs {
        western_commas(n)
    } else {
        indian_commas(n)
    };
    let dot = if frac.is_empty() { "" } else { "." };
    format!("{}{int}{dot}{frac}", if negative { "-" } else { "" })
}

fn golden_rows() -> BTreeMap<&'static str, (&'static str, &'static str)> {
    GOLDEN
        .lines()
        .skip(1)
        .filter_map(|l| {
            let c: Vec<&str> = l.split('\t').collect();
            (c.len() >= 5).then(|| (c[0], (c[3], c[4])))
        })
        .collect()
}

fn value_strategy() -> impl Strategy<Value = u64> {
    prop_oneof![
        0u64..1_000,
        0u64..10_000_000,
        0u64..PIPELINE_LIMIT,
        0u64..=u64::MAX,
    ]
}

fn pipeline_value() -> impl Strategy<Value = u64> {
    prop_oneof![0u64..1_000, 0u64..10_000_000, 0u64..PIPELINE_LIMIT]
}

fn roundtrip(hint: LanguageHint, n: u64, frac: &str, negative: bool) -> Result<(), TestCaseError> {
    let input = written(n, frac, negative, hint);
    let spoken = normalise_to_string(&input, &NormaliseOptions::new(hint)).expect("normalises");
    let parsed = parse_number(&spoken, style_for(hint));
    prop_assert_eq!(
        parsed,
        Some(Parsed {
            negative,
            integer: u128::from(n),
            fraction: frac.to_owned()
        }),
        "input {} spoken {}",
        input,
        spoken
    );
    Ok(())
}

// ---------------------------------------------------------------- scenarios

#[test]
fn unit_text_numbers_hindi0to99_tablelookup_matchesgolden() {
    let table = HindiNumbers::builtin();
    let rows = golden_rows();
    let mut seen = BTreeSet::new();
    for n in 0..=100u64 {
        let (input, expected) = rows
            .get(format!("golden_hi_cardinal_n{n}").as_str())
            .copied()
            .unwrap_or_else(|| panic!("missing golden row for {n}"));
        assert_eq!(input, n.to_string());
        assert_eq!(cardinal(n, Lang::Hi, Locale::In), expected, "{n}");
        if n < 100 {
            assert_eq!(table.get(n), Some(expected), "{n}");
            assert!(seen.insert(expected), "duplicate word for {n}");
        }
    }
    assert_eq!(seen.len(), 100);
}

#[test]
fn unit_text_cardinal_hindi_0_to_99_table_complete() {
    let table = HindiNumbers::builtin();
    for n in 0..100 {
        assert!(table.get(n).is_some_and(|w| !w.is_empty()), "{n}");
    }
    for scale in [
        100,
        1_000,
        100_000,
        10_000_000,
        1_000_000_000,
        100_000_000_000,
    ] {
        assert!(table.get(scale).is_some(), "{scale}");
    }
}

#[test]
fn unit_text_numbers_indiangrouping_lakhcrore_verbalised() {
    assert_eq!(cardinal(150_000, Lang::Hi, Locale::In), "एक लाख पचास हज़ार");
    assert_eq!(
        cardinal(150_000, Lang::En, Locale::In),
        "one lakh fifty thousand"
    );
    assert_eq!(
        cardinal(124_500_000, Lang::En, Locale::In),
        "twelve crore forty-five lakh"
    );
    assert_eq!(
        cardinal(123_456_789, Lang::Hi, Locale::In),
        "बारह करोड़ चौंतीस लाख छप्पन हज़ार सात सौ नवासी"
    );
    // Hindi ignores a US locale; hinglish uses the same Indian words.
    assert_eq!(cardinal(100_000, Lang::Hi, Locale::Us), "एक लाख");
    for hint in [LanguageHint::Hi, LanguageHint::Hinglish, LanguageHint::EnIn] {
        let out = normalise_to_string("1,25,000", &NormaliseOptions::new(hint)).expect("ok");
        assert!(
            out.contains("लाख") || out.contains("lakh"),
            "{hint:?}: {out}"
        );
    }
}

#[test]
fn unit_text_numbers_westerngrouping_enus_million() {
    assert_eq!(
        cardinal(2_500_000, Lang::En, Locale::Us),
        "two million five hundred thousand"
    );
    let out = normalise_to_string("2,500,000", &NormaliseOptions::new(LanguageHint::EnUs));
    assert_eq!(out.as_deref(), Ok("two million five hundred thousand"));
    assert_eq!(
        cardinal(3_000_000_000, Lang::En, Locale::Us),
        "three billion"
    );
    assert!(!cardinal(2_500_000, Lang::En, Locale::Us).contains("lakh"));
}

#[test]
fn unit_text_cardinal_upper_bound_10_pow_15_handled() {
    assert_eq!(
        cardinal(1_000_000_000_000_000, Lang::En, Locale::Us),
        "one quadrillion"
    );
    assert_eq!(
        cardinal(1_000_000_000_000_000, Lang::Hi, Locale::In),
        "दस हज़ार खरब"
    );
    for lang in [Lang::Hi, Lang::En] {
        for locale in [Locale::In, Locale::Us] {
            assert_ne!(cardinal(u64::MAX, lang, locale), "");
            assert_ne!(ordinal(u64::MAX, lang, locale), "");
        }
    }
}

#[test]
fn unit_text_numbers_eighteen_digit_limit_then_digit_by_digit_passthrough() {
    // PRD FR-006: more than 18 digits are not read as a number here.
    let long = "1234567890123456789";
    let out = normalise_to_string(long, &NormaliseOptions::new(LanguageHint::EnIn));
    assert_eq!(out.as_deref(), Ok(long));
}

/// 128 random values in each of the four languages go through the whole pipeline and are
/// parsed back: integers, negatives, and decimals, grouped the way the language writes them.
#[test]
fn property_text_numbers_roundtrip_100values_parsebackequal() {
    for hint in [
        LanguageHint::Hi,
        LanguageHint::Hinglish,
        LanguageHint::EnIn,
        LanguageHint::EnUs,
    ] {
        let mut runner = TestRunner::new(Config {
            cases: CASES,
            failure_persistence: None,
            ..Config::default()
        });
        let strategy = (pipeline_value(), any::<bool>(), "([0-9]{1,5})?");
        runner
            .run(&strategy, |(n, neg, frac)| roundtrip(hint, n, &frac, neg))
            .unwrap_or_else(|e| panic!("{hint:?}: {e}"));
    }
}

/// Every `u64` through the verbaliser API, in every language and locale.
#[test]
fn property_text_numbers_cardinal_alluint64_parsebackequal() {
    let mut runner = TestRunner::new(Config {
        cases: CASES,
        failure_persistence: None,
        ..Config::default()
    });
    runner
        .run(&value_strategy(), |n| {
            for (lang, locale, style) in [
                (Lang::Hi, Locale::In, Style::Hindi),
                (Lang::Hi, Locale::Us, Style::Hindi),
                (Lang::En, Locale::In, Style::EnIn),
                (Lang::En, Locale::Us, Style::EnUs),
            ] {
                let spoken = cardinal(n, lang, locale);
                prop_assert_eq!(
                    parse_integer(&spoken, style),
                    Some(u128::from(n)),
                    "{}",
                    spoken
                );
            }
            Ok(())
        })
        .unwrap_or_else(|e| panic!("{e}"));
}
