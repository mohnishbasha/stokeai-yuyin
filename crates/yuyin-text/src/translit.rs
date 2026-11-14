//! Stage 6: transliteration for the engine (ARCHITECTURE 5.1).
//!
//! Stub: identity. Roman Hindi to Devanagari for engines that need it lands with the tagger
//! and lexicon work. TODO(#15): implement once the Roman Hindi lexicon has readings.

use crate::Verbalised;

/// What the target engine needs.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct EngineNeeds {
    /// True if the engine needs Hindi in Devanagari.
    pub devanagari: bool,
}

/// Transliterates verbalised spans for the engine.
///
/// Stub: returns the input unchanged.
///
/// # Examples
///
/// ```
/// use yuyin_text::translit::{transliterate, EngineNeeds};
/// use yuyin_text::{Lang, Verbalised};
/// let spans = vec![
///     Verbalised { text: "नमस्ते".into(), lang: Lang::Hi, pace_hint: None },
///     Verbalised { text: "hello".into(), lang: Lang::En, pace_hint: None },
/// ];
/// assert_eq!(transliterate(spans.clone(), EngineNeeds { devanagari: true }), spans);
/// ```
#[must_use]
pub fn transliterate(spans: Vec<Verbalised>, needs: EngineNeeds) -> Vec<Verbalised> {
    let _ = needs;
    spans
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Lang;

    #[test]
    fn test_transliterate_stub_is_identity() {
        let spans = vec![Verbalised {
            text: "aapka".into(),
            lang: Lang::Hi,
            pace_hint: Some(0.9),
        }];
        assert_eq!(transliterate(spans.clone(), EngineNeeds::default()), spans);
    }
}
