//! Speech engine abstraction, fake engine, worker pool.
//!
//! Placeholder from Sprint 0. Behaviour arrives in later sprints.

pub mod traits;
pub mod fake;
pub mod onnx;
pub mod registry;
pub mod pool;

/// Crate name, used by the scaffold placeholder test.
pub const CRATE_NAME: &str = env!("CARGO_PKG_NAME");

#[cfg(test)]
mod tests {
    use super::CRATE_NAME;

    #[test]
    fn test_scaffold_crate_name_placeholder_matches_package() {
        assert_eq!(CRATE_NAME, "yuyin-engine");
    }
}
