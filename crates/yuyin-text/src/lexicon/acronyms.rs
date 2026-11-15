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

    /// Minimum built-in entries (`SPRINT_PLAN` S1-T07, `TEST_PLAN` NM-ACR-03).
    const MIN_ENTRIES: usize = 300;

    #[test]
    fn unit_text_acronym_lexicon_has_at_least_300_entries() {
        let lex = AcronymLexicon::builtin();
        assert!(lex.len() >= MIN_ENTRIES, "only {} entries", lex.len());
        // Every domain is represented.
        for term in [
            "NEFT", "RBI", "GSTIN", "LIC", "IRDAI", "TPA", "IMEI", "TRAI", "BSNL", "UIDAI",
            "AADHAAR", "RTI",
        ] {
            assert!(lex.get(term).is_some(), "{term}");
        }
    }

    #[test]
    fn unit_text_acronym_listed_set_all_present() {
        let lex = AcronymLexicon::builtin();
        // PRD FR-010 initial entries plus the ones the issue names.
        for term in [
            "EMI", "KYC", "UPI", "PAN", "IFSC", "NEFT", "RTGS", "IMPS", "GST", "ATM", "OTP", "SMS",
            "PIN", "FD", "RD", "SIP", "AMC", "NRI", "TDS", "LIC", "SIM", "NASA",
        ] {
            assert!(lex.get(term).is_some(), "{term}");
        }
    }

    #[test]
    fn unit_text_acronyms_currencyunit_codes_notlexicon() {
        let lex = AcronymLexicon::builtin();
        for term in ["INR", "USD", "EUR", "GB", "KM", "MB", "KG", "MBPS"] {
            assert!(lex.get(term).is_none(), "{term}");
        }
    }

    #[test]
    fn test_acronym_data_readings_are_well_formed() {
        for row in super::super::tsv_rows(DATA, COLUMNS) {
            let [term, en, hi] = row.as_slice() else {
                continue;
            };
            assert!(
                term.chars().all(|c| c.is_ascii_uppercase()) && !term.is_empty(),
                "{term}"
            );
            assert!(!en.is_empty() && !hi.is_empty(), "{term}");
            assert!(
                hi.chars()
                    .all(|c| c == ' ' || ('\u{0900}'..='\u{097F}').contains(&c)),
                "{term}: Hindi reading must be Devanagari"
            );
            assert!(!en.contains('\u{2014}') && !hi.contains('\u{2014}'));
        }
        // No duplicate terms.
        let rows = super::super::tsv_rows(DATA, COLUMNS).count();
        assert_eq!(AcronymLexicon::builtin().len(), rows);
    }
}
