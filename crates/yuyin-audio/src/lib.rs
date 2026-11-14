//! Audio encoders: Opus in Ogg, WAV, PCM, time stretch.
//!
//! Placeholder from Sprint 0. Behaviour arrives in later sprints.

#![deny(unsafe_code)]

pub mod ogg;
pub mod opus;
pub mod pcm;
pub mod stretch;
pub mod wav;

/// Crate name, used by the scaffold placeholder test.
pub const CRATE_NAME: &str = env!("CARGO_PKG_NAME");

#[cfg(test)]
mod tests {
    use super::CRATE_NAME;

    #[test]
    fn test_scaffold_crate_name_placeholder_matches_package() {
        assert_eq!(CRATE_NAME, "yuyin-audio");
    }
}
