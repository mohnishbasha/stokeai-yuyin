//! Phone numbers and digit-by-digit strings (owner: S1-T06).
//!
//! Stub: [`detect`] returns `None` until S1-T06 lands. Spoken forms are in
//! [`crate::verbalise::digits`]. Golden rows: `golden/digits.tsv` (classes `phone`, `otp`).
//! Fixtures must use fictitious numbers only (AGENTS.md).

use super::{ClassifyCtx, Detection};

/// A parsed phone number.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Phone {
    /// Country code digits without `+`, for example `"91"`, if written.
    pub country_code: Option<String>,
    /// The remaining digits, without separators.
    pub digits: String,
}

/// What kind of digit string this is. The verbaliser may group digits by kind.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum DigitStringKind {
    /// One-time password.
    Otp,
    /// PIN.
    Pin,
    /// Indian postal PIN code.
    PostalPin,
    /// Last digits of a card.
    CardTail,
    /// Last digits of an account.
    AccountTail,
    /// PAN-like or Aadhaar-like identifier.
    IdLike,
    /// Any other long digit string read digit by digit.
    Long,
}

/// A string read digit by digit.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DigitString {
    /// The kind, from trigger words around the span.
    pub kind: DigitStringKind,
    /// The characters to read, without separators. May contain letters for ID-like strings.
    pub digits: String,
}

/// Detects a phone number or digit string starting at token `at`.
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
    fn test_digits_detect_stub_finds_nothing() {
        let f = Fixture::new("Your OTP is 000000. कोड 1234 है।", LanguageHint::Auto);
        assert_eq!(f.first(detect), None);
    }
}
