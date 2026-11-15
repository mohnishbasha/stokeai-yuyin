//! Character n-gram scorer for words that no lexicon knows (owner: S1-T02).
//!
//! The model is a table of character trigram log-likelihood ratios, trained offline by
//! `scripts/tagging/build_tagger_data.py` on the Roman Hindi and English lexicons. A word is
//! padded as `^word$`, every trigram is looked up, and the values are summed. Positive totals
//! lean Hindi, negative totals lean English. Unseen trigrams count as zero. Scores are integers
//! in hundredths of a nat, so scoring is exact and identical on every platform.

use std::collections::BTreeMap;

use crate::Lang;

const DATA: &str = include_str!("../../data/tagger_ngram.tsv");
const COLUMNS: usize = 2;

/// Trigram log-likelihood ratios, Hindi versus English.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct NgramScorer {
    llr: BTreeMap<String, i32>,
}

impl NgramScorer {
    /// Parses the embedded model (columns `ngram`, `llr`).
    #[must_use]
    pub fn builtin() -> Self {
        Self::from_tsv(DATA)
    }

    /// Parses TSV text with a header row and the columns `ngram`, `llr`.
    ///
    /// Rows whose score is not an integer are ignored.
    ///
    /// # Examples
    ///
    /// ```
    /// use yuyin_text::lexicon::NgramScorer;
    /// let m = NgramScorer::from_tsv("ngram\tllr\n^ka\t200\nion\t-300\n");
    /// assert_eq!(m.score("kaam"), 200);
    /// assert_eq!(m.score("action"), -300);
    /// ```
    #[must_use]
    pub fn from_tsv(src: &str) -> Self {
        let llr = super::tsv_rows(src, COLUMNS)
            .filter_map(|row| {
                let gram = row.first()?;
                let score = row.get(1)?.parse::<i32>().ok()?;
                Some(((*gram).to_owned(), score))
            })
            .collect();
        Self { llr }
    }

    /// Sum of trigram scores for a word. Zero for an empty model.
    #[must_use]
    pub fn score(&self, word: &str) -> i32 {
        let padded: Vec<char> = std::iter::once('^')
            .chain(word.to_lowercase().chars())
            .chain(std::iter::once('$'))
            .collect();
        padded
            .windows(3)
            .map(|w| {
                let gram: String = w.iter().collect();
                self.llr.get(&gram).copied().unwrap_or(0)
            })
            .sum()
    }

    /// Classifies a word: Hindi when `score + bias` is positive, otherwise English.
    ///
    /// # Examples
    ///
    /// ```
    /// use yuyin_text::lexicon::NgramScorer;
    /// use yuyin_text::Lang;
    /// let m = NgramScorer::from_tsv("ngram\tllr\n^ka\t200\n");
    /// assert_eq!(m.classify("kaam", 0), Lang::Hi);
    /// assert_eq!(m.classify("kaam", -300), Lang::En);
    /// assert_eq!(m.classify("xyz", 0), Lang::En);
    /// ```
    #[must_use]
    pub fn classify(&self, word: &str, bias: i32) -> Lang {
        if self.score(word).saturating_add(bias) > 0 {
            Lang::Hi
        } else {
            Lang::En
        }
    }

    /// Number of trigrams in the model.
    #[must_use]
    pub fn len(&self) -> usize {
        self.llr.len()
    }

    /// True if the model has no trigrams.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.llr.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ngram_data_has_no_malformed_rows() {
        assert_eq!(
            super::super::malformed_lines(DATA, COLUMNS),
            Vec::<usize>::new()
        );
        let m = NgramScorer::builtin();
        assert!(m.len() > 1_000);
        assert!(!m.is_empty());
    }

    #[test]
    fn test_ngram_bad_rows_ignored_and_empty_model_is_neutral() {
        let m = NgramScorer::from_tsv("ngram\tllr\n^ab\tx\n");
        assert!(m.is_empty());
        assert_eq!(m.score("abc"), 0);
        assert_eq!(m.classify("abc", 0), Lang::En);
    }
}
