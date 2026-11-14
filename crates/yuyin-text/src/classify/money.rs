//! Money detection (owner: S1-T04).
//!
//! Stub: [`detect`] returns `None` until S1-T04 lands. Spoken forms are in
//! [`crate::verbalise::money`]. Golden rows: `golden/money.tsv` (class `money`).

use super::number::NumberValue;
use super::{ClassifyCtx, Detection};

/// A currency.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Currency {
    /// Indian rupee: `₹`, `Rs`, `Rs.`, `INR`.
    Inr,
    /// US dollar: `$`, `USD`.
    Usd,
    /// Euro: `€`, `EUR`.
    Eur,
    /// Pound sterling: `£`, `GBP`.
    Gbp,
}

/// A parsed currency amount.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Money {
    /// The currency.
    pub currency: Currency,
    /// The amount in major units. A decimal amount carries the minor units in its fraction
    /// digits (`₹12.50` is `Decimal { integer: 12, fraction_digits: "50" }`).
    pub amount: NumberValue,
}

/// Detects a currency amount starting at token `at`.
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
    fn test_money_detect_stub_finds_nothing() {
        let f = Fixture::new("Pay ₹4,500 now. आपका बिल ₹4,500 है।", LanguageHint::Auto);
        assert_eq!(f.first(detect), None);
    }
}
