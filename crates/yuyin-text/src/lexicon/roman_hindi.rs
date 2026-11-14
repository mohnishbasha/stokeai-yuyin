//! Roman-script Hindi word forms used by the tagger (owner: S1-T02).
//!
//! S1-T02 fills `data/roman_hindi_lexicon.tsv` (at least 20,000 forms, licence recorded) and
//! may change the representation here, for example to add frequencies for the n-gram scorer.

use std::collections::BTreeSet;

const DATA: &str = include_str!("../../data/roman_hindi_lexicon.tsv");
const COLUMNS: usize = 2;

/// Lowercase Roman Hindi word forms.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct RomanHindiLexicon {
    words: BTreeSet<String>,
}

impl RomanHindiLexicon {
    /// Parses the embedded data file (columns `roman`, `devanagari`).
    #[must_use]
    pub fn builtin() -> Self {
        Self::from_tsv(DATA)
    }

    /// Parses TSV text with a header row and the columns `roman`, `devanagari`.
    ///
    /// # Examples
    ///
    /// ```
    /// use yuyin_text::lexicon::RomanHindiLexicon;
    /// let lex = RomanHindiLexicon::from_tsv("roman\tdevanagari\nnamaste\tनमस्ते\n");
    /// assert!(lex.contains("Namaste"));
    /// assert!(!lex.contains("hello"));
    /// ```
    #[must_use]
    pub fn from_tsv(src: &str) -> Self {
        let words = super::tsv_rows(src, COLUMNS)
            .filter_map(|row| row.first().map(|w| w.to_lowercase()))
            .collect();
        Self { words }
    }

    /// True if the word (compared in lowercase) is a known Roman Hindi form.
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
    fn test_roman_hindi_data_has_no_malformed_rows() {
        assert_eq!(
            super::super::malformed_lines(DATA, COLUMNS),
            Vec::<usize>::new()
        );
        let lex = RomanHindiLexicon::builtin();
        assert!(lex.len() <= super::super::tsv_rows(DATA, COLUMNS).count());
        assert_eq!(
            lex.is_empty(),
            super::super::tsv_rows(DATA, COLUMNS).next().is_none()
        );
    }

    #[test]
    fn test_roman_hindi_from_tsv_lowercases() {
        let lex = RomanHindiLexicon::from_tsv("roman\tdevanagari\nAapka\tआपका\n");
        assert!(lex.contains("aapka"));
        assert!(lex.contains("AAPKA"));
        assert_eq!(lex.len(), 1);
    }
}
