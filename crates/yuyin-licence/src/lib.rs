//! Self-host licence verification and usage reports.
//!
//! Placeholder from Sprint 0. Behaviour arrives in later sprints.

#![forbid(unsafe_code)]

pub mod report;
pub mod verify;

/// Crate name, used by the scaffold placeholder test.
pub const CRATE_NAME: &str = env!("CARGO_PKG_NAME");

#[cfg(test)]
mod tests {
    use super::CRATE_NAME;

    #[test]
    fn test_scaffold_crate_name_placeholder_matches_package() {
        assert_eq!(CRATE_NAME, "yuyin-licence");
    }
}
