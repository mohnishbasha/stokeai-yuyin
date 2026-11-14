//! Stage 3: script and language tagging (owner: S1-T02).
//!
//! Current behaviour is a stub that S1-T02 replaces with lexicon plus n-gram scoring:
//!
//! - Script comes from Unicode blocks: Devanagari is [`Script::Deva`], Latin letters are
//!   [`Script::Latn`], numbers are [`Script::Digit`], everything else is [`Script::Symbol`].
//! - Language: Deva words are [`Lang::Hi`]. Latn words are [`Lang::En`] unless the Roman Hindi
//!   lexicon contains them. Digits, symbols, and spaces take the sentence's matrix language.
//! - Matrix language per sentence ([`matrix_language`]): `hi` and `hinglish` give Hi, `en-IN`
//!   and `en-US` give En, `auto` takes the majority of word languages (ties go to Hi).
//!
//! Keep the three public signatures stable: classifiers and the segmenter depend on them.

use crate::lexicon::Lexicons;
use crate::{is_devanagari, CleanText, Lang, LanguageHint, Script, Span, SpanKind, TaggedSpan};

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
/// ```
#[must_use]
pub fn tag(
    spans: &[Span],
    text: &CleanText,
    lexicons: &Lexicons,
    hint: LanguageHint,
) -> Vec<TaggedSpan> {
    let mut tagged: Vec<TaggedSpan> = spans
        .iter()
        .map(|span| {
            let token = text.as_str().get(span.range.clone()).unwrap_or_default();
            let script = script_of(span.kind, token);
            let lang = match script {
                Script::Deva => Lang::Hi,
                Script::Latn if lexicons.roman_hindi.contains(token) => Lang::Hi,
                _ => Lang::En,
            };
            TaggedSpan {
                span: span.clone(),
                script,
                lang,
            }
        })
        .collect();
    let context = context_languages(&tagged, text, hint);
    for (t, ctx) in tagged.iter_mut().zip(context) {
        if matches!(t.script, Script::Digit | Script::Symbol) {
            t.lang = ctx;
        }
    }
    tagged
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
