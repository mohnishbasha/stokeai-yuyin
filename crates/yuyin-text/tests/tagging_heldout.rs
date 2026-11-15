//! Held-out accuracy of the language tagger (S1-T02, `TEST_PLAN` LT-17).
//!
//! `tests/data/tagging/hinglish_heldout.tsv` holds 2,000 or more hand-labelled Hinglish tokens
//! in original sentences that were not used to build the lexicon or train the n-gram model.
//! This is test harness code, so file reads are fine here; the crate itself stays pure.

#![allow(clippy::expect_used, clippy::panic, clippy::print_stdout)]

use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

use yuyin_text::{clean, tag, tokenise, Lang, LanguageHint, Lexicons, NormaliseOptions, Script};

struct Sentence {
    tokens: Vec<(String, Lang)>,
}

fn load() -> Vec<Sentence> {
    let path =
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../../tests/data/tagging/hinglish_heldout.tsv");
    let src = fs::read_to_string(path).expect("held-out file reads");
    let mut by_id: BTreeMap<u32, Vec<(String, Lang)>> = BTreeMap::new();
    for line in src.lines().skip(1).filter(|l| !l.trim().is_empty()) {
        let f: Vec<&str> = line.split('\t').collect();
        assert_eq!(f.len(), 3, "bad row: {line}");
        let lang = match f[2] {
            "hi" => Lang::Hi,
            "en" => Lang::En,
            other => panic!("bad label {other}"),
        };
        by_id
            .entry(f[0].parse().expect("sentence id"))
            .or_default()
            .push((f[1].to_owned(), lang));
    }
    by_id
        .into_values()
        .map(|tokens| Sentence { tokens })
        .collect()
}

/// Tags every sentence and returns (correct, total, mistakes).
fn evaluate(hint: LanguageHint) -> (usize, usize, Vec<String>) {
    let (mut ok, mut total, mut bad) = (0, 0, Vec::new());
    for s in load() {
        let words: Vec<&str> = s.tokens.iter().map(|(w, _)| w.as_str()).collect();
        let text = clean(&words.join(" "), &NormaliseOptions::new(hint)).expect("cleans");
        let tagged = tag::tag(&tokenise(&text), &text, Lexicons::builtin(), hint);
        let got: Vec<(String, Lang)> = tagged
            .iter()
            .filter(|t| matches!(t.script, Script::Latn | Script::Deva))
            .map(|t| {
                (
                    text.as_str()
                        .get(t.span.range.clone())
                        .unwrap_or_default()
                        .to_owned(),
                    t.lang,
                )
            })
            .collect();
        assert_eq!(got.len(), s.tokens.len(), "token count differs: {words:?}");
        for ((word, want), (_, have)) in s.tokens.iter().zip(&got) {
            total += 1;
            if want == have {
                ok += 1;
            } else {
                bad.push(format!(
                    "{word}: want {want:?}, got {have:?} in {:?}",
                    words.join(" ")
                ));
            }
        }
    }
    (ok, total, bad)
}

#[test]
fn unit_text_tagger_heldoutset_accuracyatleast95pct() {
    let (ok, total, bad) = evaluate(LanguageHint::Auto);
    assert!(
        total >= 2_000,
        "held-out set has {total} tokens, need 2,000"
    );
    #[allow(clippy::cast_precision_loss)]
    let accuracy = ok as f64 / total as f64;
    println!("held-out accuracy: {ok}/{total} = {accuracy:.4}");
    for line in &bad {
        println!("MISS {line}");
    }
    assert!(accuracy >= 0.95, "accuracy {accuracy:.4} is below 95%");
}
