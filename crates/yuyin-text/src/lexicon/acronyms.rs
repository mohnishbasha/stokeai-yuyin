//! Built-in acronym readings (owner: S1-T07).
//!
//! S1-T07 fills `data/acronyms.tsv` (at least 300 entries) and may extend [`AcronymEntry`].
//! Convention (`docs/TEST_PLAN.md` section 5): `reading_en` spells letters as capitals separated
//! by spaces ("K Y C"); `reading_hi` is Devanagari ("के वाई सी"). A word reading is written
//! as the word ("pan" in English, "पैन" in Hindi).

use std::collections::BTreeMap;

const DATA: &str = include_str!("../../data/acronyms.tsv");
const COLUMNS: usize = 3;

/// Spoken forms of one acronym.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AcronymEntry {
    /// Reading in an English context.
    pub reading_en: String,
    /// Reading in a Hindi context, in Devanagari.
    pub reading_hi: String,
}

/// Acronym to reading, keyed by the exact (case-sensitive) term.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct AcronymLexicon {
    entries: BTreeMap<String, AcronymEntry>,
}

impl AcronymLexicon {
    /// Parses the embedded data file (columns `acronym`, `reading_en`, `reading_hi`).
    #[must_use]
    pub fn builtin() -> Self {
        Self::from_tsv(DATA)
    }

    /// Parses TSV text with a header row and the columns `acronym`, `reading_en`, `reading_hi`.
    ///
    /// # Examples
    ///
    /// ```
    /// use yuyin_text::lexicon::AcronymLexicon;
    /// let lex = AcronymLexicon::from_tsv("acronym\treading_en\treading_hi\nKYC\tK Y C\tके वाई सी\n");
    /// let kyc = lex.get("KYC").unwrap();
    /// assert_eq!(kyc.reading_en, "K Y C");
    /// assert_eq!(kyc.reading_hi, "के वाई सी");
    /// ```
    #[must_use]
    pub fn from_tsv(src: &str) -> Self {
        let entries = super::tsv_rows(src, COLUMNS)
            .filter_map(|row| match row.as_slice() {
                [term, en, hi] => Some((
                    (*term).to_owned(),
                    AcronymEntry {
                        reading_en: (*en).to_owned(),
                        reading_hi: (*hi).to_owned(),
                    },
                )),
                _ => None,
            })
            .collect();
        Self { entries }
    }

    /// The entry for `term`, if any.
    #[must_use]
    pub fn get(&self, term: &str) -> Option<&AcronymEntry> {
        self.entries.get(term)
    }

    /// Number of entries.
    #[must_use]
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// True if the lexicon has no entries.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_acronym_data_has_no_malformed_rows() {
        assert_eq!(
            super::super::malformed_lines(DATA, COLUMNS),
            Vec::<usize>::new()
        );
        let lex = AcronymLexicon::builtin();
        assert!(lex.len() <= super::super::tsv_rows(DATA, COLUMNS).count());
        assert_eq!(
            lex.is_empty(),
            super::super::tsv_rows(DATA, COLUMNS).next().is_none()
        );
    }

    #[test]
    fn test_acronym_from_tsv_lookup_is_exact() {
        let lex = AcronymLexicon::from_tsv("h\th\th\nPAN\tpan\tपैन\n");
        assert_eq!(lex.get("PAN").map(|e| e.reading_hi.as_str()), Some("पैन"));
        assert!(lex.get("pan").is_none());
        assert_eq!(lex.len(), 1);
    }
}
