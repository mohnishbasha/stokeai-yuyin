//! Per-tenant term overrides (owner: S1-T07).
//!
//! The gateway loads `lexicon_entries` for the caller's organisation and passes a
//! [`TenantLexicon`] in [`crate::NormaliseOptions::tenant_lexicon`]. This crate never reads it
//! from storage. Limits are PRD FR-010. S1-T07 owns the tests and may refine this type.

use std::collections::BTreeMap;

use crate::{Lang, TextError};

/// Maximum entries per organisation (PRD FR-010).
pub const MAX_TENANT_ENTRIES: usize = 500;
/// Maximum term length in code points (PRD FR-010).
pub const MAX_TERM_CHARS: usize = 64;
/// Maximum spoken form length in code points (PRD FR-010).
pub const MAX_SPOKEN_CHARS: usize = 256;

/// One override.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TenantEntry {
    /// What to say instead of the term.
    pub spoken_form: String,
    /// The context language this applies to, or `None` for every language.
    pub lang: Option<Lang>,
}

/// Overrides for one organisation, keyed by exact term and language.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct TenantLexicon {
    entries: BTreeMap<(String, Option<Lang>), TenantEntry>,
}

impl TenantLexicon {
    /// An empty lexicon.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Adds or replaces an override.
    ///
    /// # Errors
    ///
    /// [`TextError::TenantEntryInvalid`] for an empty or too long term or spoken form,
    /// [`TextError::TenantLexiconFull`] when a new entry would exceed [`MAX_TENANT_ENTRIES`].
    ///
    /// # Examples
    ///
    /// ```
    /// use yuyin_text::{Lang, TenantLexicon};
    /// let mut lex = TenantLexicon::new();
    /// lex.insert("EMI", "ee em aai", Some(Lang::En)).unwrap();
    /// lex.insert("EMI", "ई एम आई", Some(Lang::Hi)).unwrap();
    /// assert_eq!(lex.get("EMI", Lang::Hi).unwrap().spoken_form, "ई एम आई");
    /// assert_eq!(lex.get("EMI", Lang::En).unwrap().spoken_form, "ee em aai");
    /// ```
    pub fn insert(
        &mut self,
        term: &str,
        spoken_form: &str,
        lang: Option<Lang>,
    ) -> Result<(), TextError> {
        let term_chars = term.chars().count();
        let spoken_chars = spoken_form.chars().count();
        if term_chars == 0 || term_chars > MAX_TERM_CHARS {
            return Err(TextError::TenantEntryInvalid(
                "term must be 1 to 64 code points",
            ));
        }
        if spoken_chars == 0 || spoken_chars > MAX_SPOKEN_CHARS {
            return Err(TextError::TenantEntryInvalid(
                "spoken form must be 1 to 256 code points",
            ));
        }
        let key = (term.to_owned(), lang);
        if !self.entries.contains_key(&key) && self.entries.len() >= MAX_TENANT_ENTRIES {
            return Err(TextError::TenantLexiconFull {
                max: MAX_TENANT_ENTRIES,
            });
        }
        self.entries.insert(
            key,
            TenantEntry {
                spoken_form: spoken_form.to_owned(),
                lang,
            },
        );
        Ok(())
    }

    /// The override for `term` in context language `lang`. A language-specific entry wins
    /// over an entry for every language.
    ///
    /// # Examples
    ///
    /// ```
    /// use yuyin_text::{Lang, TenantLexicon};
    /// let mut lex = TenantLexicon::new();
    /// lex.insert("SIP", "सिप", None).unwrap();
    /// assert_eq!(lex.get("SIP", Lang::Hi).unwrap().spoken_form, "सिप");
    /// assert!(lex.get("FD", Lang::En).is_none());
    /// ```
    #[must_use]
    pub fn get(&self, term: &str, lang: Lang) -> Option<&TenantEntry> {
        self.entries
            .get(&(term.to_owned(), Some(lang)))
            .or_else(|| self.entries.get(&(term.to_owned(), None)))
    }

    /// Number of entries.
    #[must_use]
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// True if there are no entries.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tenant_insert_validates_lengths() {
        let mut lex = TenantLexicon::new();
        assert!(lex.insert("", "x", None).is_err());
        assert!(lex.insert("x", "", None).is_err());
        assert!(lex.insert(&"a".repeat(65), "x", None).is_err());
        assert!(lex.insert("x", &"a".repeat(257), None).is_err());
        assert!(lex.is_empty());
    }

    #[test]
    fn test_tenant_get_prefers_language_specific_entry() {
        let mut lex = TenantLexicon::new();
        lex.insert("SIP", "sip", None).unwrap();
        lex.insert("SIP", "सिप", Some(Lang::Hi)).unwrap();
        assert_eq!(lex.get("SIP", Lang::Hi).unwrap().spoken_form, "सिप");
        assert_eq!(lex.get("SIP", Lang::En).unwrap().spoken_form, "sip");
        assert!(lex.get("FD", Lang::En).is_none());
        assert_eq!(lex.len(), 2);
    }

    #[test]
    fn test_tenant_cap_rejects_new_entry_but_allows_replace() {
        let mut lex = TenantLexicon::new();
        for i in 0..MAX_TENANT_ENTRIES {
            lex.insert(&format!("T{i}"), "x", None).unwrap();
        }
        assert_eq!(
            lex.insert("NEW", "x", None),
            Err(TextError::TenantLexiconFull { max: 500 })
        );
        assert!(lex.insert("T0", "y", None).is_ok());
    }
}
