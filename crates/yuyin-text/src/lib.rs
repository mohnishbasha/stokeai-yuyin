//! Text front-end: language tagging, normalisation, transliteration, segmentation.
//!
//! Placeholder from Sprint 0. Behaviour arrives in later sprints.

#![forbid(unsafe_code)]

pub mod classify;
pub mod lexicon;
pub mod segment;
pub mod tag;
pub mod translit;
pub mod verbalise;

/// Crate name, used by the scaffold placeholder test.
pub const CRATE_NAME: &str = env!("CARGO_PKG_NAME");

#[cfg(test)]
mod tests {
    use super::CRATE_NAME;

    #[test]
    fn test_scaffold_crate_name_placeholder_matches_package() {
        assert_eq!(CRATE_NAME, "yuyin-text");
    }
}
