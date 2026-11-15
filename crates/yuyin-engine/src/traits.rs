//! The engine contract: `SynthesisEngine` and its supporting types.
//!
//! See docs/ARCHITECTURE.md section 6. This crate does not depend on
//! `yuyin-text`. The gateway maps each `yuyin_text::Segment` onto a
//! [`SegmentInput`] (`text`, `lang`, `pace_hint`) before calling an engine.

use std::fmt;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

/// Language of a segment as the engine sees it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SegmentLang {
    /// Hindi.
    Hi,
    /// English.
    En,
}

/// Engine-side view of one text segment.
///
/// The gateway builds this from `yuyin_text::Segment { text, lang, pace_hint, .. }`.
#[derive(Debug, Clone, PartialEq)]
pub struct SegmentInput {
    /// Text to speak, already normalised.
    pub text: String,
    /// Language of the text.
    pub lang: SegmentLang,
    /// Pace hint from the text front end. 1.0 is normal pace.
    pub pace_hint: f32,
}

impl SegmentInput {
    /// Build an input with normal pace.
    #[must_use]
    pub fn new(text: impl Into<String>, lang: SegmentLang) -> Self {
        Self {
            text: text.into(),
            lang,
            pace_hint: 1.0,
        }
    }
}

/// Identifier of a voice, for example `hi-f-asha`.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct VoiceId(pub String);

impl VoiceId {
    /// Build a voice id from any string-like value.
    #[must_use]
    pub fn new(id: impl Into<String>) -> Self {
        Self(id.into())
    }

    /// The id as a string slice.
    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

/// Public description of one voice.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VoiceInfo {
    /// Voice id.
    pub id: VoiceId,
    /// Display name.
    pub name: String,
    /// Primary language tag, for example `hi` or `en-IN`.
    pub language: String,
}

/// Per-request synthesis options.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SynthOptions {
    /// Speed multiplier. 1.0 is normal, 2.0 is twice as fast.
    pub speed: f32,
}

impl Default for SynthOptions {
    fn default() -> Self {
        Self { speed: 1.0 }
    }
}

/// What a finished segment produced.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SegmentStats {
    /// Total samples passed to the sink.
    pub samples: usize,
    /// Number of sink calls.
    pub chunks: usize,
    /// Audio duration of the samples.
    pub audio_duration: Duration,
}

/// The sink refused more audio, normally because the client went away.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SinkClosed;

impl fmt::Display for SinkClosed {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("audio sink closed")
    }
}

impl std::error::Error for SinkClosed {}

/// Engine failure.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EngineError {
    /// Cancelled through the token.
    Cancelled,
    /// The sink closed while audio was being emitted.
    SinkClosed,
    /// The voice id is not served by this engine.
    UnknownVoice(String),
    /// Any other engine failure.
    Internal(String),
}

impl fmt::Display for EngineError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Cancelled => f.write_str("synthesis cancelled"),
            Self::SinkClosed => f.write_str("audio sink closed"),
            Self::UnknownVoice(id) => write!(f, "unknown voice: {id}"),
            Self::Internal(msg) => write!(f, "engine error: {msg}"),
        }
    }
}

impl std::error::Error for EngineError {}

impl From<SinkClosed> for EngineError {
    fn from(_: SinkClosed) -> Self {
        Self::SinkClosed
    }
}

/// Cheap, clonable cancellation flag. All clones share one state.
#[derive(Debug, Clone, Default)]
pub struct CancellationToken(Arc<AtomicBool>);

impl CancellationToken {
    /// A fresh, not-cancelled token.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Cancel this token and every clone of it.
    pub fn cancel(&self) {
        self.0.store(true, Ordering::Release);
    }

    /// Whether the token has been cancelled.
    #[must_use]
    pub fn is_cancelled(&self) -> bool {
        self.0.load(Ordering::Acquire)
    }
}

/// A speech engine. Nothing above this trait knows which model is running.
pub trait SynthesisEngine: Send + Sync {
    /// Stable engine id.
    fn id(&self) -> &'static str;
    /// Voices this engine can speak.
    fn voices(&self) -> &[VoiceInfo];
    /// Output sample rate in Hz.
    fn sample_rate(&self) -> u32;
    /// Synthesise one segment. Implementations call `sink` with PCM f32 chunks
    /// as soon as they are available. Must be cancellable through `cancel`.
    ///
    /// # Errors
    ///
    /// `EngineError::Cancelled` when the token is cancelled,
    /// `EngineError::SinkClosed` when the sink refuses audio,
    /// `EngineError::UnknownVoice` for a voice this engine does not serve.
    fn synthesise(
        &self,
        segment: &SegmentInput,
        voice: &VoiceId,
        opts: &SynthOptions,
        cancel: &CancellationToken,
        sink: &mut dyn FnMut(&[f32]) -> Result<(), SinkClosed>,
    ) -> Result<SegmentStats, EngineError>;
    /// Run one throwaway synthesis so the first real request is fast.
    ///
    /// # Errors
    ///
    /// Any engine failure while warming up.
    fn warmup(&self) -> Result<Duration, EngineError>;
}
