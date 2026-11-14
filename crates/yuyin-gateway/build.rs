//! Exposes the commit to the binary as `YUYIN_GIT_SHA` for `--version`.
//! CI and the image build pass it in; local builds fall back to "unknown".

// Cargo reads build script directives from stdout.
#![allow(clippy::print_stdout)]

fn main() {
    let sha = std::env::var("YUYIN_GIT_SHA").unwrap_or_else(|_| "unknown".to_owned());
    println!("cargo:rerun-if-env-changed=YUYIN_GIT_SHA");
    println!("cargo:rustc-env=YUYIN_GIT_SHA={sha}");
}
