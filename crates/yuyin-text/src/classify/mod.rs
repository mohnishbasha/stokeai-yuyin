//! Stage 4: classify semiotic spans.
//!
//! One submodule per class owner, so parallel tasks never edit the same file:
//!
//! | Submodule | Semiotic variants | Owner task |
//! |---|---|---|
//! | [`number`] | `Cardinal`, `Ordinal` (cardinal, ordinal, decimal, negative, fraction) | S1-T03 |
//! | [`money`] | `Money` | S1-T04 |
//! | [`datetime`] | `Date`, `Time` | S1-T05 |
//! | [`digits`] | `Phone`, `Otp` (OTP, PIN, card and account tails, PAN-like, long digit strings) | S1-T06 |
//! | [`acronym`] | `Acronym` | S1-T07 |
//! | [`other`] | `Percent`, `Unit`, `Range`, `Email`, `Url` | S1-T08 |
//!
//! Every detector has the [`Detector`] signature: given the context and a token index `at`,
//! it returns `Some(Detection)` if a span of its class starts exactly at `at`. It may read any
//! neighbouring token through [`ClassifyCtx`] (trigger words before, suffixes after), but the
//! detected span always starts at `at` and ends at `Detection::end` (exclusive token index).
//! Trigger words outside the span stay plain text.
//!
//! The payload types live in the owner's submodule, so an owner can add fields without
//! touching this file. Only the variant list of [`Semiotic`] is shared.
//!
//! Dispatch: [`classify`] walks the tokens left to right. At each non-space token it tries
//! [`DETECTORS`] in order and takes the first match, then continues after the match. The
//! order is a contract; change it only with a golden row that shows why.

pub mod acronym;
pub mod datetime;
pub mod digits;
pub mod money;
pub mod number;
pub mod other;

use crate::lexicon::{Lexicons, TenantLexicon};
use crate::{Lang, LanguageHint, Locale, Span, SpanKind, TaggedSpan};

/// A semiotic class with its parsed value (ARCHITECTURE 5.1, 13 variants).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Semiotic {
    /// Currency amount, for example `₹1,25,000`, `Rs 12,450/-`, `$4.25`.
    Money(money::Money),
    /// Calendar date, for example `05/12/2026`, `5 मार्च 2026`, a year in `in 2026`.
    Date(datetime::Date),
    /// Clock time or duration, for example `5:30 PM`, `17:30 hrs`, `2h 15m`.
    Time(datetime::Time),
    /// Phone number, for example `+91 98765 43210` (fictitious).
    Phone(digits::Phone),
    /// Digit-by-digit string: OTP, PIN, card or account tail, PAN-like or Aadhaar-like ID.
    Otp(digits::DigitString),
    /// Cardinal number: integer, decimal, negative, or fraction.
    Cardinal(number::NumberValue),
    /// Ordinal number, for example `3rd`.
    Ordinal(number::Ordinal),
    /// Percentage, for example `8.5%`.
    Percent(other::Percent),
    /// Quantity with a unit, for example `5 km`, `100 Mbps`.
    Unit(other::Unit),
    /// Acronym, for example `KYC`, `PAN`.
    Acronym(acronym::Acronym),
    /// Email address.
    Email(other::Email),
    /// URL.
    Url(other::Url),
    /// Range, for example `10-15`, `$5-$10`.
    Range(other::Range),
}

/// A span after classification. Multi-token detections are merged into one span.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ClassifiedSpan {
    /// The span. For a merged detection the range covers all its tokens and the kind, script,
    /// and language are those of the first token.
    pub tagged: TaggedSpan,
    /// The semiotic value, or `None` for plain text.
    pub semiotic: Option<Semiotic>,
    /// The context (matrix) language of the sentence this span is in. Verbalisers speak in it.
    pub context: Lang,
}

/// What a detector found.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Detection {
    /// Token index one past the last token of the span (exclusive). Must be greater than `at`.
    pub end: usize,
    /// The parsed value.
    pub value: Semiotic,
}

/// The common detector signature.
pub type Detector = fn(&ClassifyCtx<'_>, usize) -> Option<Detection>;

/// Detectors in priority order. At each position the first match wins.
///
/// Why this order:
///
/// 1. `email`, `url`: they contain digits, dots, and slashes that other classes would grab.
/// 2. `datetime`: `05/12/2026` must win over fraction and range, `5:30` over cardinal.
/// 3. `digits`: phone numbers, OTPs, PINs, and tails must win over range (`98765-43210`) and
///    cardinal (`482916`). Digit detectors check trigger words, so plain quantities fall through.
/// 4. `range`: `$5-$10` and `10-15` must win over money and cardinal. The range detector may call
///    the money and number detectors for its two ends.
/// 5. `money`: currency symbol or code with an amount, before cardinal.
/// 6. `percent`, `unit`: a number followed by `%` or a unit, before cardinal.
/// 7. `number`: ordinals and cardinals.
/// 8. `acronym`: letters only, last.
pub const DETECTORS: &[(&str, Detector)] = &[
    ("email", other::detect_email),
    ("url", other::detect_url),
    ("datetime", datetime::detect),
    ("digits", digits::detect),
    ("range", other::detect_range),
    ("money", money::detect),
    ("percent", other::detect_percent),
    ("unit", other::detect_unit),
    ("number", number::detect),
    ("acronym", acronym::detect),
];

/// Everything a detector may look at.
#[derive(Debug, Clone, Copy)]
pub struct ClassifyCtx<'a> {
    /// The cleaned text. Token ranges are byte ranges into it.
    pub text: &'a str,
    /// All tokens of the text.
    pub tokens: &'a [TaggedSpan],
    /// Context language per token, same length as `tokens`.
    pub context: &'a [Lang],
    /// Regional conventions (grouping, date order).
    pub locale: Locale,
    /// The requested language.
    pub hint: LanguageHint,
    /// Built-in lexicons.
    pub lexicons: &'a Lexicons,
    /// Tenant overrides, if any.
    pub tenant: Option<&'a TenantLexicon>,
}

impl ClassifyCtx<'_> {
    /// Number of tokens.
    #[must_use]
    pub fn len(&self) -> usize {
        self.tokens.len()
    }

    /// True if there are no tokens.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.tokens.is_empty()
    }

    /// The text of token `i`, or `""` if `i` is out of range.
    #[must_use]
    pub fn token_text(&self, i: usize) -> &str {
        self.tokens
            .get(i)
            .and_then(|t| self.text.get(t.span.range.clone()))
            .unwrap_or_default()
    }

    /// The kind of token `i`, or `None` if `i` is out of range.
    #[must_use]
    pub fn kind(&self, i: usize) -> Option<SpanKind> {
        self.tokens.get(i).map(|t| t.span.kind)
    }

    /// The context language of token `i` (Hindi if out of range).
    #[must_use]
    pub fn context_lang(&self, i: usize) -> Lang {
        self.context.get(i).copied().unwrap_or(Lang::Hi)
    }

    /// Index of the first non-space token after `i`.
    #[must_use]
    pub fn next_non_space(&self, i: usize) -> Option<usize> {
        (i + 1..self.tokens.len()).find(|&j| self.kind(j) != Some(SpanKind::Space))
    }

    /// Index of the last non-space token before `i`.
    #[must_use]
    pub fn prev_non_space(&self, i: usize) -> Option<usize> {
        (0..i.min(self.tokens.len()))
            .rev()
            .find(|&j| self.kind(j) != Some(SpanKind::Space))
    }

    /// The text from the start of token `start` to the end of token `end - 1`.
    #[must_use]
    pub fn text_between(&self, start: usize, end: usize) -> &str {
        match (
            self.tokens.get(start),
            end.checked_sub(1).and_then(|e| self.tokens.get(e)),
        ) {
            (Some(first), Some(last)) if start < end => self
                .text
                .get(first.span.range.start..last.span.range.end)
                .unwrap_or_default(),
            _ => "",
        }
    }
}

/// Classifies every token with [`DETECTORS`].
///
/// The output spans are contiguous and cover the text. Tokens no detector claims come back
/// with `semiotic: None`.
///
/// # Examples
///
/// ```
/// use yuyin_text::{clean, classify, tag, tokenise, LanguageHint, Lexicons, NormaliseOptions};
/// let opts = NormaliseOptions::new(LanguageHint::Hi);
/// let text = clean("नमस्ते Asha", &opts).unwrap();
/// let tagged = tag::tag(&tokenise(&text), &text, Lexicons::builtin(), opts.language);
/// let context = tag::context_languages(&tagged, &text, opts.language);
/// let ctx = classify::ClassifyCtx {
///     text: text.as_str(), tokens: &tagged, context: &context, locale: opts.locale,
///     hint: opts.language, lexicons: Lexicons::builtin(), tenant: None,
/// };
/// // Plain words in Hindi and English carry no semiotic value.
/// assert!(classify::classify(&ctx).iter().all(|s| s.semiotic.is_none()));
/// ```
#[must_use]
pub fn classify(ctx: &ClassifyCtx<'_>) -> Vec<ClassifiedSpan> {
    classify_with(ctx, DETECTORS)
}

/// [`classify`] with an explicit detector list. Used by tests to check dispatch.
#[must_use]
pub fn classify_with(ctx: &ClassifyCtx<'_>, detectors: &[(&str, Detector)]) -> Vec<ClassifiedSpan> {
    let mut out = Vec::with_capacity(ctx.len());
    let mut i = 0;
    while let Some(token) = ctx.tokens.get(i) {
        let found = if token.span.kind == SpanKind::Space {
            None
        } else {
            detectors
                .iter()
                .find_map(|(_, detect)| detect(ctx, i).filter(|d| d.end > i && d.end <= ctx.len()))
        };
        let context = ctx.context_lang(i);
        if let Some(d) = found {
            let last = ctx.tokens.get(d.end - 1).unwrap_or(token);
            out.push(ClassifiedSpan {
                tagged: TaggedSpan {
                    span: Span {
                        range: token.span.range.start..last.span.range.end,
                        kind: token.span.kind,
                    },
                    script: token.script,
                    lang: token.lang,
                },
                semiotic: Some(d.value),
                context,
            });
            i = d.end;
        } else {
            out.push(ClassifiedSpan {
                tagged: token.clone(),
                semiotic: None,
                context,
            });
            i += 1;
        }
    }
    out
}

/// Test helpers shared by the classifier submodules.
#[cfg(test)]
pub(crate) mod testutil {
    use super::{ClassifyCtx, Detection};
    use crate::{clean, tag, tokenise, Lang, LanguageHint, Lexicons, NormaliseOptions, TaggedSpan};

    /// Owned inputs for a [`ClassifyCtx`].
    pub(crate) struct Fixture {
        pub(crate) text: String,
        pub(crate) tokens: Vec<TaggedSpan>,
        pub(crate) context: Vec<Lang>,
        pub(crate) hint: LanguageHint,
    }

    impl Fixture {
        pub(crate) fn new(text: &str, hint: LanguageHint) -> Self {
            let opts = NormaliseOptions::new(hint);
            let c = clean(text, &opts).unwrap_or_else(|e| panic!("bad fixture: {e}"));
            let tokens = tag::tag(&tokenise(&c), &c, Lexicons::builtin(), hint);
            let context = tag::context_languages(&tokens, &c, hint);
            Self {
                text: c.as_str().to_owned(),
                tokens,
                context,
                hint,
            }
        }

        pub(crate) fn ctx(&self) -> ClassifyCtx<'_> {
            ClassifyCtx {
                text: &self.text,
                tokens: &self.tokens,
                context: &self.context,
                locale: crate::Locale::from_hint(self.hint),
                hint: self.hint,
                lexicons: Lexicons::builtin(),
                tenant: None,
            }
        }

        /// Runs `detect` at every token index and returns the first detection, if any.
        pub(crate) fn first(&self, detect: super::Detector) -> Option<(usize, Detection)> {
            let ctx = self.ctx();
            (0..ctx.len()).find_map(|i| detect(&ctx, i).map(|d| (i, d)))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::testutil::Fixture;
    use super::*;

    fn detect_two_words(ctx: &ClassifyCtx<'_>, at: usize) -> Option<Detection> {
        (ctx.token_text(at) == "KYC").then(|| Detection {
            end: ctx.next_non_space(at).map_or(at + 1, |j| j + 1),
            value: Semiotic::Acronym(acronym::Acronym {
                term: ctx.token_text(at).to_owned(),
            }),
        })
    }

    fn detect_bad_end(ctx: &ClassifyCtx<'_>, at: usize) -> Option<Detection> {
        ctx.tokens.get(at).map(|_| Detection {
            end: at,
            value: Semiotic::Acronym(acronym::Acronym {
                term: String::new(),
            }),
        })
    }

    #[test]
    fn test_classify_merges_multi_token_detection() {
        let f = Fixture::new("Aapka KYC pending hai", LanguageHint::Hinglish);
        let spans = classify_with(&f.ctx(), &[("two", detect_two_words)]);
        let texts: Vec<&str> = spans
            .iter()
            .map(|s| &f.text[s.tagged.span.range.clone()])
            .collect();
        assert_eq!(texts, ["Aapka", " ", "KYC pending", " ", "hai"]);
        assert!(spans[2].semiotic.is_some());
        assert_eq!(spans[2].context, Lang::Hi);
        assert!(spans
            .iter()
            .enumerate()
            .all(|(i, s)| i == 2 || s.semiotic.is_none()));
    }

    #[test]
    fn test_classify_ignores_detection_that_does_not_advance() {
        let f = Fixture::new("नमस्ते duniya", LanguageHint::Hi);
        let spans = classify_with(&f.ctx(), &[("bad", detect_bad_end)]);
        assert_eq!(spans.len(), f.tokens.len());
        assert!(spans.iter().all(|s| s.semiotic.is_none()));
    }

    #[test]
    fn test_classify_with_stubs_leaves_plain_text_unclassified() {
        let f = Fixture::new("Your OTP is 482916. आपका कोड 4829 है।", LanguageHint::Auto);
        let spans = classify(&f.ctx());
        assert_eq!(spans.len(), f.tokens.len());
        let names: Vec<&str> = DETECTORS.iter().map(|(n, _)| *n).collect();
        assert_eq!(
            names,
            [
                "email", "url", "datetime", "digits", "range", "money", "percent", "unit",
                "number", "acronym"
            ]
        );
    }

    #[test]
    fn test_classify_ctx_neighbour_helpers() {
        let f = Fixture::new("card ending  4417", LanguageHint::EnIn);
        let ctx = f.ctx();
        assert!(!ctx.is_empty());
        assert_eq!(ctx.token_text(2), "ending");
        assert_eq!(ctx.token_text(99), "");
        assert_eq!(ctx.next_non_space(2), Some(4));
        assert_eq!(ctx.prev_non_space(4), Some(2));
        assert_eq!(ctx.prev_non_space(0), None);
        assert_eq!(ctx.next_non_space(4), None);
        assert_eq!(ctx.kind(4), Some(SpanKind::Number));
        assert_eq!(ctx.kind(99), None);
        assert_eq!(ctx.text_between(2, 5), "ending  4417");
        assert_eq!(ctx.text_between(2, 2), "");
        assert_eq!(ctx.context_lang(0), Lang::En);
        assert_eq!(ctx.context_lang(99), Lang::Hi);
    }
}
