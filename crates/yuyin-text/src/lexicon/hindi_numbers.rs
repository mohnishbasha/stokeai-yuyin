//! Hindi number words (owner: S1-T03).
//!
//! S1-T03 fills `data/hindi_numbers.tsv`: every value 0 to 99 (irregular, PRD FR-006, so a
//! table and not a rule) plus the scale words (सौ, हज़ार, लाख, करोड़, अरब, खरब). Spellings
//! follow `docs/TEST_PLAN.md` section 5.

use std::collections::BTreeMap;

const DATA: &str = include_str!("../../data/hindi_numbers.tsv");
const COLUMNS: usize = 2;

/// Number value to its Hindi word in Devanagari.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct HindiNumbers {
    words: BTreeMap<u64, String>,
}

impl HindiNumbers {
    /// Parses the embedded data file (columns `number`, `reading`).
    #[must_use]
    pub fn builtin() -> Self {
        Self::from_tsv(DATA)
    }

    /// Parses TSV text with a header row and the columns `number`, `reading`.
    /// Rows whose `number` is not a non-negative integer are skipped.
    ///
    /// # Examples
    ///
    /// ```
    /// use yuyin_text::lexicon::HindiNumbers;
    /// let table = HindiNumbers::from_tsv("number\treading\n25\tपच्चीस\n100000\tलाख\n");
    /// assert_eq!(table.get(25), Some("पच्चीस"));
    /// assert_eq!(table.get(100_000), Some("लाख"));
    /// assert_eq!(table.get(26), None);
    /// ```
    #[must_use]
    pub fn from_tsv(src: &str) -> Self {
        let words = super::tsv_rows(src, COLUMNS)
            .filter_map(|row| match row.as_slice() {
                [n, word] => n.parse::<u64>().ok().map(|n| (n, (*word).to_owned())),
                _ => None,
            })
            .collect();
        Self { words }
    }

    /// The word for `n`, if the table has it.
    #[must_use]
    pub fn get(&self, n: u64) -> Option<&str> {
        self.words.get(&n).map(String::as_str)
    }

    /// Number of entries.
    #[must_use]
    pub fn len(&self) -> usize {
        self.words.len()
    }

    /// True if the table has no entries.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.words.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hindi_numbers_data_has_no_malformed_rows() {
        assert_eq!(
            super::super::malformed_lines(DATA, COLUMNS),
            Vec::<usize>::new()
        );
        let t = HindiNumbers::builtin();
        assert!(t.len() <= super::super::tsv_rows(DATA, COLUMNS).count());
        assert_eq!(
            t.is_empty(),
            super::super::tsv_rows(DATA, COLUMNS).next().is_none()
        );
    }

    #[test]
    fn test_hindi_numbers_skips_non_numeric_keys() {
        let t = HindiNumbers::from_tsv("number\treading\nx\tबुरा\n5\tपाँच\n");
        assert_eq!(t.len(), 1);
        assert_eq!(t.get(5), Some("पाँच"));
    }
}
