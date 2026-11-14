//! Stage 7: segmentation (owner: S1-T09, ARCHITECTURE 5 and 7).
//!
//! Rules, in priority order:
//!
//! - Split after a sentence terminator (`.`, `!`, `?`, danda `।`, double danda `॥`, or a line
//!   break) when whitespace or the end of the text follows. `3.14` and `example.com` stay whole.
//! - The first segment is short (PRD NFR-001: time to first audio). It ends at the earliest
//!   sentence or clause boundary (`,` `;` `:` `،` followed by whitespace) that fits the budget
//!   [`FIRST_SEGMENT_MAX_CP`]. Later segments end at sentence boundaries and never exceed
//!   [`LATER_SEGMENT_MAX_CP`] (PRD FR-001).
//! - When the budget is reached with no sentence end, the cut falls back to the latest clause
//!   boundary within the budget, then the latest whitespace, then the latest piece boundary,
//!   and only inside a single over-long word at a grapheme cluster boundary.
//! - Never split inside an atomic piece (a semiotic span), whatever its text contains. An atomic
//!   piece longer than the budget overflows it rather than being cut.
//! - A cut is never made inside a grapheme cluster.
//! - Budgets count the spoken text (verbalised text, whitespace runs collapsed to one space).
//! - Trailing whitespace belongs to the segment before it, so the `char_span`s tile the clean
//!   text exactly. The meter sums them (ARCHITECTURE 5.1, 7).
//! - Segment text is the pieces joined, whitespace runs collapsed to one space, trimmed.
//! - Segment language is the context language of its first non-space piece. `pace_hint` is the
//!   smallest piece hint, or 1.0.

use std::ops::Range;

use unicode_segmentation::{GraphemeCursor, UnicodeSegmentation};

use crate::{CleanText, Lang, TaggedSpan};

/// Code point budget for the first segment: short, so the first synthesis call finishes quickly
/// (PRD FR-001 streaming, NFR-001 time to first audio on a 60-character sentence).
pub const FIRST_SEGMENT_MAX_CP: usize = 60;
/// Code point budget for later segments, longer for prosody (PRD FR-001).
pub const LATER_SEGMENT_MAX_CP: usize = 200;
/// Default code point budget for the first segment (S1-T09 wires `config/limits.toml`).
pub const DEFAULT_FIRST_MAX_CHARS: usize = FIRST_SEGMENT_MAX_CP;
/// Default code point budget for later segments.
pub const DEFAULT_MAX_CHARS: usize = LATER_SEGMENT_MAX_CP;

/// Characters that end a clause when whitespace or the end of text follows (ARCHITECTURE 7).
const CLAUSE_MARKS: [char; 4] = [',', ';', ':', '\u{060C}'];

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

/// Segmenter tuning: the code point budgets (PRD FR-001).
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
/// // The first segment ends at the earliest clause boundary.
/// let first = normalise("Hello, how are you doing today?", &NormaliseOptions::new(LanguageHint::EnUs)).unwrap();
/// assert_eq!(first[0].text, "Hello,");
/// ```
#[must_use]
pub fn segment(clean: &CleanText, pieces: &[Piece], opts: &SegmentOptions) -> Vec<Segment> {
    let text = clean.as_str();
    let mut work = pieces.to_vec();
    let mut out: Vec<Segment> = Vec::new();
    let mut start = 0;
    while start < work.len() {
        let first = out.is_empty();
        let cap = if first {
            opts.first_max_chars
        } else {
            opts.max_chars
        };
        let end = find_cut(text, &mut work, start, cap.max(1), first).max(start + 1);
        let group = work.get(start..end).unwrap_or_default();
        match build(text, group) {
            Some(seg) => out.push(seg),
            None => {
                // Whitespace-only tail: give it to the previous segment so the spans still tile.
                if let (Some(last), Some(piece)) = (out.last_mut(), group.last()) {
                    last.char_span.end = char_offset(text, piece.source.end);
                }
            }
        }
        start = end;
    }
    out
}

/// Cut candidates of the segment being scanned, by priority (latest one in each tier).
#[derive(Default)]
struct Fallbacks {
    clause: Option<usize>,
    space: Option<usize>,
    piece: Option<usize>,
}

impl Fallbacks {
    fn best(&self) -> Option<usize> {
        self.clause.or(self.space).or(self.piece)
    }
}

/// Returns the exclusive end index of the segment that starts at `start`.
///
/// `pieces` is mutable only because an over-long plain word is split at a grapheme boundary
/// as the last resort.
fn find_cut(text: &str, pieces: &mut Vec<Piece>, start: usize, cap: usize, first: bool) -> usize {
    let mut len = 0_usize;
    let mut content = false;
    let mut pending_space = false;
    let mut over = false;
    let mut fb = Fallbacks::default();
    let mut i = start;
    while let Some(piece) = pieces.get(i) {
        let space = piece.is_space();
        let n = piece.text.chars().count();
        if space {
            pending_space = true;
        } else {
            let need = len + usize::from(pending_space && content) + n;
            if need > cap && !over {
                if let Some(cut) = fb.best() {
                    return cut;
                }
                if let Some(cut) = split_word(text, pieces, i, cap.saturating_sub(len)) {
                    return cut;
                }
                over = true;
            }
            len = need;
            content = true;
            pending_space = false;
        }
        let Some(piece) = pieces.get(i) else { break };
        let next_is_space = pieces.get(i + 1).is_none_or(Piece::is_space);
        let sentence =
            !piece.atomic && is_sentence_end(&piece.text) && (space || next_is_space) && content;
        let clause = !piece.atomic
            && !space
            && next_is_space
            && !piece.text.is_empty()
            && piece.text.chars().all(|c| CLAUSE_MARKS.contains(&c));
        let boundary = safe_end(text, pieces, i + 1);
        if let Some(end) = boundary {
            if sentence || over || (clause && first) {
                return end;
            }
            if clause {
                fb.clause = Some(end);
            } else if space && content {
                fb.space = Some(end);
            } else if !space {
                fb.piece = Some(end);
            }
        }
        i += 1;
    }
    pieces.len()
}

/// `end` extended over following whitespace pieces, if cutting there is outside any grapheme
/// cluster. `None` if it is not safe.
fn safe_end(text: &str, pieces: &[Piece], end: usize) -> Option<usize> {
    let mut end = end;
    while pieces.get(end).is_some_and(Piece::is_space) {
        end += 1;
    }
    let Some(next) = pieces.get(end) else {
        return Some(end);
    };
    let at = next.source.start;
    let mut cursor = GraphemeCursor::new(at, text.len(), true);
    cursor.is_boundary(text, 0).ok().filter(|b| *b)?;
    Some(end)
}

/// Last resort: splits the plain piece at `idx` so its first part has at most `room` code
/// points (at least one grapheme cluster), and returns the index just after the first part.
/// Atomic pieces and pieces whose text is not a verbatim copy of their source are never split.
fn split_word(text: &str, pieces: &mut Vec<Piece>, idx: usize, room: usize) -> Option<usize> {
    let piece = pieces.get(idx)?;
    if piece.atomic || text.get(piece.source.clone()) != Some(piece.text.as_str()) {
        return None;
    }
    let mut taken = 0;
    let mut at = 0;
    for g in piece.text.graphemes(true) {
        let n = g.chars().count();
        if at > 0 && taken + n > room.max(1) {
            break;
        }
        taken += n;
        at += g.len();
    }
    if at == 0 || at >= piece.text.len() {
        return None;
    }
    let (left, right) = piece.text.split_at(at);
    let mid = piece.source.start + at;
    let head = Piece {
        source: piece.source.start..mid,
        text: left.to_owned(),
        ..piece.clone()
    };
    let tail = Piece {
        source: mid..piece.source.end,
        text: right.to_owned(),
        ..piece.clone()
    };
    pieces.splice(idx..=idx, [head, tail]);
    Some(idx + 1)
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

    fn spoken_len(seg: &Segment) -> usize {
        seg.text.chars().count()
    }

    fn assert_tiles(c: &CleanText, segs: &[Segment]) {
        let mut at = 0;
        for s in segs {
            assert_eq!(s.char_span.start, at, "gap or overlap before {s:?}");
            assert!(s.char_span.end > at, "empty span {s:?}");
            at = s.char_span.end;
        }
        assert_eq!(at, c.char_count());
    }

    fn en_text(words: usize) -> String {
        (0..words).map(|_| "word").collect::<Vec<_>>().join(" ")
    }

    #[test]
    fn unit_text_segmenter_firstsegment_capped60_earliestboundary() {
        let (c, p) = pieces(
            "Hello, this is a long sentence that keeps going and going well past sixty code points.",
            LanguageHint::EnUs,
        );
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert_eq!(segs[0].text, "Hello,");
        assert_eq!(segs[0].char_span, 0..7);
        assert!(spoken_len(&segs[1]) <= DEFAULT_MAX_CHARS);
        // Hindi: the earliest clause mark wins over a later sentence end.
        let (c, p) = pieces("नमस्ते, आप कैसे हैं। ठीक हूँ।", LanguageHint::Hi);
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert_eq!(texts(&segs), ["नमस्ते,", "आप कैसे हैं।", "ठीक हूँ।"]);
        // No punctuation: the cut is at whitespace within 60 code points, no word is cut.
        let (c, p) = pieces(&en_text(30), LanguageHint::EnIn);
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert!(spoken_len(&segs[0]) <= DEFAULT_FIRST_MAX_CHARS);
        assert_eq!(segs[0].text, en_text(12));
        assert!(segs.iter().all(|s| s.text.split(' ').all(|w| w == "word")));
        assert_tiles(&c, &segs);
    }

    #[test]
    fn unit_text_segment_first_split_at_earliest_safe_boundary() {
        let (c, p) = pieces(&en_text(20), LanguageHint::EnUs);
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert_eq!(segs.len(), 2);
        assert_eq!(spoken_len(&segs[0]), 59);
    }

    #[test]
    fn unit_text_segmenter_danda_splitsatsentence() {
        let (c, p) = pieces("पहला वाक्य। दूसरा वाक्य॥ तीसरा", LanguageHint::Hi);
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert_eq!(texts(&segs), ["पहला वाक्य।", "दूसरा वाक्य॥", "तीसरा"]);
        assert_tiles(&c, &segs);
    }

    #[test]
    fn unit_text_segmenter_semioticspan_neversplit() {
        // An atomic span that straddles the first-segment cap stays whole.
        let (c, mut p) = pieces("Pay now please 1234567890 thanks", LanguageHint::EnUs);
        let idx = p.iter().position(|x| x.text == "1234567890").unwrap();
        p[idx].text = "one two three four five six seven eight nine ten ".repeat(2);
        p[idx].atomic = true;
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert!(segs
            .iter()
            .any(|s| s.text.contains("seven eight nine ten one")));
        assert_eq!(segs.len(), 2);
        assert_eq!(segs[0].text, "Pay now please");
        assert_tiles(&c, &segs);
        // An atomic span larger than every budget overflows rather than being cut.
        p[idx].text = "x".repeat(500);
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert!(segs.iter().any(|s| s.text == "x".repeat(500)));
        assert_tiles(&c, &segs);
    }

    #[test]
    fn unit_text_segmenter_fallback_clause_then_whitespace_then_grapheme() {
        // One long Devanagari word with no spaces: cut only at grapheme cluster boundaries.
        let word = "क्षत्रिय".repeat(30);
        let (c, p) = pieces(&word, LanguageHint::Hi);
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert!(segs.len() > 1);
        let joined: String = segs.iter().map(|s| s.text.as_str()).collect();
        assert_eq!(joined, word);
        assert!(segs
            .iter()
            .all(|s| !s.text.starts_with(['\u{094D}', '\u{093F}'])));
        assert!(segs.iter().all(|s| !s.text.ends_with('\u{094D}')));
        assert!(spoken_len(&segs[0]) <= DEFAULT_FIRST_MAX_CHARS);
        assert!(segs.iter().all(|s| spoken_len(s) <= DEFAULT_MAX_CHARS));
        assert_tiles(&c, &segs);
        // A grapheme cluster longer than the budget is kept whole.
        let zalgo = format!("a{}", "\u{0301}".repeat(100));
        let (c, p) = pieces(&zalgo, LanguageHint::EnUs);
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert_eq!(texts(&segs), [c.as_str()]);
    }

    #[test]
    fn unit_text_segmenter_laterfallback_prefers_clause_over_whitespace() {
        let sentence = format!("Start. {}, {}.", en_text(30), en_text(30));
        let (c, p) = pieces(&sentence, LanguageHint::EnUs);
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert_eq!(segs[0].text, "Start.");
        assert_eq!(segs[1].text, format!("{},", en_text(30)));
        assert_eq!(segs[2].text, format!("{}.", en_text(30)));
        assert!(segs
            .iter()
            .skip(1)
            .all(|s| spoken_len(s) <= DEFAULT_MAX_CHARS));
        // Without a comma the later cut is at the last whitespace within the cap.
        let long = format!("Start. {}.", en_text(80));
        let (c, p) = pieces(&long, LanguageHint::EnUs);
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert_eq!(spoken_len(&segs[1]), 199);
        assert!(segs
            .iter()
            .skip(1)
            .all(|s| spoken_len(s) <= DEFAULT_MAX_CHARS));
        assert_tiles(&c, &segs);
    }

    #[test]
    fn unit_text_segment_later_segments_capped_about_200_cp() {
        let text = format!("A. {} B.", en_text(100));
        let (c, p) = pieces(&text, LanguageHint::EnIn);
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert!(segs.len() >= 3);
        assert!(segs
            .iter()
            .skip(1)
            .all(|s| spoken_len(s) <= DEFAULT_MAX_CHARS));
        assert_tiles(&c, &segs);
    }

    #[test]
    fn unit_text_segment_first_segment_capped_about_60_cp() {
        let text = format!("{}. Next.", en_text(40));
        let (c, p) = pieces(&text, LanguageHint::EnUs);
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert!(spoken_len(&segs[0]) <= DEFAULT_FIRST_MAX_CHARS);
        let custom = SegmentOptions {
            first_max_chars: 10,
            max_chars: 20,
        };
        let segs = segment(&c, &p, &custom);
        assert_eq!(spoken_len(&segs[0]), 9);
        assert!(segs.iter().skip(1).all(|s| spoken_len(s) <= 20));
    }

    #[test]
    fn unit_text_segment_split_on_latin_punctuation() {
        let (c, p) = pieces("Yes, no; maybe: so. Done", LanguageHint::EnUs);
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert_eq!(texts(&segs), ["Yes,", "no; maybe: so.", "Done"]);
        // Later segments keep commas inside; a number with a comma is never a clause mark.
        let (c, p) = pieces("Go. 1,000 or 2, whichever. أنا، هو", LanguageHint::EnIn);
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert_eq!(segs[1].text, "1,000 or 2, whichever.");
        assert_tiles(&c, &segs);
        let (c, p) = pieces("1,000 or 2, whichever", LanguageHint::EnIn);
        assert_eq!(
            segment(&c, &p, &SegmentOptions::default())[0].text,
            "1,000 or 2,"
        );
    }

    #[test]
    fn unit_text_segment_split_on_danda() {
        let (c, p) = pieces("यह पहला। यह दूसरा।", LanguageHint::Hi);
        assert_eq!(texts(&segment(&c, &p, &SegmentOptions::default())).len(), 2);
    }

    #[test]
    fn unit_text_segment_char_span_sum_equals_billed_chars() {
        let (c, p) = pieces("नमस्ते।  Hello, world!\n\nBye.   ", LanguageHint::Hinglish);
        let segs = segment(&c, &p, &SegmentOptions::default());
        let sum: usize = segs.iter().map(|s| s.char_span.len()).sum();
        assert_eq!(sum, c.char_count());
    }

    #[test]
    fn unit_text_segment_otp_segment_carries_pace_hint() {
        let (c, mut p) = pieces("Your OTP is 123456. Thanks.", LanguageHint::EnIn);
        let idx = p.iter().position(|x| x.text == "123456").unwrap();
        p[idx].pace_hint = Some(0.85);
        p[idx].atomic = true;
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert_eq!(segs.iter().filter(|s| s.pace_hint < 1.0).count(), 1);
        assert!((segs.last().map_or(0.0, |s| s.pace_hint) - 1.0).abs() < f32::EPSILON);
    }

    #[test]
    fn unit_text_segment_lang_preserved_per_segment() {
        let (c, p) = pieces("Hello there. नमस्ते दोस्तों।", LanguageHint::Auto);
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert_eq!(segs.len(), 2);
        assert_eq!((segs[0].lang, segs[1].lang), (Lang::En, Lang::Hi));
    }

    #[test]
    fn unit_text_segment_semiotic_span_never_split_midway() {
        let (c, mut p) = pieces("Dial 98. Then 99. Done", LanguageHint::EnUs);
        let merged = Piece {
            source: p[2].source.start..p[5].source.end,
            text: "ninety eight. Then".into(),
            lang: Lang::En,
            pace_hint: None,
            atomic: true,
        };
        p.splice(2..=5, [merged]);
        let segs = segment(&c, &p, &SegmentOptions::default());
        assert_eq!(texts(&segs), ["Dial ninety eight. Then 99.", "Done"]);
    }

    #[test]
    fn unit_text_segment_empty_and_whitespace_only_yields_none() {
        let (c, p) = pieces("a b", LanguageHint::EnUs);
        let space_only = &p[1..2];
        assert_eq!(
            segment(&c, space_only, &SegmentOptions::default()),
            Vec::<Segment>::new()
        );
    }

    use proptest::prelude::*;

    fn check_tiling(text: &str) {
        let hint = LanguageHint::Auto;
        let Ok(c) = clean(text, &NormaliseOptions::new(hint)) else {
            return;
        };
        let t = tag::tag(&tokenise(&c), &c, Lexicons::builtin(), hint);
        let ctx = tag::context_languages(&t, &c, hint);
        let p: Vec<Piece> = t
            .iter()
            .zip(ctx)
            .map(|(t, l)| Piece::passthrough(t, l, c.as_str()))
            .collect();
        let segs = segment(&c, &p, &SegmentOptions::default());
        let mut at = 0;
        for s in &segs {
            assert_eq!(s.char_span.start, at);
            assert!(s.char_span.end > at);
            at = s.char_span.end;
        }
        assert_eq!(at, c.char_count());
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(512))]

        #[test]
        fn property_text_segmenter_spans_coverinputexactly_nooverlap(
            any_text in any::<String>(),
            mixed in "[a-zA-Z0-9 ,;:.!?\\n\u{0900}-\u{097F}\u{0964}\u{0965}\u{20B9}]{0,900}",
            long in "([a-z]{1,12}|[\u{0915}-\u{0939}\u{094D}\u{093E}]{1,12})([ ,.\u{0964}]{1,2}){0,1}",
            reps in 1_usize..80,
        ) {
            check_tiling(&any_text);
            check_tiling(&mixed);
            check_tiling(&long.repeat(reps));
        }

        #[test]
        fn property_text_segmenter_caps_hold_for_plain_words(
            words in proptest::collection::vec("[a-z\u{0915}-\u{0939}]{1,15}[,.\u{0964}]?", 1..120),
        ) {
            let text = words.join(" ");
            let (c, p) = pieces(&text, LanguageHint::Auto);
            let segs = segment(&c, &p, &SegmentOptions::default());
            prop_assert!(segs.iter().all(|s| s.text.chars().count() <= DEFAULT_MAX_CHARS));
            prop_assert!(segs.first().is_some_and(|s| s.text.chars().count() <= DEFAULT_FIRST_MAX_CHARS));
        }
    }
}
