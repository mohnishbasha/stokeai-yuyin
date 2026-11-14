//! Number detection: cardinal, ordinal, decimal, negative, fraction (owner: S1-T03).
//!
//! Stub: [`detect`] returns `None` until S1-T03 lands. Spoken forms are in
//! [`crate::verbalise::number`]. Golden rows: `golden/numbers.tsv` (classes `cardinal`,
//! `ordinal`).

use super::{ClassifyCtx, Detection};

/// A parsed cardinal number.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum NumberValue {
    /// Whole number, for example `1,25,000` or `-5`.
    Integer {
        /// True for a leading minus sign.
        negative: bool,
        /// Absolute value. `u64` covers 10^15 (खरब) and beyond.
        value: u64,
    },
    /// Decimal number, for example `3.14`.
    Decimal {
        /// True for a leading minus sign.
        negative: bool,
        /// The part before the decimal point.
        integer: u64,
        /// The digits after the decimal point, as written (`"05"` in `1.05`). Read digit by digit.
        fraction_digits: String,
    },
    /// Fraction, for example `3/4`.
    Fraction {
        /// True for a leading minus sign.
        negative: bool,
        /// Top part.
        numerator: u64,
        /// Bottom part, never zero.
        denominator: u64,
    },
}

/// A parsed ordinal, for example `3rd` or `21st`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Ordinal {
    /// The number, `3` for `3rd`.
    pub value: u64,
}

/// Detects a cardinal or ordinal number starting at token `at`.
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
    fn test_number_detect_stub_finds_nothing() {
        let f = Fixture::new("कुल 1,25,000 और 3rd", LanguageHint::Hi);
        assert_eq!(f.first(detect), None);
    }
}
