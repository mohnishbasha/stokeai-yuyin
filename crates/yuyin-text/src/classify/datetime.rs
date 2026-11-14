//! Date and time detection (owner: S1-T05).
//!
//! Stub: [`detect`] returns `None` until S1-T05 lands. Spoken forms are in
//! [`crate::verbalise::datetime`]. Golden rows: `golden/datetime.tsv` (classes `date`, `time`).
//! Numeric dates are day first for `en-IN`, `hi`, and `hinglish`, month first for `en-US`
//! (read [`ClassifyCtx::locale`]).

use super::{ClassifyCtx, Detection};

/// A parsed calendar date. Missing parts are `None` (`March 2026` has no day).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Date {
    /// Day of month, 1 to 31.
    pub day: Option<u8>,
    /// Month, 1 to 12.
    pub month: Option<u8>,
    /// Year, for example 2026.
    pub year: Option<u16>,
}

/// AM or PM.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Meridiem {
    /// Before noon.
    Am,
    /// After noon.
    Pm,
}

/// A parsed clock time.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Time {
    /// Hour as written, 0 to 23.
    pub hour: u8,
    /// Minute, 0 to 59.
    pub minute: u8,
    /// Second, if written.
    pub second: Option<u8>,
    /// AM or PM, if written.
    pub meridiem: Option<Meridiem>,
    /// True if written with an `hrs` suffix (`17:30 hrs`).
    pub hours_suffix: bool,
}

/// Detects a date or time starting at token `at`.
///
/// Stub: always `None`.
#[must_use]
pub fn detect(_ctx: &ClassifyCtx<'_>, _at: usize) -> Option<Detection> {
    None
}

#[cfg(test)]
mod tests {
    use super::super::testutil::Fixture;
    use super::*;
    use crate::LanguageHint;

    #[test]
    fn test_datetime_detect_stub_finds_nothing() {
        let f = Fixture::new("Due 05/12/2026 at 5:30 PM. कल 10 बजे।", LanguageHint::Auto);
        assert_eq!(f.first(detect), None);
    }
}
