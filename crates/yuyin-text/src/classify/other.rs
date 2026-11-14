//! Percent, unit, range, email, and URL detection (owner: S1-T08).
//!
//! Stubs: every detector returns `None` until S1-T08 lands. Spoken forms are in
//! [`crate::verbalise::other`]. Golden rows: `golden/other.tsv` (classes `percent`, `unit`,
//! `range`, `email`, `url`).

use super::number::NumberValue;
use super::{ClassifyCtx, Detection, Semiotic};

/// A parsed percentage.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Percent {
    /// The number before `%`.
    pub value: NumberValue,
}

/// A parsed quantity with a unit.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Unit {
    /// The quantity.
    pub value: NumberValue,
    /// The unit as written, for example `"km"`, `"Mbps"`.
    pub unit: String,
}

/// A parsed email address.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Email {
    /// The part before `@`.
    pub local: String,
    /// The part after `@`.
    pub domain: String,
}

/// A parsed URL.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Url {
    /// The URL as written.
    pub raw: String,
}

/// A parsed range, for example `10-15` or `$5-$10`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Range {
    /// The lower end.
    pub start: Box<Semiotic>,
    /// The upper end.
    pub end: Box<Semiotic>,
}

/// Detects an email address starting at token `at`.
///
/// Stub: always `None`.
#[must_use]
pub fn detect_email(_ctx: &ClassifyCtx<'_>, _at: usize) -> Option<Detection> {
    None
}

/// Detects a URL starting at token `at`.
///
/// Stub: always `None`.
#[must_use]
pub fn detect_url(_ctx: &ClassifyCtx<'_>, _at: usize) -> Option<Detection> {
    None
}

/// Detects a range starting at token `at`. May call the money and number detectors for
/// its ends.
///
/// Stub: always `None`.
#[must_use]
pub fn detect_range(_ctx: &ClassifyCtx<'_>, _at: usize) -> Option<Detection> {
    None
}

/// Detects a percentage starting at token `at`.
///
/// Stub: always `None`.
#[must_use]
pub fn detect_percent(_ctx: &ClassifyCtx<'_>, _at: usize) -> Option<Detection> {
    None
}

/// Detects a quantity with a unit starting at token `at`.
///
/// Stub: always `None`.
#[must_use]
pub fn detect_unit(_ctx: &ClassifyCtx<'_>, _at: usize) -> Option<Detection> {
    None
}

#[cfg(test)]
mod tests {
    use super::super::testutil::Fixture;
    use super::*;
    use crate::LanguageHint;

    #[test]
    fn test_other_detect_stubs_find_nothing() {
        let f = Fixture::new(
            "Mail help@example.com or see https://example.com. ब्याज 8.5% है, 5 km, 10-15 दिन।",
            LanguageHint::Auto,
        );
        for detect in [
            detect_email,
            detect_url,
            detect_range,
            detect_percent,
            detect_unit,
        ] {
            assert_eq!(f.first(detect), None);
        }
    }
}
