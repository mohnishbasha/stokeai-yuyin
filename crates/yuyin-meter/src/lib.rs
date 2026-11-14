//! Character counting, pricing, reservations, usage batching.
//!
//! Placeholder from Sprint 0. Behaviour arrives in later sprints.

pub mod count;
pub mod price;
pub mod reserve;
pub mod batcher;

/// Crate name, used by the scaffold placeholder test.
pub const CRATE_NAME: &str = env!("CARGO_PKG_NAME");

#[cfg(test)]
mod tests {
    use super::CRATE_NAME;

    #[test]
    fn test_scaffold_crate_name_placeholder_matches_package() {
        assert_eq!(CRATE_NAME, "yuyin-meter");
    }
}
