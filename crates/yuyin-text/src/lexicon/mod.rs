//! Built-in lexicons and the per-tenant override lexicon.
//!
//! Each lexicon lives in its own submodule so the task that owns it can change it alone:
//!
//! | Submodule | Data file | Owner task |
//! |---|---|---|
//! | [`roman_hindi`] | `data/roman_hindi_lexicon.tsv` | S1-T02 (tagging) |
//! | [`acronyms`] | `data/acronyms.tsv` | S1-T07 (acronyms) |
//! | [`hindi_numbers`] | `data/hindi_numbers.tsv` | S1-T03 (numbers) |
//! | [`tenant`] | none, passed in by the gateway | S1-T07 (acronyms) |
//!
//! Data files are embedded with `include_str!` and parsed once. The crate does no file I/O.

use std::sync::OnceLock;

pub mod acronyms;
pub mod hindi_numbers;
pub mod roman_hindi;
pub mod tenant;

pub use acronyms::{AcronymEntry, AcronymLexicon};
pub use hindi_numbers::HindiNumbers;
pub use roman_hindi::RomanHindiLexicon;
pub use tenant::{TenantEntry, TenantLexicon};

/// All built-in lexicons, parsed from the embedded data files.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct Lexicons {
    /// Roman-script Hindi word forms for language tagging.
    pub roman_hindi: RomanHindiLexicon,
    /// Acronym readings.
    pub acronyms: AcronymLexicon,
    /// Hindi number words.
    pub hindi_numbers: HindiNumbers,
}

impl Lexicons {
    /// Parses every embedded data file.
    ///
    /// # Examples
    ///
    /// ```
    /// use yuyin_text::Lexicons;
    /// let lex = Lexicons::parse_builtin();
    /// assert_eq!(lex, *Lexicons::builtin());
    /// ```
    #[must_use]
    pub fn parse_builtin() -> Self {
        Self {
            roman_hindi: RomanHindiLexicon::builtin(),
            acronyms: AcronymLexicon::builtin(),
            hindi_numbers: HindiNumbers::builtin(),
        }
    }

    /// A shared, lazily parsed instance of [`Lexicons::parse_builtin`].
    ///
    /// ARCHITECTURE 5 says the crate has no global state. This `OnceLock` is the one
    /// exception and it is safe: the value is immutable, built only from data compiled into
    /// the binary, and identical on every call, so output can never depend on history.
    /// It saves re-parsing about 20,000 lexicon rows per request.
    ///
    /// # Examples
    ///
    /// ```
    /// use yuyin_text::Lexicons;
    /// assert!(std::ptr::eq(Lexicons::builtin(), Lexicons::builtin()));
    /// ```
    #[must_use]
    pub fn builtin() -> &'static Self {
        static BUILTIN: OnceLock<Lexicons> = OnceLock::new();
        BUILTIN.get_or_init(Self::parse_builtin)
    }
}

/// Data rows of an embedded TSV file. The header line, blank lines, and lines starting with
/// `#` are skipped. Only rows with exactly `columns` tab-separated fields are returned.
pub(crate) fn tsv_rows(src: &str, columns: usize) -> impl Iterator<Item = Vec<&str>> {
    data_lines(src)
        .map(|(_, line)| line.split('\t').collect::<Vec<_>>())
        .filter(move |fields| fields.len() == columns)
}

/// 1-based line numbers of data rows that do not have exactly `columns` fields.
/// Each lexicon has a test asserting this is empty, so a bad row is never dropped silently.
#[cfg(test)]
pub(crate) fn malformed_lines(src: &str, columns: usize) -> Vec<usize> {
    data_lines(src)
        .filter(|(_, line)| line.split('\t').count() != columns)
        .map(|(n, _)| n)
        .collect()
}

fn data_lines(src: &str) -> impl Iterator<Item = (usize, &str)> {
    src.lines()
        .enumerate()
        .skip(1)
        .map(|(i, line)| (i + 1, line.trim_end_matches('\r')))
        .filter(|(_, line)| !line.trim().is_empty() && !line.starts_with('#'))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tsv_rows_skips_header_comments_and_bad_rows() {
        let src = "a\tb\nx\ty\n# note\n\nonly-one\np\tq\r\n";
        let rows: Vec<Vec<&str>> = tsv_rows(src, 2).collect();
        assert_eq!(rows, vec![vec!["x", "y"], vec!["p", "q"]]);
        assert_eq!(malformed_lines(src, 2), vec![5]);
    }

    #[test]
    fn test_lexicons_builtin_is_shared_and_equal_to_parse() {
        assert!(std::ptr::eq(Lexicons::builtin(), Lexicons::builtin()));
        assert_eq!(*Lexicons::builtin(), Lexicons::parse_builtin());
    }
}
