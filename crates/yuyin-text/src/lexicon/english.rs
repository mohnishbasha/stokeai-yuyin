//! English word forms used by the tagger (owner: S1-T02).
//!
//! The list is first-party vocabulary written for this project (see
//! `scripts/tagging/english_seed.txt`). It lets the tagger tell English words from Roman Hindi
//! words that share a spelling, and it is the English side of the n-gram training data.

use std::collections::BTreeSet;

const DATA: &str = include_str!("../../data/english_lexicon.txt");
const COLUMNS: usize = 1;

/// Lowercase English word forms.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct EnglishLexicon {
    words: BTreeSet<String>,
}

impl EnglishLexicon {
    /// Parses the embedded data file (one column, `word`).
    #[must_use]
    pub fn builtin() -> Self {
        Self::from_tsv(DATA)
    }

    /// Parses text with a header row and one word per line.
    ///
    /// # Examples
    ///
    /// ```
    /// use yuyin_text::lexicon::EnglishLexicon;
    /// let lex = EnglishLexicon::from_tsv("word\nbalance\n");
    /// assert!(lex.contains("Balance"));
    /// assert!(!lex.contains("aapka"));
    /// ```
    #[must_use]
    pub fn from_tsv(src: &str) -> Self {
        let words = super::tsv_rows(src, COLUMNS)
            .filter_map(|row| row.first().map(|w| w.to_lowercase()))
            .collect();
        Self { words }
    }

    /// True if the word (compared in lowercase) is a known English form.
    #[must_use]
    pub fn contains(&self, word: &str) -> bool {
        self.words.contains(&word.to_lowercase())
    }

    /// Number of word forms.
    #[must_use]
    pub fn len(&self) -> usize {
        self.words.len()
    }

    /// True if the lexicon has no entries.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.words.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_english_data_has_no_malformed_rows() {
        assert_eq!(
            super::super::malformed_lines(DATA, COLUMNS),
            Vec::<usize>::new()
        );
        let lex = EnglishLexicon::builtin();
        assert!(lex.len() >= 1_000);
        assert!(!lex.is_empty());
        assert!(lex.contains("account"));
    }

    #[test]
    fn test_english_from_tsv_lowercases_and_skips_comments() {
        let lex = EnglishLexicon::from_tsv("word\n# note\nOrder\n");
        assert!(lex.contains("ORDER"));
        assert_eq!(lex.len(), 1);
        assert!(EnglishLexicon::default().is_empty());
    }
}
