//! Stage 5: verbalise semiotic spans into spoken words.
//!
//! One submodule per class owner, mirroring [`crate::classify`]. Every submodule exposes a
//! function with the [`Verbaliser`] signature:
//!
//! ```text
//! pub fn verbalise(sem: &Semiotic, ctx: &VerbaliseCtx<'_>) -> Option<Verbalised>
//! ```
//!
//! It returns `None` for variants it does not own or cannot speak. [`verbaliser_for`] routes
//! each [`Semiotic`] variant to its owner. A span whose verbaliser returns `None` is passed
//! through as written, and it stays atomic (the segmenter never splits it).
//!
//! Output conventions (`docs/TEST_PLAN.md` section 5): speak in [`VerbaliseCtx::lang`], the
//! context language of the sentence. Hindi output is Devanagari.

pub mod acronym;
pub mod datetime;
pub mod digits;
pub mod money;
pub mod number;
pub mod other;

use crate::classify::ClassifiedSpan;
use crate::lexicon::{Lexicons, TenantLexicon};
use crate::segment::Piece;
use crate::{Lang, LanguageHint, Locale, NormaliseOptions, Semiotic};

/// The spoken form of one span.
#[derive(Debug, Clone, PartialEq)]
pub struct Verbalised {
    /// Words to speak.
    pub text: String,
    /// Language of `text`.
    pub lang: Lang,
    /// Speaking pace multiplier, for example `0.85` for slow digit-by-digit OTPs. `None` is 1.0.
    pub pace_hint: Option<f32>,
}

/// Everything a verbaliser may look at.
#[derive(Debug, Clone, Copy)]
pub struct VerbaliseCtx<'a> {
    /// The context language: speak in it.
    pub lang: Lang,
    /// Regional conventions (lakh and crore or million and billion).
    pub locale: Locale,
    /// The requested language.
    pub hint: LanguageHint,
    /// Built-in lexicons.
    pub lexicons: &'a Lexicons,
    /// Tenant overrides, if any.
    pub tenant: Option<&'a TenantLexicon>,
    /// The span's source text as written.
    pub source: &'a str,
}

/// The common verbaliser signature.
pub type Verbaliser = fn(&Semiotic, &VerbaliseCtx<'_>) -> Option<Verbalised>;

/// The verbaliser that owns `sem`'s variant.
#[must_use]
pub fn verbaliser_for(sem: &Semiotic) -> Verbaliser {
    match sem {
        Semiotic::Cardinal(_) | Semiotic::Ordinal(_) => number::verbalise,
        Semiotic::Money(_) => money::verbalise,
        Semiotic::Date(_) | Semiotic::Time(_) => datetime::verbalise,
        Semiotic::Phone(_) | Semiotic::Otp(_) => digits::verbalise,
        Semiotic::Acronym(_) => acronym::verbalise,
        Semiotic::Percent(_)
        | Semiotic::Unit(_)
        | Semiotic::Email(_)
        | Semiotic::Url(_)
        | Semiotic::Range(_) => other::verbalise,
    }
}

/// Speaks `sem` with its owner's verbaliser.
///
/// # Examples
///
/// ```
/// use yuyin_text::classify::acronym::Acronym;
/// use yuyin_text::verbalise::{verbalise, VerbaliseCtx};
/// use yuyin_text::{Lang, LanguageHint, Lexicons, Locale, Semiotic};
/// let sem = Semiotic::Acronym(Acronym { term: "KYC".into() });
/// for (lang, hint) in [(Lang::Hi, LanguageHint::Hi), (Lang::En, LanguageHint::EnIn)] {
///     let ctx = VerbaliseCtx {
///         lang, locale: Locale::In, hint, lexicons: Lexicons::builtin(), tenant: None, source: "KYC",
///     };
///     // `None` means "pass the source text through"; S1-T07 makes this `Some`.
///     let spoken = verbalise(&sem, &ctx).map_or_else(|| "KYC".to_owned(), |v| v.text);
///     assert!(!spoken.is_empty());
/// }
/// ```
#[must_use]
pub fn verbalise(sem: &Semiotic, ctx: &VerbaliseCtx<'_>) -> Option<Verbalised> {
    verbaliser_for(sem)(sem, ctx)
}

/// Turns a classified span into a segmenter piece.
///
/// Plain spans pass through. Semiotic spans are verbalised in their context language and
/// marked atomic. If the verbaliser returns `None`, the source text is kept, still atomic.
#[must_use]
pub fn to_piece(
    span: &ClassifiedSpan,
    text: &str,
    opts: &NormaliseOptions<'_>,
    lexicons: &Lexicons,
) -> Piece {
    let Some(sem) = &span.semiotic else {
        return Piece::passthrough(&span.tagged, span.context, text);
    };
    let range = span.tagged.span.range.clone();
    let source = text.get(range.clone()).unwrap_or_default();
    let ctx = VerbaliseCtx {
        lang: span.context,
        locale: opts.locale,
        hint: opts.language,
        lexicons,
        tenant: opts.tenant_lexicon,
        source,
    };
    let (spoken, pace_hint) = match verbalise(sem, &ctx) {
        Some(v) => (v.text, v.pace_hint),
        None => (source.to_owned(), None),
    };
    Piece {
        source: range,
        text: spoken,
        lang: span.context,
        pace_hint,
        atomic: true,
    }
}

/// Sample values for every variant, shared by verbaliser tests.
#[cfg(test)]
pub(crate) mod samples {
    use crate::classify::number::{NumberValue, Ordinal};
    use crate::classify::{acronym, datetime, digits, money, other};
    use crate::Semiotic;

    pub(crate) fn int(value: u64) -> NumberValue {
        NumberValue::Integer {
            negative: false,
            value,
        }
    }

    pub(crate) fn all() -> Vec<Semiotic> {
        vec![
            Semiotic::Money(money::Money {
                currency: money::Currency::Inr,
                amount: int(4500),
            }),
            Semiotic::Date(datetime::Date {
                day: Some(5),
                month: Some(12),
                year: Some(2026),
            }),
            Semiotic::Time(datetime::Time {
                hour: 17,
                minute: 30,
                second: None,
                meridiem: Some(datetime::Meridiem::Pm),
                hours_suffix: false,
            }),
            Semiotic::Phone(digits::Phone {
                country_code: Some("91".into()),
                digits: "9000000000".into(),
            }),
            Semiotic::Otp(digits::DigitString {
                kind: digits::DigitStringKind::Otp,
                digits: "000000".into(),
            }),
            Semiotic::Cardinal(int(25)),
            Semiotic::Ordinal(Ordinal { value: 3 }),
            Semiotic::Percent(other::Percent { value: int(8) }),
            Semiotic::Unit(other::Unit {
                value: int(5),
                unit: "km".into(),
            }),
            Semiotic::Acronym(acronym::Acronym { term: "KYC".into() }),
            Semiotic::Email(other::Email {
                local: "help".into(),
                domain: "example.com".into(),
            }),
            Semiotic::Url(other::Url {
                raw: "https://example.com".into(),
            }),
            Semiotic::Range(other::Range {
                start: Box::new(Semiotic::Cardinal(int(10))),
                end: Box::new(Semiotic::Cardinal(int(15))),
            }),
        ]
    }
}

/// Test helper: a context for `lang`.
#[cfg(test)]
pub(crate) fn test_ctx(lang: Lang, source: &str) -> VerbaliseCtx<'_> {
    VerbaliseCtx {
        lang,
        locale: Locale::In,
        hint: LanguageHint::Auto,
        lexicons: Lexicons::builtin(),
        tenant: None,
        source,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{clean, tag, tokenise, Span, SpanKind, TaggedSpan};

    #[test]
    fn test_verbalise_dispatch_routes_each_variant_to_its_owner() {
        let c = test_ctx(Lang::Hi, "x");
        for s in samples::all() {
            let owner: Verbaliser = match &s {
                Semiotic::Cardinal(_) | Semiotic::Ordinal(_) => number::verbalise,
                Semiotic::Money(_) => money::verbalise,
                Semiotic::Date(_) | Semiotic::Time(_) => datetime::verbalise,
                Semiotic::Phone(_) | Semiotic::Otp(_) => digits::verbalise,
                Semiotic::Acronym(_) => acronym::verbalise,
                _ => other::verbalise,
            };
            assert_eq!(verbaliser_for(&s) as usize, owner as usize, "{s:?}");
            assert_eq!(verbalise(&s, &c), owner(&s, &c));
        }
        assert_eq!(samples::all().len(), 13);
    }

    fn span(range: std::ops::Range<usize>) -> TaggedSpan {
        TaggedSpan {
            span: Span {
                range,
                kind: SpanKind::Word,
            },
            script: crate::Script::Latn,
            lang: Lang::En,
        }
    }

    #[test]
    fn test_to_piece_unverbalised_semiotic_keeps_source_and_is_atomic() {
        let text = "Your KYC is due";
        let cs = ClassifiedSpan {
            tagged: span(5..8),
            semiotic: Some(Semiotic::Acronym(crate::classify::acronym::Acronym {
                term: "KYC".into(),
            })),
            context: Lang::En,
        };
        let opts = NormaliseOptions::default();
        let p = to_piece(&cs, text, &opts, Lexicons::builtin());
        assert_eq!(p.text, "KYC");
        assert_eq!(p.source, 5..8);
        assert!(p.atomic);
        assert_eq!(p.pace_hint, None);
    }

    #[test]
    fn test_to_piece_plain_span_passes_through() {
        let opts = NormaliseOptions::new(LanguageHint::Hi);
        let c = clean("नमस्ते", &opts).unwrap_or_else(|e| panic!("{e}"));
        let t = tag::tag(&tokenise(&c), &c, Lexicons::builtin(), opts.language);
        let cs = ClassifiedSpan {
            tagged: t[0].clone(),
            semiotic: None,
            context: Lang::Hi,
        };
        let p = to_piece(&cs, c.as_str(), &opts, Lexicons::builtin());
        assert_eq!(p.text, "नमस्ते");
        assert!(!p.atomic);
        assert_eq!(p.lang, Lang::Hi);
    }
}
