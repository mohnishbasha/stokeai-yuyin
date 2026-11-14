//! Text front-end: language tagging, normalisation, transliteration, segmentation.
//!
//! The pipeline is described in docs/ARCHITECTURE.md section 5. This crate is pure: no I/O,
//! no async, no network, no clock, no randomness. Data files are embedded with `include_str!`.
//! `tests/purity.rs` enforces that with a dependency allowlist and a source scan.
//!
//! Stages and where they live:
//!
//! | Stage | Module | Owner task |
//! |---|---|---|
//! | 1. Clean (NFC, control strip, length) | [`clean`] in this file | S1-T01 |
//! | 2. Tokenise | [`tokenise`] in this file | S1-T01 |
//! | 3. Tag script and language | [`tag`] | S1-T02 |
//! | 4. Classify semiotic spans | [`classify`] (one submodule per class) | S1-T03 to S1-T08 |
//! | 5. Verbalise | [`verbalise`] (one submodule per class) | S1-T03 to S1-T08 |
//! | 6. Transliterate | [`translit`] | later |
//! | 7. Segment | [`segment`] | S1-T09 |
//!
//! The shared types below are the contract between those modules. Class owners should not
//! need to edit this file.

#![forbid(unsafe_code)]

use std::ops::Range;

use unicode_normalization::UnicodeNormalization;
use unicode_segmentation::UnicodeSegmentation;

pub mod classify;
pub mod lexicon;
pub mod segment;
pub mod tag;
pub mod translit;
pub mod verbalise;

pub use classify::{ClassifiedSpan, Semiotic};
pub use lexicon::{Lexicons, TenantLexicon};
pub use segment::Segment;
pub use verbalise::Verbalised;

/// Crate name, used by the scaffold placeholder test.
pub const CRATE_NAME: &str = env!("CARGO_PKG_NAME");

/// Default maximum input length in code points, after cleaning (PRD FR-012, ARCHITECTURE 11.9).
pub const DEFAULT_MAX_CHARS: usize = 5_000;

/// Errors returned by the text front-end.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
#[non_exhaustive]
pub enum TextError {
    /// The text is empty or whitespace-only after cleaning (PRD FR-005 AC-4).
    #[error("text is empty after cleaning")]
    Empty,
    /// The cleaned text is longer than `max_chars` code points (PRD FR-012 AC-3).
    #[error("text has {chars} code points, the limit is {max}")]
    TooLong {
        /// Code points in the cleaned text.
        chars: usize,
        /// The configured limit.
        max: usize,
    },
    /// The language value is not one of `auto`, `hi`, `hinglish`, `en-IN`, `en-US` (PRD FR-004).
    #[error("unsupported language: {0}")]
    UnsupportedLanguage(String),
    /// A tenant lexicon already holds the maximum number of entries (PRD FR-010).
    #[error("tenant lexicon is full: at most {max} entries")]
    TenantLexiconFull {
        /// The cap.
        max: usize,
    },
    /// A tenant lexicon entry is invalid, for example too long or empty (PRD FR-010).
    #[error("invalid tenant lexicon entry: {0}")]
    TenantEntryInvalid(&'static str),
}

/// The requested language (PRD FR-004).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Default)]
pub enum LanguageHint {
    /// Detect per sentence (default).
    #[default]
    Auto,
    /// Hindi.
    Hi,
    /// Hindi with English words, either script.
    Hinglish,
    /// Indian English.
    EnIn,
    /// American English.
    EnUs,
}

impl LanguageHint {
    /// Parses the API value (`auto`, `hi`, `hinglish`, `en-IN`, `en-US`).
    ///
    /// # Errors
    ///
    /// Returns [`TextError::UnsupportedLanguage`] for any other value.
    ///
    /// # Examples
    ///
    /// ```
    /// use yuyin_text::LanguageHint;
    /// assert_eq!(LanguageHint::parse("hi"), Ok(LanguageHint::Hi));
    /// assert_eq!(LanguageHint::parse("en-US"), Ok(LanguageHint::EnUs));
    /// assert!(LanguageHint::parse("fr").is_err());
    /// ```
    pub fn parse(value: &str) -> Result<Self, TextError> {
        match value {
            "auto" => Ok(Self::Auto),
            "hi" => Ok(Self::Hi),
            "hinglish" => Ok(Self::Hinglish),
            "en-IN" => Ok(Self::EnIn),
            "en-US" => Ok(Self::EnUs),
            other => Err(TextError::UnsupportedLanguage(other.to_owned())),
        }
    }

    /// The API value for this hint.
    ///
    /// # Examples
    ///
    /// ```
    /// use yuyin_text::LanguageHint;
    /// assert_eq!(LanguageHint::Hinglish.as_str(), "hinglish");
    /// assert_eq!(LanguageHint::EnIn.as_str(), "en-IN");
    /// ```
    #[must_use]
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Auto => "auto",
            Self::Hi => "hi",
            Self::Hinglish => "hinglish",
            Self::EnIn => "en-IN",
            Self::EnUs => "en-US",
        }
    }
}

/// Regional conventions: digit grouping (lakh or million) and numeric date order.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Default)]
pub enum Locale {
    /// India: lakh and crore grouping, day-first dates.
    #[default]
    In,
    /// United States: million and billion grouping, month-first dates.
    Us,
}

impl Locale {
    /// The locale implied by a language hint: `en-US` is [`Locale::Us`], everything else
    /// (including `auto`, ARCHITECTURE 5.2 and PRD FR-008) is [`Locale::In`].
    ///
    /// # Examples
    ///
    /// ```
    /// use yuyin_text::{LanguageHint, Locale};
    /// assert_eq!(Locale::from_hint(LanguageHint::Hi), Locale::In);
    /// assert_eq!(Locale::from_hint(LanguageHint::EnUs), Locale::Us);
    /// ```
    #[must_use]
    pub fn from_hint(hint: LanguageHint) -> Self {
        match hint {
            LanguageHint::EnUs => Self::Us,
            _ => Self::In,
        }
    }
}

/// Options for [`normalise`].
#[derive(Debug, Clone, Copy)]
pub struct NormaliseOptions<'a> {
    /// Requested language.
    pub language: LanguageHint,
    /// Regional conventions. [`NormaliseOptions::new`] derives it from `language`.
    pub locale: Locale,
    /// Per-tenant acronym and term overrides (PRD FR-010). Passed in, never loaded here.
    pub tenant_lexicon: Option<&'a TenantLexicon>,
    /// Maximum code points after cleaning.
    pub max_chars: usize,
    /// When false, stages 4 to 6 are skipped and text passes through (ARCHITECTURE 5.1).
    pub normalize: bool,
}

impl NormaliseOptions<'_> {
    /// Options for `language` with the derived locale, no tenant lexicon,
    /// [`DEFAULT_MAX_CHARS`], and normalisation on.
    ///
    /// # Examples
    ///
    /// ```
    /// use yuyin_text::{LanguageHint, Locale, NormaliseOptions};
    /// let hi = NormaliseOptions::new(LanguageHint::Hi);
    /// assert_eq!(hi.locale, Locale::In);
    /// let en = NormaliseOptions::new(LanguageHint::EnUs);
    /// assert_eq!(en.locale, Locale::Us);
    /// assert!(en.normalize);
    /// ```
    #[must_use]
    pub fn new(language: LanguageHint) -> Self {
        Self {
            language,
            locale: Locale::from_hint(language),
            tenant_lexicon: None,
            max_chars: DEFAULT_MAX_CHARS,
            normalize: true,
        }
    }
}

impl Default for NormaliseOptions<'_> {
    fn default() -> Self {
        Self::new(LanguageHint::Auto)
    }
}

/// Text after stage 1: NFC, control characters stripped, length validated.
///
/// Every byte range in [`Span`] and every `char_span` in [`Segment`] refers to this text.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CleanText(String);

impl CleanText {
    /// The cleaned text.
    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Length in code points (what the meter bills, PRD FR-005 AC-1).
    #[must_use]
    pub fn char_count(&self) -> usize {
        self.0.chars().count()
    }
}

/// Token kind from stage 2.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum SpanKind {
    /// Contains at least one letter (any script), for example `KYC`, `नमस्ते`, `1st`.
    Word,
    /// Digits with optional internal `,` or `.` separators, for example `1,25,000`, `3.14`.
    Number,
    /// Anything else that is not whitespace: punctuation and symbols such as `₹`, `%`, `।`.
    Punctuation,
    /// A run of whitespace.
    Space,
}

/// A token: a byte range into [`CleanText`] and its kind.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Span {
    /// Byte range into the cleaned text.
    pub range: Range<usize>,
    /// Token kind.
    pub kind: SpanKind,
}

/// Writing system of a span.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Script {
    /// Devanagari.
    Deva,
    /// Latin (also used for Roman Hindi).
    Latn,
    /// Numerals.
    Digit,
    /// Punctuation, symbols, whitespace, and letters of other scripts.
    Symbol,
}

/// Spoken language of a span or segment.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Lang {
    /// Hindi (Devanagari or Roman script).
    Hi,
    /// English.
    En,
}

/// A span with its script and language from stage 3.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct TaggedSpan {
    /// The token.
    pub span: Span,
    /// Its script.
    pub script: Script,
    /// Its language. Digits, symbols, and spaces take the sentence's matrix language.
    pub lang: Lang,
}

/// Stage 1: NFC normalise, strip control characters, validate length.
///
/// Stripped: every Unicode `Cc` control character except tab, line feed, and carriage return,
/// plus the byte order mark U+FEFF. Format characters that matter for Devanagari (ZWJ U+200D,
/// ZWNJ U+200C) are kept.
///
/// # Errors
///
/// [`TextError::Empty`] if nothing but whitespace is left, [`TextError::TooLong`] if the
/// cleaned text has more than `opts.max_chars` code points.
///
/// # Examples
///
/// ```
/// use yuyin_text::{clean, LanguageHint, NormaliseOptions};
/// let opts = NormaliseOptions::new(LanguageHint::Hi);
/// assert_eq!(clean("नमस्ते\u{0}", &opts).unwrap().as_str(), "नमस्ते");
/// let opts = NormaliseOptions::new(LanguageHint::EnIn);
/// assert_eq!(clean("Hello\u{7}!", &opts).unwrap().as_str(), "Hello!");
/// ```
pub fn clean(text: &str, opts: &NormaliseOptions<'_>) -> Result<CleanText, TextError> {
    let cleaned: String = text.nfc().filter(|c| !is_stripped(*c)).collect();
    if cleaned.chars().all(char::is_whitespace) {
        return Err(TextError::Empty);
    }
    let chars = cleaned.chars().count();
    if chars > opts.max_chars {
        return Err(TextError::TooLong {
            chars,
            max: opts.max_chars,
        });
    }
    Ok(CleanText(cleaned))
}

fn is_stripped(c: char) -> bool {
    (c.is_control() && !matches!(c, '\t' | '\n' | '\r')) || c == '\u{FEFF}'
}

/// Stage 2: split into word, number, punctuation, and space tokens (UAX #29 word boundaries).
///
/// The spans are contiguous and cover the whole text.
///
/// # Examples
///
/// ```
/// use yuyin_text::{clean, tokenise, NormaliseOptions, SpanKind};
/// let opts = NormaliseOptions::default();
/// let hi = clean("₹1,25,000 दें", &opts).unwrap();
/// let kinds: Vec<SpanKind> = tokenise(&hi).iter().map(|s| s.kind).collect();
/// assert_eq!(kinds, [SpanKind::Punctuation, SpanKind::Number, SpanKind::Space, SpanKind::Word]);
/// let en = clean("Hi, Asha", &opts).unwrap();
/// assert_eq!(tokenise(&en).len(), 4);
/// ```
#[must_use]
pub fn tokenise(text: &CleanText) -> Vec<Span> {
    text.as_str()
        .split_word_bound_indices()
        .map(|(start, token)| Span {
            range: start..start + token.len(),
            kind: token_kind(token),
        })
        .collect()
}

fn token_kind(token: &str) -> SpanKind {
    if token.chars().all(char::is_whitespace) {
        SpanKind::Space
    } else if token.chars().any(is_letter) {
        SpanKind::Word
    } else if token.chars().any(char::is_numeric) {
        SpanKind::Number
    } else {
        SpanKind::Punctuation
    }
}

/// True for letters and combining marks, including Devanagari vowel signs and virama, but not
/// the danda (U+0964, U+0965), Devanagari digits (U+0966..U+096F), or the abbreviation sign.
fn is_letter(c: char) -> bool {
    c.is_alphabetic() || (is_devanagari(c) && !matches!(c, '\u{0964}'..='\u{0970}'))
}

/// True for characters in the Devanagari blocks (U+0900..U+097F, U+A8E0..U+A8FF).
#[must_use]
pub(crate) fn is_devanagari(c: char) -> bool {
    matches!(c, '\u{0900}'..='\u{097F}' | '\u{A8E0}'..='\u{A8FF}')
}

/// Runs the full pipeline and returns segments ready for the engine.
///
/// With `opts.normalize == false`, stages 1, 2, 3, and 7 run and the text passes through.
///
/// # Errors
///
/// Errors from [`clean`]: [`TextError::Empty`] and [`TextError::TooLong`].
///
/// # Examples
///
/// ```
/// use yuyin_text::{normalise, Lang, LanguageHint, NormaliseOptions};
/// let hi = normalise("नमस्ते। आप कैसे हैं?", &NormaliseOptions::new(LanguageHint::Hi)).unwrap();
/// assert_eq!(hi.len(), 2);
/// assert_eq!(hi[0].text, "नमस्ते।");
/// assert_eq!(hi[0].lang, Lang::Hi);
/// // Segments tile the text: the trailing space belongs to the first segment.
/// assert_eq!(hi[0].char_span, 0..8);
///
/// let en = normalise("Hello there. How are you?", &NormaliseOptions::new(LanguageHint::EnUs)).unwrap();
/// assert_eq!(en[1].text, "How are you?");
/// assert_eq!(en[1].lang, Lang::En);
/// ```
pub fn normalise(text: &str, opts: &NormaliseOptions<'_>) -> Result<Vec<Segment>, TextError> {
    let clean = clean(text, opts)?;
    let spans = tokenise(&clean);
    let lexicons = Lexicons::builtin();
    let tagged = tag::tag(&spans, &clean, lexicons, opts.language);
    let context = tag::context_languages(&tagged, &clean, opts.language);

    let pieces: Vec<segment::Piece> = if opts.normalize {
        let ctx = classify::ClassifyCtx {
            text: clean.as_str(),
            tokens: &tagged,
            context: &context,
            locale: opts.locale,
            hint: opts.language,
            lexicons,
            tenant: opts.tenant_lexicon,
        };
        classify::classify(&ctx)
            .into_iter()
            .map(|span| verbalise::to_piece(&span, clean.as_str(), opts, lexicons))
            .collect()
    } else {
        tagged
            .iter()
            .zip(&context)
            .map(|(t, ctx_lang)| segment::Piece::passthrough(t, *ctx_lang, clean.as_str()))
            .collect()
    };
    Ok(segment::segment(
        &clean,
        &pieces,
        &segment::SegmentOptions::default(),
    ))
}

/// Runs [`normalise`] and joins the segment texts with a single space.
///
/// The golden corpus runner compares this string with the `expected` column.
///
/// # Errors
///
/// Same as [`normalise`].
///
/// # Examples
///
/// ```
/// use yuyin_text::{normalise_to_string, LanguageHint, NormaliseOptions};
/// let hi = NormaliseOptions::new(LanguageHint::Hi);
/// assert_eq!(normalise_to_string("नमस्ते।  आप कैसे हैं?", &hi).unwrap(), "नमस्ते। आप कैसे हैं?");
/// let en = NormaliseOptions::new(LanguageHint::EnIn);
/// assert_eq!(normalise_to_string("Good morning.\nSee you soon.", &en).unwrap(), "Good morning. See you soon.");
/// ```
pub fn normalise_to_string(text: &str, opts: &NormaliseOptions<'_>) -> Result<String, TextError> {
    let segments = normalise(text, opts)?;
    Ok(segments
        .iter()
        .map(|s| s.text.as_str())
        .collect::<Vec<_>>()
        .join(" "))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn opts(language: LanguageHint) -> NormaliseOptions<'static> {
        NormaliseOptions::new(language)
    }

    #[test]
    fn test_scaffold_crate_name_placeholder_matches_package() {
        assert_eq!(CRATE_NAME, "yuyin-text");
    }

    #[test]
    fn unit_text_normalise_nfc_and_control_char_strip() {
        // "क़" written as क + nukta stays in NFC form; NUL and BEL are removed.
        let decomposed = "\u{0915}\u{093C}\u{0}म\u{7}";
        let c = clean(decomposed, &opts(LanguageHint::Hi)).unwrap();
        assert_eq!(c.as_str(), "\u{0915}\u{093C}म");
        // Precomposed U+0958 is a composition exclusion, so NFC decomposes it.
        let c = clean("\u{0958}", &opts(LanguageHint::Hi)).unwrap();
        assert_eq!(c.as_str(), "\u{0915}\u{093C}");
        // Tab, newline, ZWJ, and ZWNJ are kept; BOM is removed.
        let c = clean(
            "\u{FEFF}a\tb\nक्\u{200D}ष\u{200C}",
            &opts(LanguageHint::Auto),
        )
        .unwrap();
        assert_eq!(c.as_str(), "a\tb\nक्\u{200D}ष\u{200C}");
    }

    #[test]
    fn test_clean_empty_after_strip_returns_empty() {
        assert_eq!(
            clean("\u{0}\u{1}", &opts(LanguageHint::Hi)),
            Err(TextError::Empty)
        );
        assert_eq!(
            clean("  \n ", &opts(LanguageHint::EnUs)),
            Err(TextError::Empty)
        );
        assert_eq!(clean("", &opts(LanguageHint::EnUs)), Err(TextError::Empty));
    }

    #[test]
    fn test_clean_too_long_returns_error_with_counts() {
        let mut o = opts(LanguageHint::Hi);
        o.max_chars = 3;
        assert_eq!(clean("नमस", &o).map(|c| c.char_count()), Ok(3));
        assert_eq!(
            clean("नमस्", &o),
            Err(TextError::TooLong { chars: 4, max: 3 })
        );
        let err = clean("abcd", &o).unwrap_err();
        assert_eq!(err.to_string(), "text has 4 code points, the limit is 3");
    }

    #[test]
    fn test_language_hint_parse_round_trips() {
        for hint in [
            LanguageHint::Auto,
            LanguageHint::Hi,
            LanguageHint::Hinglish,
            LanguageHint::EnIn,
            LanguageHint::EnUs,
        ] {
            assert_eq!(LanguageHint::parse(hint.as_str()), Ok(hint));
        }
        assert_eq!(
            LanguageHint::parse("en-in"),
            Err(TextError::UnsupportedLanguage("en-in".into()))
        );
        assert_eq!(LanguageHint::default(), LanguageHint::Auto);
    }

    #[test]
    fn test_locale_from_hint_only_en_us_is_us() {
        assert_eq!(Locale::from_hint(LanguageHint::Auto), Locale::In);
        assert_eq!(Locale::from_hint(LanguageHint::Hinglish), Locale::In);
        assert_eq!(Locale::from_hint(LanguageHint::EnIn), Locale::In);
        assert_eq!(Locale::from_hint(LanguageHint::EnUs), Locale::Us);
        let d = NormaliseOptions::default();
        assert_eq!(d.language, LanguageHint::Auto);
        assert_eq!(d.max_chars, DEFAULT_MAX_CHARS);
        assert!(d.tenant_lexicon.is_none());
    }

    #[test]
    fn test_tokenise_kinds_cover_text() {
        let c = clean("Rs. 12,450/- 1st नमस्ते।", &opts(LanguageHint::Hi)).unwrap();
        let spans = tokenise(&c);
        let parts: Vec<(&str, SpanKind)> = spans
            .iter()
            .map(|s| (&c.as_str()[s.range.clone()], s.kind))
            .collect();
        assert_eq!(
            parts,
            [
                ("Rs", SpanKind::Word),
                (".", SpanKind::Punctuation),
                (" ", SpanKind::Space),
                ("12,450", SpanKind::Number),
                ("/", SpanKind::Punctuation),
                ("-", SpanKind::Punctuation),
                (" ", SpanKind::Space),
                ("1st", SpanKind::Word),
                (" ", SpanKind::Space),
                ("नमस्ते", SpanKind::Word),
                ("।", SpanKind::Punctuation),
            ]
        );
        let mut end = 0;
        for s in &spans {
            assert_eq!(s.range.start, end);
            end = s.range.end;
        }
        assert_eq!(end, c.as_str().len());
    }

    #[test]
    fn unit_text_normalise_normalize_false_passes_text_through() {
        let mut o = opts(LanguageHint::Hinglish);
        o.normalize = false;
        let segs = normalise("Aapka EMI ₹4,500 hai.  Kal milte hain.", &o).unwrap();
        let texts: Vec<&str> = segs.iter().map(|s| s.text.as_str()).collect();
        assert_eq!(texts, ["Aapka EMI ₹4,500 hai.", "Kal milte hain."]);
        assert!(segs.iter().all(|s| s.lang == Lang::Hi));
    }

    #[test]
    fn test_normalise_to_string_joins_and_collapses_whitespace() {
        let o = opts(LanguageHint::EnUs);
        assert_eq!(
            normalise_to_string("  One.\n\nTwo three!  ", &o).unwrap(),
            "One. Two three!"
        );
        assert_eq!(normalise_to_string("\u{0}", &o), Err(TextError::Empty));
    }

    #[test]
    fn test_normalise_char_spans_tile_clean_text() {
        let text = "नमस्ते। Your balance is ₹500. आपका दिन शुभ हो!";
        let segs = normalise(text, &opts(LanguageHint::Auto)).unwrap();
        assert_eq!(segs.len(), 3);
        assert_eq!(segs[0].lang, Lang::Hi);
        assert_eq!(segs[1].lang, Lang::En);
        assert_eq!(segs[2].lang, Lang::Hi);
        let mut end = 0;
        for s in &segs {
            assert_eq!(s.char_span.start, end);
            end = s.char_span.end;
        }
        assert_eq!(end, text.chars().count());
    }
}
