//! Stage 7: segmentation (owner: S1-T09).
//!
//! Current behaviour is a stub that S1-T09 extends with clause splitting and the short first
//! segment ([`SegmentOptions`]):
//!
//! - Split after a sentence terminator (`.`, `!`, `?`, danda `।`, double danda `॥`, or a line
//!   break) when whitespace or the end of the text follows. `3.14` and `example.com` stay whole.
//! - Never split inside an atomic piece (a semiotic span), whatever its text contains.
//! - Trailing whitespace belongs to the segment before it, so the `char_span`s tile the clean
//!   text exactly. The meter sums them (ARCHITECTURE 5.1, 7).
//! - Segment text is the pieces joined, whitespace runs collapsed to one space, trimmed.
//! - Segment language is the context language of its first non-space piece. `pace_hint` is the
//!   smallest piece hint, or 1.0.

use std::ops::Range;

use crate::{CleanText, Lang, TaggedSpan};

/// Default code point budget for the first segment (S1-T09 wires `config/limits.toml`).
pub const DEFAULT_FIRST_MAX_CHARS: usize = 60;
/// Default code point budget for later segments.
pub const DEFAULT_MAX_CHARS: usize = 200;

/// Characters that end a sentence when whitespace or the end of text follows.
const TERMINATORS: [char; 5] = ['.', '!', '?', '\u{0964}', '\u{0965}'];

/// One output unit for the engine.
#[derive(Debug, Clone, PartialEq)]
pub struct Segment {
    /// Text to speak.
    pub text: String,
    /// Its language (the context language of the sentence).
    pub lang: Lang,
    /// Speaking pace multiplier, 1.0 is normal.
    pub pace_hint: f32,
    /// Code point range in the clean NFC text. Ranges of consecutive segments tile the text.
    pub char_span: Range<usize>,
}

/// Segmenter tuning. Unused by the stub; S1-T09 implements the budgets.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SegmentOptions {
    /// Code point budget for the first segment.
    pub first_max_chars: usize,
    /// Code point budget for later segments.
    pub max_chars: usize,
}

impl Default for SegmentOptions {
    fn default() -> Self {
        Self {
            first_max_chars: DEFAULT_FIRST_MAX_CHARS,
            max_chars: DEFAULT_MAX_CHARS,
        }
    }
}

/// Input to the segmenter: one token or one semiotic span, after verbalisation.
#[derive(Debug, Clone, PartialEq)]
pub struct Piece {
    /// Byte range in the clean text that this piece replaces.
    pub source: Range<usize>,
    /// What to say for it.
    pub text: String,
    /// Context language of its sentence.
    pub lang: Lang,
    /// Pace hint from the verbaliser, if any.
    pub pace_hint: Option<f32>,
    /// True for a semiotic span: never split inside or after it on its own text.
    pub atomic: bool,
}

impl Piece {
    /// A plain token passed through as written.
    #[must_use]
    pub fn passthrough(span: &TaggedSpan, lang: Lang, text: &str) -> Self {
        Self {
            source: span.span.range.clone(),
            text: text
                .get(span.span.range.clone())
                .unwrap_or_default()
                .to_owned(),
            lang,
            pace_hint: None,
            atomic: false,
        }
    }

    fn is_space(&self) -> bool {
        self.text.chars().all(char::is_whitespace)
    }
}

/// True if `token` ends a sentence: only terminator characters, or whitespace with a line break.
pub(crate) fn is_sentence_end(token: &str) -> bool {
    !token.is_empty()
        && (token.chars().all(|c| TERMINATORS.contains(&c))
            || (token.chars().all(char::is_whitespace) && token.contains('\n')))
}

/// Groups pieces into segments.
///
/// # Examples
///
/// ```
/// use yuyin_text::{normalise, LanguageHint, NormaliseOptions};
/// let hi = normalise("पहला वाक्य। दूसरा वाक्य।", &NormaliseOptions::new(LanguageHint::Hi)).unwrap();
/// assert_eq!(hi.iter().map(|s| s.text.as_str()).collect::<Vec<_>>(), ["पहला वाक्य।", "दूसरा वाक्य।"]);
/// let en = normalise("Pi is 3.14. Done!", &NormaliseOptions::new(LanguageHint::EnIn)).unwrap();
/// assert_eq!(en.iter().map(|s| s.text.as_str()).collect::<Vec<_>>(), ["Pi is 3.14.", "Done!"]);
/// ```
#[must_use]
pub fn segment(clean: &CleanText, pieces: &[Piece], opts: &SegmentOptions) -> Vec<Segment> {
    let _ = opts;
    let text = clean.as_str();
    let mut out: Vec<Segment> = Vec::new();
    let mut start = 0;
    let mut i = 0;
    while let Some(piece) = pieces.get(i) {
        i += 1;
        let ends = !piece.atomic
            && is_sentence_end(&piece.text)
            && (piece.is_space() || pieces.get(i).is_none_or(Piece::is_space));
        if !ends {
            continue;
        }
        while pieces.get(i).is_some_and(Piece::is_space) {
            i += 1;
        }
        let group = pieces.get(start..i).unwrap_or_default();
        if let Some(seg) = build(text, group) {
            out.push(seg);
            start = i;
        }
    }
    let rest = pieces.get(start..).unwrap_or_default();
    match build(text, rest) {
        Some(seg) => out.push(seg),
        None => {
            // Whitespace-only tail: give it to the previous segment so the spans still tile.
            if let (Some(last), Some(end)) = (out.last_mut(), rest.last()) {
                last.char_span.end = char_offset(text, end.source.end);
            }
        }
    }
    out
}

/// Builds a segment from a group of pieces, or `None` if it has nothing to say.
fn build(text: &str, group: &[Piece]) -> Option<Segment> {
    let (first, last) = (group.first()?, group.last()?);
    let joined: String = group.iter().map(|p| p.text.as_str()).collect();
    let spoken = joined.split_whitespace().collect::<Vec<_>>().join(" ");
    if spoken.is_empty() {
        return None;
    }
    let lang = group
        .iter()
        .find(|p| !p.is_space())
        .map_or(first.lang, |p| p.lang);
    let pace_hint = group
        .iter()
        .filter_map(|p| p.pace_hint)
        .fold(1.0_f32, f32::min);
    Some(Segment {
        text: spoken,
        lang,
        pace_hint,
        char_span: char_offset(text, first.source.start)..char_offset(text, last.source.end),
    })
}

/// Code point offset of byte offset `byte` in `text`.
fn char_offset(text: &str, byte: usize) -> usize {
    text.get(..byte)
        .map_or_else(|| text.chars().count(), |s| s.chars().count())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{clean, tag, tokenise, LanguageHint, Lexicons, NormaliseOptions};

    fn pieces(text: &str, hint: LanguageHint) -> (CleanText, Vec<Piece>) {
        let c = clean(text, &NormaliseOptions::new(hint)).unwrap_or_else(|e| panic!("{e}"));
        let t = tag::tag(&tokenise(&c), &c, Lexicons::builtin(), hint);
        let ctx = tag::context_languages(&t, &c, hint);
        let p = t
            .iter()
            .zip(ctx)
            .map(|(t, l)| Piece::passthrough(t, l, c.as_str()))
            .collect();
        (c, p)
    }

    fn texts(segs: &[Segment]) -> Vec<&str> {
        segs.iter().map(|s| s.text.as_str()).collect()
    }

    #[test]
    fn test_segment_splits_on_danda_and_terminators() {
        let (c, p) = pieces("नमस्ते। Kaise ho? Theek hai! Bye.", LanguageHint::Hinglish);
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert_eq!(texts(&segs), ["नमस्ते।", "Kaise ho?", "Theek hai!", "Bye."]);
        assert_eq!(segs[0].char_span, 0..8);
        assert_eq!(segs.last().map(|s| s.char_span.end), Some(c.char_count()));
    }

    #[test]
    fn test_segment_splits_on_line_break_and_double_danda() {
        let (c, p) = pieces("पहली पंक्ति\nदूसरी पंक्ति॥ अंत", LanguageHint::Hi);
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert_eq!(texts(&segs), ["पहली पंक्ति", "दूसरी पंक्ति॥", "अंत"]);
    }

    #[test]
    fn test_segment_does_not_split_without_following_space() {
        let (c, p) = pieces("Visit example.com today.", LanguageHint::EnUs);
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert_eq!(texts(&segs), ["Visit example.com today."]);
    }

    #[test]
    fn test_segment_never_splits_atomic_piece() {
        let (c, mut p) = pieces("Call 98. Then 99. Done", LanguageHint::EnIn);
        // Mark "98. Then" (pieces 2..=5) as one atomic semiotic span with an inner terminator.
        let merged = Piece {
            source: p[2].source.start..p[5].source.end,
            text: "98. Then".into(),
            lang: Lang::En,
            pace_hint: Some(0.8),
            atomic: true,
        };
        p.splice(2..=5, [merged]);
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert_eq!(texts(&segs), ["Call 98. Then 99.", "Done"]);
        assert!((segs[0].pace_hint - 0.8).abs() < f32::EPSILON);
        assert!((segs[1].pace_hint - 1.0).abs() < f32::EPSILON);
    }

    #[test]
    fn test_segment_leading_and_trailing_whitespace_tile() {
        let (c, p) = pieces("\n  Hello.  \n ", LanguageHint::EnUs);
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert_eq!(texts(&segs), ["Hello."]);
        assert_eq!(segs[0].char_span, 0..c.char_count());
    }

    #[test]
    fn test_segment_language_from_first_word_piece() {
        let (c, p) = pieces("Pay now. अभी दें।", LanguageHint::Auto);
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert_eq!(
            segs.iter().map(|s| s.lang).collect::<Vec<_>>(),
            [Lang::En, Lang::Hi]
        );
        assert_eq!(
            segment(&c, &[], &SegmentOptions::default()),
            Vec::<Segment>::new()
        );
    }

    #[test]
    fn test_is_sentence_end_cases() {
        for t in [".", "!", "?", "।", "॥", "\n", " \n "] {
            assert!(is_sentence_end(t), "{t:?}");
        }
        for t in ["", " ", ",", "3.14", "word"] {
            assert!(!is_sentence_end(t), "{t:?}");
        }
        assert_eq!(
            SegmentOptions::default().first_max_chars,
            DEFAULT_FIRST_MAX_CHARS
        );
    }
}
