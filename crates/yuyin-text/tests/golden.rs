//! Golden corpus runner (S1-T01, `TEST_PLAN` section 5, NFR-011).
//!
//! Reads every `golden/*.tsv` file, runs each row through [`normalise_to_string`] with the
//! row's language, and fails on any mismatch. Prints per-class pass counts so CI logs show
//! where the corpus stands. Run it alone with `cargo test -p yuyin-text --test golden -- --nocapture`.

// Test harness code outside `#[test]` functions: clippy's in-test allowances do not reach it.
#![allow(clippy::expect_used, clippy::panic, clippy::print_stdout)]

use std::collections::{BTreeMap, HashSet};
use std::fmt::Write as _;
use std::fs;
use std::path::{Path, PathBuf};

use yuyin_text::{normalise_to_string, LanguageHint, NormaliseOptions};

/// Column header every golden file starts with.
const HEADER: &str = "id\tlang\tclass\tinput\texpected\tnotes";

/// Floor on the corpus size. Raised as class tasks add rows: 400 at the end of Sprint 1,
/// 1,500 by v1.0.0 (NFR-011, `TEST_PLAN` section 5).
const MIN_ROWS: usize = 40;

#[derive(Debug, Clone, PartialEq, Eq)]
struct Row {
    file: String,
    line: usize,
    id: String,
    lang: String,
    class: String,
    input: String,
    expected: String,
}

#[derive(Debug, Default, PartialEq, Eq)]
struct ClassCount {
    passed: usize,
    total: usize,
}

#[derive(Debug, Default)]
struct Report {
    per_class: BTreeMap<String, ClassCount>,
    failures: Vec<String>,
}

impl Report {
    fn total(&self) -> usize {
        self.per_class.values().map(|c| c.total).sum()
    }

    fn summary(&self) -> String {
        let mut out = String::from("golden corpus, per-class pass counts:\n");
        for (class, c) in &self.per_class {
            let _ = writeln!(out, "  {class:<10} {}/{}", c.passed, c.total);
        }
        let passed: usize = self.per_class.values().map(|c| c.passed).sum();
        let _ = writeln!(out, "  {:<10} {passed}/{}", "total", self.total());
        out
    }
}

fn golden_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("golden")
}

/// Parses one golden file. Errors name the file and line.
fn parse_tsv(file: &str, content: &str) -> Result<Vec<Row>, String> {
    let mut lines = content.lines().enumerate();
    match lines.next() {
        Some((_, h)) if h == HEADER => {}
        _ => return Err(format!("{file}: first line must be the header `{HEADER}`")),
    }
    let mut rows = Vec::new();
    for (i, line) in lines {
        if line.trim().is_empty() {
            continue;
        }
        let cols: Vec<&str> = line.split('\t').collect();
        // The notes column may be omitted when empty.
        if !(5..=6).contains(&cols.len()) {
            return Err(format!(
                "{file}:{}: expected 6 columns, found {}",
                i + 1,
                cols.len()
            ));
        }
        rows.push(Row {
            file: file.to_owned(),
            line: i + 1,
            id: cols[0].to_owned(),
            lang: cols[1].to_owned(),
            class: cols[2].to_owned(),
            input: cols[3].to_owned(),
            expected: cols[4].to_owned(),
        });
    }
    Ok(rows)
}

/// The id prefix for a language column value: `en-IN` becomes `en_in`.
fn id_lang(lang: &str) -> String {
    lang.to_ascii_lowercase().replace('-', "_")
}

/// Checks ids are unique and follow `golden_{lang}_{class}_{name}`.
fn validate(rows: &[Row]) -> Result<(), String> {
    let mut seen = HashSet::new();
    for r in rows {
        let at = format!("{}:{}", r.file, r.line);
        LanguageHint::parse(&r.lang).map_err(|e| format!("{at}: {e}"))?;
        if r.lang == "auto" {
            return Err(format!("{at}: lang must be hi, hinglish, en-IN, or en-US"));
        }
        let prefix = format!("golden_{}_{}_", id_lang(&r.lang), r.class);
        if !r.id.starts_with(&prefix) || r.id.len() == prefix.len() {
            return Err(format!("{at}: id `{}` must start with `{prefix}`", r.id));
        }
        if !seen.insert(r.id.as_str()) {
            return Err(format!("{at}: duplicate id `{}`", r.id));
        }
        if r.input.is_empty() || r.expected.is_empty() {
            return Err(format!("{at}: input and expected must not be empty"));
        }
    }
    Ok(())
}

fn run_rows(rows: &[Row]) -> Report {
    let mut report = Report::default();
    for r in rows {
        let count = report.per_class.entry(r.class.clone()).or_default();
        count.total += 1;
        let Ok(hint) = LanguageHint::parse(&r.lang) else {
            report
                .failures
                .push(format!("{}: bad lang `{}`", r.id, r.lang));
            continue;
        };
        match normalise_to_string(&r.input, &NormaliseOptions::new(hint)) {
            Ok(got) if got == r.expected => count.passed += 1,
            Ok(got) => report.failures.push(format!(
                "{} ({}:{})\n    input:    {}\n    expected: {}\n    got:      {got}",
                r.id, r.file, r.line, r.input, r.expected
            )),
            Err(e) => report
                .failures
                .push(format!("{} ({}:{}): error {e}", r.id, r.file, r.line)),
        }
    }
    report
}

fn load_corpus() -> Vec<Row> {
    let mut paths: Vec<PathBuf> = fs::read_dir(golden_dir())
        .expect("golden directory exists")
        .map(|e| e.expect("readable entry").path())
        .filter(|p| p.extension().is_some_and(|x| x == "tsv"))
        .collect();
    paths.sort();
    let mut rows = Vec::new();
    for p in paths {
        let name = p
            .file_name()
            .expect("file name")
            .to_string_lossy()
            .into_owned();
        let content = fs::read_to_string(&p).expect("readable golden file");
        rows.extend(parse_tsv(&name, &content).unwrap_or_else(|e| panic!("{e}")));
    }
    rows
}

#[test]
fn unit_text_goldenrunner_allrows_passes() {
    let rows = load_corpus();
    validate(&rows).unwrap_or_else(|e| panic!("{e}"));
    let report = run_rows(&rows);
    println!("{}", report.summary());
    assert!(
        report.failures.is_empty(),
        "{} golden row(s) failed:\n{}\n{}",
        report.failures.len(),
        report.failures.join("\n"),
        report.summary()
    );
    assert!(
        report.total() >= MIN_ROWS,
        "corpus has {} rows, the floor is {MIN_ROWS}",
        report.total()
    );
}

fn row(id: &str, lang: &str, class: &str, input: &str, expected: &str) -> Row {
    Row {
        file: "t.tsv".into(),
        line: 2,
        id: id.into(),
        lang: lang.into(),
        class: class.into(),
        input: input.into(),
        expected: expected.into(),
    }
}

#[test]
fn unit_text_goldenrunner_regressionrow_failsci() {
    let rows = vec![
        row("golden_hi_plain_ok", "hi", "plain", "नमस्ते।", "नमस्ते।"),
        row(
            "golden_en_us_plain_bad",
            "en-US",
            "plain",
            "Hello.",
            "Goodbye.",
        ),
    ];
    let report = run_rows(&rows);
    assert_eq!(report.failures.len(), 1);
    assert!(report.failures[0].starts_with("golden_en_us_plain_bad"));
}

#[test]
fn unit_text_goldenrunner_perclassreport_countsprinted() {
    let rows = vec![
        row("golden_hi_plain_a", "hi", "plain", "नमस्ते।", "नमस्ते।"),
        row("golden_en_in_plain_b", "en-IN", "plain", "Hi.", "Hi."),
        row("golden_en_in_x_c", "en-IN", "x", "Hi.", "Bye."),
    ];
    let report = run_rows(&rows);
    assert_eq!(
        report.per_class["plain"],
        ClassCount {
            passed: 2,
            total: 2
        }
    );
    assert_eq!(
        report.per_class["x"],
        ClassCount {
            passed: 0,
            total: 1
        }
    );
    let s = report.summary();
    assert!(s.contains("plain      2/2"), "{s}");
    assert!(s.contains("x          0/1"), "{s}");
    assert!(s.contains("total      2/3"), "{s}");
}

#[test]
fn unit_text_goldenrunner_badrows_rejected() {
    assert!(parse_tsv("a.tsv", "wrong\theader\n").is_err());
    assert!(parse_tsv("a.tsv", &format!("{HEADER}\nonly\tthree\tcols\n")).is_err());
    let dup = vec![
        row("golden_hi_plain_a", "hi", "plain", "x", "x"),
        row("golden_hi_plain_a", "hi", "plain", "y", "y"),
    ];
    assert!(validate(&dup).unwrap_err().contains("duplicate"));
    let bad_prefix = vec![row("golden_en_plain_a", "en-IN", "plain", "x", "x")];
    assert!(validate(&bad_prefix)
        .unwrap_err()
        .contains("must start with"));
    let bad_lang = vec![row("golden_fr_plain_a", "fr", "plain", "x", "x")];
    assert!(validate(&bad_lang).is_err());
}
