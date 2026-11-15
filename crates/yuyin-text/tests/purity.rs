//! Purity check for `yuyin-text` (Sprint 1 gate, ARCHITECTURE section 5).
//!
//! The crate does no network or file I/O, no process or environment access, no clock, and no
//! randomness. Two checks enforce it: the dependency list is an allowlist, and the source tree
//! is scanned for forbidden paths. Data files are embedded with `include_str!` at build time.

// Test harness code outside `#[test]` functions: clippy's in-test allowances do not reach it.
#![allow(clippy::expect_used, clippy::panic, clippy::print_stdout)]

use std::fs;
use std::path::{Path, PathBuf};

/// Runtime dependencies allowed in `[dependencies]`. Adding one needs a review of what it can
/// reach: none of these does I/O.
const ALLOWED_DEPS: &[&str] = &["thiserror", "unicode-normalization", "unicode-segmentation"];

/// Source fragments that mean I/O, a clock, randomness, or async. `env!` and `include_str!`
/// are compile-time and allowed.
const FORBIDDEN: &[&str] = &[
    "std::fs",
    "std::net",
    "std::io",
    "std::process",
    "std::env",
    "std::time",
    "std::thread",
    "File::",
    "TcpStream",
    "UdpSocket",
    "tokio",
    "async fn",
    "rand::",
    "SystemTime",
    "Instant::",
];

fn crate_dir() -> &'static Path {
    Path::new(env!("CARGO_MANIFEST_DIR"))
}

/// Names under `[dependencies]` in a Cargo manifest (not dev or build dependencies).
fn runtime_deps(manifest: &str) -> Vec<String> {
    let mut in_deps = false;
    let mut deps = Vec::new();
    for line in manifest.lines().map(str::trim) {
        if line.starts_with('[') {
            in_deps = line == "[dependencies]";
            continue;
        }
        if !in_deps || line.is_empty() || line.starts_with('#') {
            continue;
        }
        if let Some((name, _)) = line.split_once('=') {
            deps.push(name.trim().to_owned());
        }
    }
    deps
}

fn rust_files(dir: &Path, out: &mut Vec<PathBuf>) {
    for entry in fs::read_dir(dir).expect("readable dir") {
        let path = entry.expect("readable entry").path();
        if path.is_dir() {
            rust_files(&path, out);
        } else if path.extension().is_some_and(|x| x == "rs") {
            out.push(path);
        }
    }
}

/// Lines in `src` containing a forbidden fragment, ignoring `//` comments.
fn violations(name: &str, src: &str) -> Vec<String> {
    src.lines()
        .enumerate()
        .filter_map(|(i, line)| {
            let code = line.split("//").next().unwrap_or("");
            FORBIDDEN
                .iter()
                .find(|f| code.contains(*f))
                .map(|f| format!("{name}:{}: `{f}`", i + 1))
        })
        .collect()
}

#[test]
fn unit_text_purity_dependencies_allowlisted() {
    let manifest = fs::read_to_string(crate_dir().join("Cargo.toml")).expect("manifest");
    let extra: Vec<String> = runtime_deps(&manifest)
        .into_iter()
        .filter(|d| !ALLOWED_DEPS.contains(&d.as_str()))
        .collect();
    assert!(
        extra.is_empty(),
        "dependencies outside the allowlist: {extra:?}"
    );
}

#[test]
fn unit_text_purity_source_noio() {
    let mut files = Vec::new();
    rust_files(&crate_dir().join("src"), &mut files);
    assert_ne!(files.len(), 0);
    let found: Vec<String> = files
        .iter()
        .flat_map(|p| {
            let src = fs::read_to_string(p).expect("readable source");
            violations(&p.display().to_string(), &src)
        })
        .collect();
    assert!(
        found.is_empty(),
        "I/O or clock use in yuyin-text:\n{}",
        found.join("\n")
    );
}

#[test]
fn unit_text_purity_checker_detects_violations() {
    let manifest = "[dependencies]\nthiserror = { workspace = true }\nreqwest = \"0.12\"\n\n[dev-dependencies]\nproptest = \"1\"\n";
    assert_eq!(runtime_deps(manifest), vec!["thiserror", "reqwest"]);
    assert_eq!(violations("a.rs", "use std::fs::File;\n").len(), 1);
    assert_eq!(
        violations("a.rs", "let n = std::net::TcpStream::connect(x);\n").len(),
        1
    );
    assert_eq!(
        violations("a.rs", "// std::fs is mentioned in a comment\n").len(),
        0
    );
    assert_eq!(
        violations("a.rs", "const D: &str = include_str!(\"../data/x.tsv\");\n").len(),
        0
    );
}
