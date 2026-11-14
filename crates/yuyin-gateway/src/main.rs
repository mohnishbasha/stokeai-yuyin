//! Yuyin gateway entry point.
//!
//! Placeholder from Sprint 0. The real server arrives in Sprint 3.

#![forbid(unsafe_code)]

mod admission;
mod auth;
mod config;
mod drain;
mod errors;
mod metrics;
mod rest;
mod usage;
mod voices;
mod ws;

/// Version string reported by the binary.
fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

fn main() {
    let _ = version();
}

#[cfg(test)]
mod tests {
    use super::version;

    #[test]
    fn test_main_version_placeholder_matches_package() {
        assert_eq!(version(), env!("CARGO_PKG_VERSION"));
    }
}
