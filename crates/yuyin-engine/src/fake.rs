//! `FakeEngine`: a deterministic sine sweep for every test above the engine layer.
//!
//! Output length is proportional to the number of code points in the text.
//! The same input always gives the same samples, whatever the chunk size.

use std::f64::consts::TAU;
use std::thread;
use std::time::{Duration, Instant};

use crate::traits::{
    CancellationToken, EngineError, SegmentInput, SegmentLang, SegmentStats, SinkClosed,
    SynthOptions, SynthesisEngine, VoiceId, VoiceInfo,
};

/// Output sample rate of every engine.
pub const SAMPLE_RATE: u32 = 24_000;

/// Longest single sleep, so cancellation is seen within a few milliseconds.
const SLEEP_SLICE: Duration = Duration::from_millis(2);
const SWEEP_START_HZ: f64 = 200.0;
const SWEEP_END_HZ: f64 = 800.0;
const AMPLITUDE: f64 = 0.25;

/// Tunables for [`FakeEngine`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FakeConfig {
    /// Samples emitted per sink call.
    pub chunk_samples: usize,
    /// Delay before each chunk. The first chunk is delayed too.
    pub chunk_delay: Duration,
    /// Samples produced per code point of text at speed 1.0.
    pub samples_per_char: usize,
}

impl Default for FakeConfig {
    fn default() -> Self {
        Self {
            chunk_samples: 2_400,
            chunk_delay: Duration::ZERO,
            // 50 ms of audio per code point.
            samples_per_char: 1_200,
        }
    }
}

/// Deterministic fake engine.
#[derive(Debug, Clone)]
pub struct FakeEngine {
    config: FakeConfig,
    voices: Vec<VoiceInfo>,
}

impl Default for FakeEngine {
    fn default() -> Self {
        Self::new(FakeConfig::default())
    }
}

impl FakeEngine {
    /// Build a fake engine with two fake voices, `fake-hi` and `fake-en`.
    #[must_use]
    pub fn new(config: FakeConfig) -> Self {
        let voice = |id: &str, name: &str, language: &str| VoiceInfo {
            id: VoiceId::new(id),
            name: name.to_owned(),
            language: language.to_owned(),
        };
        Self {
            config: FakeConfig {
                chunk_samples: config.chunk_samples.max(1),
                ..config
            },
            voices: vec![
                voice("fake-hi", "Fake Hindi", "hi"),
                voice("fake-en", "Fake English", "en-IN"),
            ],
        }
    }

    /// Total samples for a segment at the given speed.
    #[allow(
        clippy::cast_precision_loss,
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss,
        reason = "sample counts are far below 2^52 and the speed is clamped positive"
    )]
    fn total_samples(&self, segment: &SegmentInput, speed: f32) -> usize {
        let chars = segment.text.chars().count();
        let speed = f64::from(speed).max(0.1);
        ((chars * self.config.samples_per_char) as f64 / speed).round() as usize
    }

    /// Sleep for the configured delay, waking every few milliseconds to check `cancel`.
    fn delay(&self, cancel: &CancellationToken) -> Result<(), EngineError> {
        let deadline = Instant::now() + self.config.chunk_delay;
        loop {
            if cancel.is_cancelled() {
                return Err(EngineError::Cancelled);
            }
            let now = Instant::now();
            if now >= deadline {
                return Ok(());
            }
            thread::sleep((deadline - now).min(SLEEP_SLICE));
        }
    }
}

/// Sample `n` of a linear sweep over `total` samples.
#[allow(
    clippy::cast_precision_loss,
    clippy::cast_possible_truncation,
    reason = "sample indices are far below 2^52 and f32 output is intended"
)]
fn sweep_sample(n: usize, total: usize) -> f32 {
    let t = n as f64 / f64::from(SAMPLE_RATE);
    let dur = total as f64 / f64::from(SAMPLE_RATE);
    let phase = TAU * (SWEEP_START_HZ * t + (SWEEP_END_HZ - SWEEP_START_HZ) * t * t / (2.0 * dur));
    (AMPLITUDE * phase.sin()) as f32
}

impl SynthesisEngine for FakeEngine {
    fn id(&self) -> &'static str {
        "fake"
    }

    fn voices(&self) -> &[VoiceInfo] {
        &self.voices
    }

    fn sample_rate(&self) -> u32 {
        SAMPLE_RATE
    }

    fn synthesise(
        &self,
        segment: &SegmentInput,
        voice: &VoiceId,
        opts: &SynthOptions,
        cancel: &CancellationToken,
        sink: &mut dyn FnMut(&[f32]) -> Result<(), SinkClosed>,
    ) -> Result<SegmentStats, EngineError> {
        if !self.voices.iter().any(|v| &v.id == voice) {
            return Err(EngineError::UnknownVoice(voice.0.clone()));
        }
        if cancel.is_cancelled() {
            return Err(EngineError::Cancelled);
        }
        let total = self.total_samples(segment, opts.speed);
        let mut emitted = 0;
        let mut chunks = 0;
        let mut buf = Vec::with_capacity(self.config.chunk_samples);
        while emitted < total {
            self.delay(cancel)?;
            let end = (emitted + self.config.chunk_samples).min(total);
            buf.clear();
            buf.extend((emitted..end).map(|n| sweep_sample(n, total)));
            sink(&buf)?;
            emitted = end;
            chunks += 1;
        }
        let secs = u64::try_from(emitted).unwrap_or(u64::MAX) / u64::from(SAMPLE_RATE);
        let nanos = (u64::try_from(emitted).unwrap_or(u64::MAX) % u64::from(SAMPLE_RATE))
            * 1_000_000_000
            / u64::from(SAMPLE_RATE);
        Ok(SegmentStats {
            samples: emitted,
            chunks,
            audio_duration: Duration::new(secs, u32::try_from(nanos).unwrap_or(0)),
        })
    }

    fn warmup(&self) -> Result<Duration, EngineError> {
        let start = Instant::now();
        let quiet = Self::new(FakeConfig {
            chunk_delay: Duration::ZERO,
            ..self.config
        });
        let voice = self
            .voices
            .first()
            .map(|v| v.id.clone())
            .ok_or_else(|| EngineError::Internal("no voices".to_owned()))?;
        quiet.synthesise(
            &SegmentInput::new("warmup", SegmentLang::En),
            &voice,
            &SynthOptions::default(),
            &CancellationToken::new(),
            &mut |_| Ok(()),
        )?;
        Ok(start.elapsed())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn voice() -> VoiceId {
        VoiceId::new("fake-en")
    }

    fn run(engine: &FakeEngine, text: &str) -> (Vec<f32>, SegmentStats) {
        let mut out = Vec::new();
        let stats = engine
            .synthesise(
                &SegmentInput::new(text, SegmentLang::En),
                &voice(),
                &SynthOptions::default(),
                &CancellationToken::new(),
                &mut |chunk| {
                    out.extend_from_slice(chunk);
                    Ok(())
                },
            )
            .expect("synthesis succeeds");
        (out, stats)
    }

    #[test]
    fn unit_engine_fakeengine_synthesise_deterministicoutput() {
        let engine = FakeEngine::default();
        let (a, _) = run(&engine, "नमस्ते duniya");
        let (b, _) = run(&engine, "नमस्ते duniya");
        assert_eq!(a.len(), 13 * 1_200);
        assert_eq!(a, b);
        // Chunk size does not change the samples.
        let small = FakeEngine::new(FakeConfig {
            chunk_samples: 333,
            ..FakeConfig::default()
        });
        assert_eq!(run(&small, "नमस्ते duniya").0, a);
        // Different text gives different audio.
        assert_ne!(run(&engine, "hello").0, run(&engine, "hello!").0);
    }

    #[test]
    fn unit_engine_fakeengine_textlength_proportionalduration() {
        let engine = FakeEngine::default();
        let (_, short) = run(&engine, "abcde");
        let (_, long) = run(&engine, "abcdeabcdeabcdeabcde");
        assert_eq!(short.samples, 5 * 1_200);
        assert_eq!(long.samples, 4 * short.samples);
        assert_eq!(long.audio_duration, short.audio_duration * 4);
        // Counted in code points, not bytes.
        assert_eq!(run(&engine, "नमस्ते").1.samples, 6 * 1_200);
        // Speed 2.0 halves the length.
        let mut n = 0;
        let fast = engine
            .synthesise(
                &SegmentInput::new("abcde", SegmentLang::En),
                &voice(),
                &SynthOptions { speed: 2.0 },
                &CancellationToken::new(),
                &mut |c| {
                    n += c.len();
                    Ok(())
                },
            )
            .expect("ok");
        assert_eq!(fast.samples, 5 * 600);
        assert_eq!(n, fast.samples);
    }

    #[test]
    fn unit_engine_fakeengine_empty_text_emits_nothing() {
        let (out, stats) = run(&FakeEngine::default(), "");
        assert_eq!(out.len(), 0);
        assert_eq!(stats.chunks, 0);
        assert_eq!(stats.audio_duration, Duration::ZERO);
    }

    #[test]
    fn unit_engine_fakeengine_chunks_respect_chunk_size() {
        let engine = FakeEngine::new(FakeConfig {
            chunk_samples: 1_000,
            ..FakeConfig::default()
        });
        let mut sizes = Vec::new();
        let stats = engine
            .synthesise(
                &SegmentInput::new("abcde", SegmentLang::En),
                &voice(),
                &SynthOptions::default(),
                &CancellationToken::new(),
                &mut |c| {
                    sizes.push(c.len());
                    Ok(())
                },
            )
            .expect("ok");
        assert_eq!(sizes, vec![1_000; 6]);
        assert_eq!(stats.chunks, 6);
    }

    #[test]
    fn unit_engine_fakeengine_configurable_delay_applied() {
        let engine = FakeEngine::new(FakeConfig {
            chunk_delay: Duration::from_millis(40),
            ..FakeConfig::default()
        });
        let start = Instant::now();
        let mut first = None;
        engine
            .synthesise(
                &SegmentInput::new("ab", SegmentLang::En),
                &voice(),
                &SynthOptions::default(),
                &CancellationToken::new(),
                &mut |_| {
                    first.get_or_insert(start.elapsed());
                    Ok(())
                },
            )
            .expect("ok");
        assert!(first.expect("sink called") >= Duration::from_millis(40));
    }

    #[test]
    fn unit_engine_fakeengine_cancel_stopswithin20ms() {
        // 100 chunks at 1 s each would take 100 s if cancel were ignored.
        let engine = FakeEngine::new(FakeConfig {
            chunk_delay: Duration::from_secs(1),
            ..FakeConfig::default()
        });
        let token = CancellationToken::new();
        let worker_token = token.clone();
        let calls = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
        let worker_calls = calls.clone();
        let handle = thread::spawn(move || {
            let result = engine.synthesise(
                &SegmentInput::new("a".repeat(200), SegmentLang::En),
                &voice(),
                &SynthOptions::default(),
                &worker_token,
                &mut |_| {
                    worker_calls.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
                    Ok(())
                },
            );
            (result, Instant::now())
        });
        thread::sleep(Duration::from_millis(50));
        let cancelled_at = Instant::now();
        token.cancel();
        let (result, returned_at) = handle.join().expect("worker joins");
        assert_eq!(result, Err(EngineError::Cancelled));
        assert!(
            returned_at.duration_since(cancelled_at) < Duration::from_millis(20),
            "took {:?}",
            returned_at.duration_since(cancelled_at)
        );
        assert_eq!(calls.load(std::sync::atomic::Ordering::SeqCst), 0);
    }

    #[test]
    fn unit_engine_fakeengine_cancel_midsegment_stops_sink_calls() {
        let engine = FakeEngine::default();
        let token = CancellationToken::new();
        let mut calls = 0;
        let result = engine.synthesise(
            &SegmentInput::new("a".repeat(100), SegmentLang::En),
            &voice(),
            &SynthOptions::default(),
            &token,
            &mut |_| {
                calls += 1;
                token.cancel();
                Ok(())
            },
        );
        assert_eq!(result, Err(EngineError::Cancelled));
        assert_eq!(calls, 1);
    }

    #[test]
    fn unit_engine_fakeengine_precancelled_token_returns_cancelled() {
        let token = CancellationToken::new();
        token.cancel();
        let result = FakeEngine::default().synthesise(
            &SegmentInput::new("abc", SegmentLang::En),
            &voice(),
            &SynthOptions::default(),
            &token,
            &mut |_| Ok(()),
        );
        assert_eq!(result, Err(EngineError::Cancelled));
    }

    #[test]
    fn unit_engine_fakeengine_sinkclosed_propagates() {
        let mut calls = 0;
        let result = FakeEngine::default().synthesise(
            &SegmentInput::new("a".repeat(50), SegmentLang::En),
            &voice(),
            &SynthOptions::default(),
            &CancellationToken::new(),
            &mut |_| {
                calls += 1;
                Err(SinkClosed)
            },
        );
        assert_eq!(result, Err(EngineError::SinkClosed));
        assert_eq!(calls, 1);
    }

    #[test]
    fn unit_engine_fakeengine_unknown_voice_rejected() {
        let result = FakeEngine::default().synthesise(
            &SegmentInput::new("abc", SegmentLang::En),
            &VoiceId::new("nope"),
            &SynthOptions::default(),
            &CancellationToken::new(),
            &mut |_| Ok(()),
        );
        assert_eq!(result, Err(EngineError::UnknownVoice("nope".to_owned())));
    }

    #[test]
    fn unit_engine_fakeengine_warmup_returns_duration() {
        // A large chunk delay must not slow warmup.
        let engine = FakeEngine::new(FakeConfig {
            chunk_delay: Duration::from_secs(5),
            ..FakeConfig::default()
        });
        let took = engine.warmup().expect("warmup ok");
        assert!(took < Duration::from_secs(1));
    }

    #[test]
    fn unit_engine_fakeengine_voices_and_samplerate_reported() {
        let engine = FakeEngine::default();
        assert_eq!(engine.id(), "fake");
        assert_eq!(engine.sample_rate(), 24_000);
        let ids: Vec<&str> = engine.voices().iter().map(|v| v.id.as_str()).collect();
        assert_eq!(ids, ["fake-hi", "fake-en"]);
    }

    #[test]
    fn unit_engine_traits_error_display_and_conversion() {
        assert_eq!(EngineError::from(SinkClosed), EngineError::SinkClosed);
        assert_eq!(SinkClosed.to_string(), "audio sink closed");
        assert_eq!(EngineError::Cancelled.to_string(), "synthesis cancelled");
        assert_eq!(EngineError::SinkClosed.to_string(), "audio sink closed");
        assert_eq!(
            EngineError::UnknownVoice("x".to_owned()).to_string(),
            "unknown voice: x"
        );
        assert_eq!(
            EngineError::Internal("boom".to_owned()).to_string(),
            "engine error: boom"
        );
    }

    #[test]
    fn unit_engine_traits_cancellation_token_clones_share_state() {
        let a = CancellationToken::new();
        let b = a.clone();
        assert!(!b.is_cancelled());
        a.cancel();
        assert!(b.is_cancelled());
    }
}
