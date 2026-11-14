//! WASM build of the character counter for the console.
//!
//! Placeholder from Sprint 0. Behaviour arrives in later sprints.

#![forbid(unsafe_code)]

/// Crate name, used by the scaffold placeholder test.
pub const CRATE_NAME: &str = env!("CARGO_PKG_NAME");

#[cfg(test)]
mod tests {
    use super::CRATE_NAME;

    #[test]
    fn test_scaffold_crate_name_placeholder_matches_package() {
        assert_eq!(CRATE_NAME, "yuyin-count-wasm");
    }
}
