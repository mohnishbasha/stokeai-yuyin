//! Stage 3: script and language tagging (owner: S1-T02).
//!
//! - Script comes from Unicode blocks: Devanagari is [`Script::Deva`], Latin letters are
//!   [`Script::Latn`], numbers are [`Script::Digit`], everything else is [`Script::Symbol`].
//! - Devanagari words are always [`Lang::Hi`].
//! - A Latin word is decided in this order: acronym shape (all capitals), then the Roman Hindi
//!   and English lexicons. A word in only one of them takes that language. A word in both is
//!   ambiguous ("to", "me", "is") and takes the language of the words around it. A word in
//!   neither is a proper noun if it is capitalised mid-sentence, otherwise the character
//!   n-gram scorer decides.
//! - An explicit language constrains the tagger. `en-IN` and `en-US` make every Latin word
//!   English. `hi` resolves ambiguous words to Hindi and leans the n-gram scorer towards
//!   Hindi. `hinglish` leans it slightly towards Hindi. `auto` has no lean and infers the
//!   sentence language from the words ([`matrix_language`]).
//! - Digits, symbols, and spaces take the sentence's matrix language.
//!
//! Keep the three public signatures stable: classifiers and the segmenter depend on them.

use crate::lexicon::Lexicons;
use crate::{is_devanagari, CleanText, Lang, LanguageHint, Script, Span, SpanKind, TaggedSpan};

/// Lean towards Hindi for the n-gram scorer under an explicit `hi`, in hundredths of a nat.
const NGRAM_LEAN_HI: i32 = 300;
/// Lean towards Hindi for the n-gram scorer under `hinglish`.
const NGRAM_LEAN_HINGLISH: i32 = 100;
/// A capitalised unknown word at the start of a sentence is likely a name or brand. The n-gram
/// score has to beat this much English lean to call it Hindi.
const NGRAM_PROPER_NOUN_PENALTY: i32 = 600;
/// Context window, in words on each side, used to resolve ambiguous words.
const CONTEXT_WINDOW: usize = 2;

/// What the tagger knows about one Latin word before context is applied.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Evidence {
    Decided(Lang),
    Ambiguous,
}

/// Tags every span with a script and a language.
///
/// The output has one entry per input span, in the same order.
///
/// # Examples
///
/// ```
/// use yuyin_text::{clean, tag, tokenise, Lang, LanguageHint, Lexicons, NormaliseOptions, Script};
/// let opts = NormaliseOptions::default();
/// let hi = clean("नमस्ते", &opts).unwrap();
/// let t = tag::tag(&tokenise(&hi), &hi, Lexicons::builtin(), LanguageHint::Auto);
/// assert_eq!((t[0].script, t[0].lang), (Script::Deva, Lang::Hi));
/// let en = clean("Hello", &opts).unwrap();
/// let t = tag::tag(&tokenise(&en), &en, Lexicons::builtin(), LanguageHint::Auto);
/// assert_eq!((t[0].script, t[0].lang), (Script::Latn, Lang::En));
/// let mixed = clean("aapka account balance kam hai", &opts).unwrap();
/// let t = tag::tag(&tokenise(&mixed), &mixed, Lexicons::builtin(), LanguageHint::Auto);
/// let langs: Vec<Lang> = t.iter().filter(|t| t.span.kind == yuyin_text::SpanKind::Word).map(|t| t.lang).collect();
/// assert_eq!(langs, [Lang::Hi, Lang::En, Lang::En, Lang::Hi, Lang::Hi]);
/// ```
#[must_use]
pub fn tag(
    spans: &[Span],
    text: &CleanText,
    lexicons: &Lexicons,
    hint: LanguageHint,
) -> Vec<TaggedSpan> {
    let mut at_sentence_start = true;
    let mut evidence: Vec<Option<Evidence>> = Vec::with_capacity(spans.len());
    let mut tagged: Vec<TaggedSpan> = Vec::with_capacity(spans.len());
    for span in spans {
        let token = text.as_str().get(span.range.clone()).unwrap_or_default();
        let script = script_of(span.kind, token);
        let (lang, ev) = match script {
            Script::Deva => (Lang::Hi, None),
            Script::Latn => {
                let ev = latin_evidence(token, at_sentence_start, lexicons, hint);
                match ev {
                    Evidence::Decided(lang) => (lang, Some(ev)),
                    Evidence::Ambiguous => (Lang::En, Some(ev)),
                }
            }
            _ => (Lang::En, None),
        };
        if matches!(span.kind, SpanKind::Word | SpanKind::Number) {
            at_sentence_start = false;
        } else if crate::segment::is_sentence_end(token) {
            at_sentence_start = true;
        }
        evidence.push(ev);
        tagged.push(TaggedSpan {
            span: span.clone(),
            script,
            lang,
        });
    }
    resolve_ambiguous(&mut tagged, &evidence, hint);
    let context = context_languages(&tagged, text, hint);
    for (t, ctx) in tagged.iter_mut().zip(context) {
        if matches!(t.script, Script::Digit | Script::Symbol) {
            t.lang = ctx;
        }
    }
    tagged
}

fn latin_evidence(
    token: &str,
    at_sentence_start: bool,
    lexicons: &Lexicons,
    hint: LanguageHint,
) -> Evidence {
    if matches!(hint, LanguageHint::EnIn | LanguageHint::EnUs) || is_acronym_shaped(token) {
        return Evidence::Decided(Lang::En);
    }
    match (
        lexicons.roman_hindi.contains(token),
        lexicons.english.contains(token),
    ) {
        (true, false) => Evidence::Decided(Lang::Hi),
        (false, true) => Evidence::Decided(Lang::En),
        (true, true) => Evidence::Ambiguous,
        (false, false) => {
            let mut lean = match hint {
                LanguageHint::Hi => NGRAM_LEAN_HI,
                LanguageHint::Hinglish => NGRAM_LEAN_HINGLISH,
                _ => 0,
            };
            if is_title_case(token) {
                if !at_sentence_start {
                    return Evidence::Decided(Lang::En);
                }
                lean -= NGRAM_PROPER_NOUN_PENALTY;
            }
            Evidence::Decided(lexicons.ngram.classify(token, lean))
        }
    }
}

/// Two or more letters, all upper case ASCII: OTP, KYC, HDFC.
fn is_acronym_shaped(token: &str) -> bool {
    token.chars().count() >= 2 && token.chars().all(|c| c.is_ascii_uppercase())
}

/// An initial capital followed only by lower case letters: Delhi, Swiggy.
fn is_title_case(token: &str) -> bool {
    let mut chars = token.chars();
    chars.next().is_some_and(char::is_uppercase)
        && token.chars().count() >= 2
        && chars.all(char::is_lowercase)
}

/// Gives each ambiguous word the language of the decided words within the context window.
/// A tie falls back to the hint, then to the whole text, then to Hindi.
fn resolve_ambiguous(tagged: &mut [TaggedSpan], evidence: &[Option<Evidence>], hint: LanguageHint) {
    let words: Vec<usize> = (0..tagged.len())
        .filter(|&i| tagged.get(i).is_some_and(|t| t.span.kind == SpanKind::Word))
        .collect();
    let vote = |tagged: &[TaggedSpan], i: usize| -> i32 {
        match (evidence.get(i).copied().flatten(), tagged.get(i)) {
            (Some(Evidence::Ambiguous), _) | (None, None) => 0,
            (_, Some(t)) if t.lang == Lang::Hi => 1,
            _ => -1,
        }
    };
    let overall: i32 = words.iter().map(|&i| vote(tagged, i)).sum();
    let mut resolved = Vec::new();
    for (pos, &i) in words.iter().enumerate() {
        if evidence.get(i).copied().flatten() != Some(Evidence::Ambiguous) {
            continue;
        }
        let lo = pos.saturating_sub(CONTEXT_WINDOW);
        let hi = (pos + CONTEXT_WINDOW + 1).min(words.len());
        let near: i32 = words
            .get(lo..hi)
            .unwrap_or_default()
            .iter()
            .map(|&j| vote(tagged, j))
            .sum();
        let lang = match hint {
            LanguageHint::Hi => Lang::Hi,
            _ if near != 0 => lang_of_sign(near),
            LanguageHint::Hinglish => Lang::Hi,
            _ if overall != 0 => lang_of_sign(overall),
            _ => Lang::Hi,
        };
        resolved.push((i, lang));
    }
    for (i, lang) in resolved {
        if let Some(t) = tagged.get_mut(i) {
            t.lang = lang;
        }
    }
}

fn lang_of_sign(n: i32) -> Lang {
    if n > 0 {
        Lang::Hi
    } else {
        Lang::En
    }
}

fn script_of(kind: SpanKind, token: &str) -> Script {
    match kind {
        SpanKind::Number => Script::Digit,
        SpanKind::Word if token.chars().any(is_devanagari) => Script::Deva,
        SpanKind::Word
            if token
                .chars()
                .any(|c| c.is_ascii_alphabetic() || is_latin(c)) =>
        {
            Script::Latn
        }
        SpanKind::Word | SpanKind::Space | SpanKind::Punctuation => Script::Symbol,
    }
}

/// Latin letters beyond ASCII (Latin-1 Supplement to Latin Extended Additional).
fn is_latin(c: char) -> bool {
    c.is_alphabetic() && matches!(c, '\u{00C0}'..='\u{024F}' | '\u{1E00}'..='\u{1EFF}')
}

/// The sentence-level (matrix) language of a run of tagged spans.
///
/// # Examples
///
/// ```
/// use yuyin_text::{clean, tag, tokenise, Lang, LanguageHint, Lexicons, NormaliseOptions};
/// let opts = NormaliseOptions::default();
/// let hi = clean("आपका बैलेंस OK है", &opts).unwrap();
/// let t = tag::tag(&tokenise(&hi), &hi, Lexicons::builtin(), LanguageHint::Auto);
/// assert_eq!(tag::matrix_language(&t, LanguageHint::Auto), Lang::Hi);
/// let en = clean("Your balance is OK", &opts).unwrap();
/// let t = tag::tag(&tokenise(&en), &en, Lexicons::builtin(), LanguageHint::Auto);
/// assert_eq!(tag::matrix_language(&t, LanguageHint::Auto), Lang::En);
/// assert_eq!(tag::matrix_language(&t, LanguageHint::Hinglish), Lang::Hi);
/// ```
#[must_use]
pub fn matrix_language(tagged: &[TaggedSpan], hint: LanguageHint) -> Lang {
    match hint {
        LanguageHint::Hi | LanguageHint::Hinglish => Lang::Hi,
        LanguageHint::EnIn | LanguageHint::EnUs => Lang::En,
        LanguageHint::Auto => {
            let (hi, en) = tagged
                .iter()
                .filter(|t| t.span.kind == SpanKind::Word)
                .fold((0usize, 0usize), |(hi, en), t| match t.lang {
                    Lang::Hi => (hi + 1, en),
                    Lang::En => (hi, en + 1),
                });
            if en > hi {
                Lang::En
            } else {
                Lang::Hi
            }
        }
    }
}

/// The context language for every span: the matrix language of the sentence it is in.
///
/// Sentences end after a terminator (see [`crate::segment::is_sentence_end`]). Verbalisers
/// speak a semiotic span in its context language (`docs/TEST_PLAN.md` section 5).
///
/// # Examples
///
/// ```
/// use yuyin_text::{clean, tag, tokenise, Lang, LanguageHint, Lexicons, NormaliseOptions};
/// let opts = NormaliseOptions::default();
/// let text = clean("Pay now. अभी दें।", &opts).unwrap();
/// let t = tag::tag(&tokenise(&text), &text, Lexicons::builtin(), LanguageHint::Auto);
/// let ctx = tag::context_languages(&t, &text, LanguageHint::Auto);
/// assert_eq!(ctx.first(), Some(&Lang::En));
/// assert_eq!(ctx.last(), Some(&Lang::Hi));
/// ```
#[must_use]
pub fn context_languages(tagged: &[TaggedSpan], text: &CleanText, hint: LanguageHint) -> Vec<Lang> {
    let mut out = Vec::with_capacity(tagged.len());
    let mut start = 0;
    for (i, t) in tagged.iter().enumerate() {
        let token = text.as_str().get(t.span.range.clone()).unwrap_or_default();
        if crate::segment::is_sentence_end(token) || i + 1 == tagged.len() {
            let sentence = tagged.get(start..=i).unwrap_or_default();
            let lang = matrix_language(sentence, hint);
            out.extend(std::iter::repeat_n(lang, sentence.len()));
            start = i + 1;
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{clean, tokenise, NormaliseOptions};

    fn tagged(text: &str, hint: LanguageHint) -> (CleanText, Vec<TaggedSpan>) {
        let c = clean(text, &NormaliseOptions::new(hint)).unwrap();
        let t = tag(&tokenise(&c), &c, Lexicons::builtin(), hint);
        (c, t)
    }

    #[test]
    fn test_tag_scripts_for_each_token_kind() {
        let (_, t) = tagged("नमस्ते Asha 42 ₹ café 你好", LanguageHint::Auto);
        let scripts: Vec<Script> = t
            .iter()
            .filter(|t| t.span.kind != SpanKind::Space)
            .map(|t| t.script)
            .collect();
        assert_eq!(
            scripts,
            [
                Script::Deva,
                Script::Latn,
                Script::Digit,
                Script::Symbol,
                Script::Latn,
                Script::Symbol,
                Script::Symbol,
            ]
        );
    }

    #[test]
    fn test_tag_digits_take_matrix_language() {
        let (_, t) = tagged("कुल 500 है", LanguageHint::Auto);
        assert!(t.iter().all(|t| t.lang == Lang::Hi));
        let (_, t) = tagged("total 500", LanguageHint::Auto);
        assert!(t.iter().all(|t| t.lang == Lang::En));
    }

    #[test]
    fn test_tag_roman_hindi_lexicon_hit_is_hindi() {
        let lex = Lexicons {
            roman_hindi: crate::lexicon::RomanHindiLexicon::from_tsv("r\td\naapka\tआपका\n"),
            ..Lexicons::default()
        };
        let c = clean("Aapka bill", &NormaliseOptions::default()).unwrap();
        let t = tag(&tokenise(&c), &c, &lex, LanguageHint::Auto);
        assert_eq!(t[0].lang, Lang::Hi);
        assert_eq!(t[2].lang, Lang::En);
    }

    fn word_langs(text: &str, hint: LanguageHint) -> Vec<Lang> {
        let (_, t) = tagged(text, hint);
        t.iter()
            .filter(|t| t.span.kind == SpanKind::Word)
            .map(|t| t.lang)
            .collect()
    }

    #[test]
    fn unit_text_tagger_devanagari_tokenstaggedhindi() {
        let (_, t) = tagged("आपका बैलेंस कम है", LanguageHint::Auto);
        let words: Vec<&TaggedSpan> = t.iter().filter(|t| t.span.kind == SpanKind::Word).collect();
        assert_eq!(words.len(), 4);
        assert!(words
            .iter()
            .all(|t| t.script == Script::Deva && t.lang == Lang::Hi));
        // Devanagari stays Hindi under every hint, even an English one.
        for hint in [LanguageHint::EnIn, LanguageHint::EnUs, LanguageHint::Hi] {
            assert!(word_langs("आपका बैलेंस", hint).iter().all(|l| *l == Lang::Hi));
        }
    }

    #[test]
    fn unit_text_tagger_romanhindi_lexiconhit_taggedhindi() {
        let lex = Lexicons::builtin();
        assert!(lex.roman_hindi.len() >= 20_000);
        for w in ["kya", "haal", "hai", "aapka", "nahi", "kripya"] {
            assert!(lex.roman_hindi.contains(w), "{w}");
        }
        assert_eq!(
            word_langs("kya haal hai", LanguageHint::Auto),
            [Lang::Hi, Lang::Hi, Lang::Hi]
        );
        let (_, t) = tagged("kya haal hai", LanguageHint::Auto);
        assert!(t
            .iter()
            .filter(|t| t.span.kind == SpanKind::Word)
            .all(|t| t.script == Script::Latn));
    }

    #[test]
    fn unit_text_tagger_unknownword_ngramscorer_classified() {
        let lex = Lexicons::builtin();
        // Neither word is in a lexicon, so the n-gram scorer decides.
        for (word, lang) in [("zzbaatein", Lang::Hi), ("transactionable", Lang::En)] {
            assert!(!lex.roman_hindi.contains(word) && !lex.english.contains(word));
            assert_eq!(lex.ngram.classify(word, 0), lang, "{word}");
        }
        assert_eq!(word_langs("zzbaatein", LanguageHint::Auto), [Lang::Hi]);
        assert_eq!(
            word_langs("transactionable", LanguageHint::Auto),
            [Lang::En]
        );
        assert!(lex.ngram.score("kijiyega") > 0);
        assert!(lex.ngram.score("notification") < 0);
    }

    #[test]
    fn unit_text_tagger_explicitlanguage_constrainsoutput() {
        let text = "kya haal hai";
        assert_eq!(word_langs(text, LanguageHint::Auto), [Lang::Hi; 3]);
        assert_eq!(word_langs(text, LanguageHint::Hi), [Lang::Hi; 3]);
        assert_eq!(word_langs(text, LanguageHint::Hinglish), [Lang::Hi; 3]);
        assert_eq!(word_langs(text, LanguageHint::EnIn), [Lang::En; 3]);
        assert_eq!(word_langs(text, LanguageHint::EnUs), [Lang::En; 3]);
        // Auto infers the matrix language per sentence.
        let (_, t) = tagged("Your balance is low", LanguageHint::Auto);
        assert_eq!(matrix_language(&t, LanguageHint::Auto), Lang::En);
        let (_, t) = tagged("aapka balance kam hai", LanguageHint::Auto);
        assert_eq!(matrix_language(&t, LanguageHint::Auto), Lang::Hi);
        // The explicit hint also wins for symbols and digits.
        let (_, t) = tagged("kal 500 hai", LanguageHint::EnUs);
        assert!(t
            .iter()
            .filter(|t| t.script == Script::Digit)
            .all(|t| t.lang == Lang::En));
    }

    #[test]
    fn test_tag_ambiguous_words_follow_their_context() {
        // "to" and "me" are in both lexicons.
        assert_eq!(
            word_langs("I want to go", LanguageHint::Auto),
            [Lang::En; 4]
        );
        assert_eq!(
            word_langs("tum to kal aao", LanguageHint::Auto),
            [Lang::Hi; 4]
        );
        // Alone, the tie goes to Hindi, and an explicit hi always wins.
        assert_eq!(word_langs("to", LanguageHint::Auto), [Lang::Hi]);
        assert_eq!(word_langs("I want to go", LanguageHint::Hi)[2], Lang::Hi);
        assert_eq!(word_langs("to the", LanguageHint::Hinglish)[0], Lang::Hi);
        // A tie in a sentence is settled by the rest of the text.
        assert_eq!(
            word_langs("is hello. to is. is hello", LanguageHint::Auto)[3],
            Lang::En
        );
    }

    #[test]
    fn test_tag_acronyms_and_names_are_english() {
        assert_eq!(
            word_langs("aapka OTP aur KYC", LanguageHint::Auto),
            [Lang::Hi, Lang::En, Lang::Hi, Lang::En]
        );
        // A capitalised unknown word is a name, but not if it is a clear Hindi word.
        assert_eq!(
            word_langs("kal Zorbix aaya", LanguageHint::Auto)[1],
            Lang::En
        );
        assert_eq!(word_langs("Zorbix bolo", LanguageHint::Auto)[0], Lang::En);
        assert_eq!(
            word_langs("Zzbaatein bolo", LanguageHint::Auto)[0],
            Lang::Hi
        );
        // A single capital letter is not title case.
        assert!(!is_title_case("A"));
        assert!(!is_title_case("OTp"));
        assert!(is_title_case("Delhi"));
    }

    #[test]
    fn test_tag_hint_leans_unknown_words_towards_hindi() {
        // A model that scores "zorbix" at -200: English with no lean.
        let lex = Lexicons {
            ngram: crate::lexicon::NgramScorer::from_tsv("ngram\tllr\n^zo\t-200\n"),
            ..Lexicons::default()
        };
        let lang = |hint| {
            let c = clean("zorbix", &NormaliseOptions::new(hint)).unwrap();
            tag(&tokenise(&c), &c, &lex, hint)[0].lang
        };
        assert_eq!(lang(LanguageHint::Auto), Lang::En);
        assert_eq!(lang(LanguageHint::Hinglish), Lang::En);
        assert_eq!(lang(LanguageHint::Hi), Lang::Hi);
        assert_eq!(lang(LanguageHint::EnIn), Lang::En);
    }

    #[test]
    fn test_matrix_language_explicit_hint_wins_and_ties_go_to_hindi() {
        let (_, t) = tagged("hello दुनिया", LanguageHint::Auto);
        assert_eq!(matrix_language(&t, LanguageHint::Auto), Lang::Hi);
        assert_eq!(matrix_language(&t, LanguageHint::EnIn), Lang::En);
        assert_eq!(matrix_language(&t, LanguageHint::EnUs), Lang::En);
        assert_eq!(matrix_language(&t, LanguageHint::Hi), Lang::Hi);
        assert_eq!(matrix_language(&[], LanguageHint::Auto), Lang::Hi);
    }

    #[test]
    fn test_context_languages_one_per_span_per_sentence() {
        let (c, t) = tagged("Pay now! अभी दें। Thanks", LanguageHint::Auto);
        let ctx = context_languages(&t, &c, LanguageHint::Auto);
        assert_eq!(ctx.len(), t.len());
        assert_eq!(ctx[0], Lang::En);
        assert_eq!(ctx[5], Lang::Hi);
        assert_eq!(ctx.last(), Some(&Lang::En));
        assert_eq!(
            context_languages(&[], &c, LanguageHint::Auto),
            Vec::<Lang>::new()
        );
    }
}
