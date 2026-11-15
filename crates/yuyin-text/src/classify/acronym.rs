//! Acronym detection (owner: S1-T07, PRD FR-010).
//!
//! A word token is an acronym when, in order of precedence:
//!
//! 1. the tenant lexicon has an override for it in the context language, or
//! 2. the built-in lexicon (`data/acronyms.tsv`) has an entry for it, or
//! 3. it is all ASCII capitals, 2 to 5 letters long (spelled letter by letter).
//!
//! Spoken forms are in [`crate::verbalise::acronym`]. Detection runs last in
//! [`super::DETECTORS`], so numbers, money (`INR 500`), and units (`5 GB`) are claimed by their
//! own classes first. Golden rows: `golden/acronym.tsv` (class `acronym`).

use super::{ClassifyCtx, Detection, Semiotic};
use crate::SpanKind;

/// Shortest all-caps token spelled by default (PRD FR-010, `SPRINT_PLAN` S1-T07).
pub const MIN_UNKNOWN_LETTERS: usize = 2;
/// Longest all-caps token spelled by default (PRD FR-010, `SPRINT_PLAN` S1-T07).
pub const MAX_UNKNOWN_LETTERS: usize = 5;

/// A detected acronym.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Acronym {
    /// The term as written, for example `"KYC"`.
    pub term: String,
}

/// True for an unknown-acronym candidate: 2 to 5 ASCII capital letters.
///
/// # Examples
///
/// ```
/// use yuyin_text::classify::acronym::is_spellable_caps;
/// // English context: "XYZ" is spelled "X Y Z". Hindi context: "एक्स वाई ज़ेड".
/// assert!(is_spellable_caps("XYZ"));
/// assert!(!is_spellable_caps("Xyz"));
/// assert!(!is_spellable_caps("X"));
/// ```
#[must_use]
pub fn is_spellable_caps(term: &str) -> bool {
    let n = term.chars().count();
    (MIN_UNKNOWN_LETTERS..=MAX_UNKNOWN_LETTERS).contains(&n)
        && term.chars().all(|c| c.is_ascii_uppercase())
}

/// Detects an acronym starting at token `at`. The span is that one token.
///
/// # Examples
///
/// ```
/// use yuyin_text::{normalise_to_string, LanguageHint, NormaliseOptions};
/// let en = normalise_to_string("Complete your KYC", &NormaliseOptions::new(LanguageHint::EnIn)).unwrap();
/// assert_eq!(en, "Complete your K Y C");
/// let hi = normalise_to_string("अपना KYC पूरा करें", &NormaliseOptions::new(LanguageHint::Hi)).unwrap();
/// assert_eq!(hi, "अपना के वाई सी पूरा करें");
/// ```
#[must_use]
pub fn detect(ctx: &ClassifyCtx<'_>, at: usize) -> Option<Detection> {
    if ctx.kind(at) != Some(SpanKind::Word) {
        return None;
    }
    let term = ctx.token_text(at);
    let lang = ctx.context_lang(at);
    let wanted = ctx.tenant.is_some_and(|t| t.get(term, lang).is_some())
        || ctx.lexicons.acronyms.get(term).is_some()
        || is_spellable_caps(term);
    wanted.then(|| Detection {
        end: at + 1,
        value: Semiotic::Acronym(Acronym {
            term: term.to_owned(),
        }),
    })
}

#[cfg(test)]
mod tests {
    use super::super::testutil::Fixture;
    use super::*;
    use crate::{Lang, LanguageHint, TenantLexicon};

    fn found(text: &str, hint: LanguageHint) -> Option<String> {
        let f = Fixture::new(text, hint);
        f.first(detect).and_then(|(_, d)| match d.value {
            Semiotic::Acronym(a) => Some(a.term),
            _ => None,
        })
    }

    #[test]
    fn test_acronym_detect_lexicon_term_in_english_and_hindi() {
        assert_eq!(
            found("Complete your KYC today", LanguageHint::EnIn).as_deref(),
            Some("KYC")
        );
        assert_eq!(
            found("अपना KYC पूरा करें।", LanguageHint::Hi).as_deref(),
            Some("KYC")
        );
    }

    #[test]
    fn test_acronym_detect_unknown_caps_two_to_five_only() {
        for t in ["QZ", "QZX", "QZXW", "QZXWV"] {
            assert_eq!(found(t, LanguageHint::EnUs).as_deref(), Some(t));
        }
        for t in ["Q", "QZXWVU", "Qzx", "qzx", "Q1Z"] {
            assert_eq!(found(t, LanguageHint::EnUs), None, "{t}");
        }
    }

    #[test]
    fn test_acronym_detect_ignores_non_words_and_out_of_range() {
        let f = Fixture::new("KYC 12 .", LanguageHint::EnIn);
        let ctx = f.ctx();
        assert!(detect(&ctx, 1).is_none());
        assert!(detect(&ctx, 2).is_none());
        assert!(detect(&ctx, 4).is_none());
        assert!(detect(&ctx, 99).is_none());
        assert_eq!(detect(&ctx, 0).map(|d| d.end), Some(1));
    }

    #[test]
    fn test_acronym_detect_tenant_term_is_detected_even_if_not_caps() {
        let f = Fixture::new("Visit Acme today", LanguageHint::EnIn);
        let mut ctx = f.ctx();
        assert!(f.first(detect).is_none());
        let mut lex = TenantLexicon::new();
        lex.insert("Acme", "ack me", Some(Lang::En)).unwrap();
        ctx.tenant = Some(&lex);
        let hit = (0..ctx.len()).find(|&i| detect(&ctx, i).is_some());
        assert_eq!(hit.map(|i| ctx.token_text(i)), Some("Acme"));
    }

    #[test]
    fn test_acronym_detect_tenant_entry_for_other_language_is_not_used() {
        let f = Fixture::new("Visit Acme today", LanguageHint::EnIn);
        let mut ctx = f.ctx();
        let mut lex = TenantLexicon::new();
        lex.insert("Acme", "एक्मी", Some(Lang::Hi)).unwrap();
        ctx.tenant = Some(&lex);
        assert!((0..ctx.len()).all(|i| detect(&ctx, i).is_none()));
    }
}
