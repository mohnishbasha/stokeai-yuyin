//! Acronym detection (owner: S1-T07).
//!
//! Stub: [`detect`] returns `None` until S1-T07 lands. Spoken forms are in
//! [`crate::verbalise::acronym`], which reads [`crate::lexicon::AcronymLexicon`] and the
//! tenant lexicon. Golden rows: `golden/acronym.tsv` (class `acronym`).

use super::{ClassifyCtx, Detection};

/// A detected acronym.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Acronym {
    /// The term as written, for example `"KYC"`.
    pub term: String,
}

/// Detects an acronym starting at token `at`.
///
/// Stub: always `None`.
#[must_use]
pub fn detect(_ctx: &ClassifyCtx<'_>, _at: usize) -> Option<Detection> {
    None
}

#[cfg(test)]
mod tests {
    use super::super::testutil::Fixture;
    use super::*;
    use crate::LanguageHint;

    #[test]
    fn test_acronym_detect_stub_finds_nothing() {
        let f = Fixture::new("Complete your KYC. अपना KYC पूरा करें।", LanguageHint::Auto);
        assert_eq!(f.first(detect), None);
    }
}
