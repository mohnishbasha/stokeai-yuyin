//! Percent, unit, range, email, and URL verbaliser (owner: S1-T08, PRD FR-011).
//!
//! Spoken forms (ARCHITECTURE 5.2, "Normalisation: other classes"):
//!
//! - Percent: the number, then "percent" (hi: "प्रतिशत"), then "per annum" (hi: "प्रति वर्ष")
//!   for `p.a.`.
//! - Unit: the number, then the unit name from [`lookup_unit`]. English uses the singular for
//!   exactly one. India uses "metre" and "litre", the US "meter" and "liter".
//! - Range: "ten to fifteen" (hi: "दस से पंद्रह"). The unit or percent of the end follows.
//! - Email: "support at example dot com" (hi: "support एट example डॉट कॉम").
//! - URL: scheme dropped, `www` spelled, "dot" between host labels, "slash" between path
//!   segments, query string and fragment dropped.
//!
//! Words inside an address are read as written and digits one by one. Hindi output speaks the
//! structural words in Devanagari and keeps the Latin words of the address.

use super::number::{digits, number};
use super::{verbalise as verbalise_any, VerbaliseCtx, Verbalised};
use crate::classify::other::{lookup_unit, Email, Percent, Unit, UnitName};
use crate::{Lang, Locale, Semiotic};

/// The word for a separator character in an address. Characters not in the table are skipped.
const SEPARATORS: &[(char, &str, &str)] = &[
    ('.', "dot", "डॉट"),
    ('_', "underscore", "अंडरस्कोर"),
    ('-', "dash", "डैश"),
    ('+', "plus", "प्लस"),
    ('/', "slash", "स्लैश"),
    (':', "colon", "कोलन"),
    ('@', "at", "एट"),
    ('%', "percent", "प्रतिशत"),
    ('=', "equals", "बराबर"),
    ('~', "tilde", "टिल्डा"),
    (',', "comma", "कॉमा"),
];

/// Hindi readings of common top-level domain labels. Other labels are kept as written.
const HINDI_TLDS: &[(&str, &str)] = &[
    ("com", "कॉम"),
    ("org", "ऑर्ग"),
    ("net", "नेट"),
    ("in", "इन"),
    ("co", "सी ओ"),
    ("io", "आई ओ"),
    ("edu", "एडू"),
    ("gov", "गव"),
    ("info", "इन्फो"),
    ("ac", "ए सी"),
];

/// The spelled `www` that starts many hosts.
const WWW: &str = "www";
/// English reading of `www`.
const WWW_EN: &str = "w w w";
/// Hindi reading of `www`.
const WWW_HI: &str = "डब्ल्यू डब्ल्यू डब्ल्यू";

/// The word for "percent".
fn percent_word(lang: Lang) -> &'static str {
    match lang {
        Lang::Hi => "प्रतिशत",
        Lang::En => "percent",
    }
}

/// The words for "per annum".
fn per_annum_words(lang: Lang) -> &'static str {
    match lang {
        Lang::Hi => "प्रति वर्ष",
        Lang::En => "per annum",
    }
}

/// The word that joins the two ends of a range.
fn range_word(lang: Lang) -> &'static str {
    match lang {
        Lang::Hi => "से",
        Lang::En => "to",
    }
}

fn separator_word(c: char, lang: Lang) -> Option<&'static str> {
    SEPARATORS
        .iter()
        .find(|(sep, _, _)| *sep == c)
        .map(|(_, en, hi)| match lang {
            Lang::Hi => *hi,
            Lang::En => *en,
        })
}

/// Spells `s` word by word: letter runs as written, digit runs one digit at a time,
/// separators by name. `tld_map` turns known top-level domain labels into Hindi words.
fn speak_runs(s: &str, lang: Lang, tld_map: bool, out: &mut Vec<String>) {
    let mut rest = s;
    while let Some(c) = rest.chars().next() {
        let run_len = if c.is_ascii_alphabetic() {
            rest.find(|x: char| !x.is_ascii_alphabetic())
        } else if c.is_ascii_digit() {
            rest.find(|x: char| !x.is_ascii_digit())
        } else {
            Some(c.len_utf8())
        }
        .unwrap_or(rest.len());
        let (run, tail) = rest.split_at(run_len);
        rest = tail;
        if c.is_ascii_alphabetic() {
            out.push(tld_word(run, lang, tld_map));
        } else if c.is_ascii_digit() {
            out.push(digits(run, lang));
        } else if let Some(word) = separator_word(c, lang) {
            out.push(word.to_owned());
        }
    }
}

fn tld_word(label: &str, lang: Lang, tld_map: bool) -> String {
    if tld_map && lang == Lang::Hi {
        let lower = label.to_ascii_lowercase();
        if let Some((_, hi)) = HINDI_TLDS.iter().find(|(l, _)| *l == lower) {
            return (*hi).to_owned();
        }
    }
    label.to_owned()
}

/// Speaks a dotted host: `www` spelled, labels joined by "dot", known TLD labels in Hindi.
fn speak_host(host: &str, lang: Lang, out: &mut Vec<String>) {
    let dot = separator_word('.', lang).unwrap_or_default();
    for (i, label) in host.split('.').enumerate() {
        if i > 0 {
            out.push(dot.to_owned());
        }
        if i == 0 && label.eq_ignore_ascii_case(WWW) {
            out.push(
                match lang {
                    Lang::Hi => WWW_HI,
                    Lang::En => WWW_EN,
                }
                .to_owned(),
            );
        } else {
            speak_runs(label, lang, i > 0, out);
        }
    }
}

/// The spoken form of an email address.
///
/// # Examples
///
/// ```
/// use yuyin_text::classify::other::parse_email;
/// use yuyin_text::verbalise::other::email;
/// use yuyin_text::Lang;
/// let e = parse_email("a_b-c1@example.in").unwrap();
/// assert_eq!(email(&e, Lang::En), "a underscore b dash c one at example dot in");
/// assert_eq!(email(&e, Lang::Hi), "a अंडरस्कोर b डैश c एक एट example डॉट इन");
/// ```
#[must_use]
pub fn email(e: &Email, lang: Lang) -> String {
    let mut out = Vec::new();
    speak_runs(&e.local, lang, false, &mut out);
    out.push(separator_word('@', lang).unwrap_or_default().to_owned());
    speak_host(&e.domain, lang, &mut out);
    out.join(" ")
}

/// The spoken form of a URL as written. The scheme, a trailing slash, the query string, and
/// the fragment are not spoken.
///
/// # Examples
///
/// ```
/// use yuyin_text::verbalise::other::url;
/// use yuyin_text::Lang;
/// assert_eq!(url("https://example.com/pay?id=1", Lang::En), "example dot com slash pay");
/// assert_eq!(url("https://example.com/pay", Lang::Hi), "example डॉट कॉम स्लैश pay");
/// ```
#[must_use]
pub fn url(raw: &str, lang: Lang) -> String {
    let lower = raw.to_ascii_lowercase();
    let rest = ["https://", "http://"]
        .iter()
        .find(|p| lower.starts_with(**p))
        .and_then(|p| raw.get(p.len()..))
        .unwrap_or(raw);
    let rest = rest.split(['?', '#']).next().unwrap_or_default();
    let (authority, path) = rest.split_at(rest.find('/').unwrap_or(rest.len()));
    let (host, port) = match authority.split_once(':') {
        Some((h, p)) => (h, Some(p)),
        None => (authority, None),
    };
    let mut out = Vec::new();
    speak_host(host, lang, &mut out);
    if let Some(port) = port {
        out.push(separator_word(':', lang).unwrap_or_default().to_owned());
        out.push(digits(port, lang));
    }
    let slash = separator_word('/', lang).unwrap_or_default();
    for segment in path.trim_end_matches('/').split('/').skip(1) {
        out.push(slash.to_owned());
        speak_runs(segment, lang, false, &mut out);
    }
    out.join(" ")
}

/// The unit name for `symbol` and `value`, in the spelling of `locale`.
fn unit_name(u: &UnitName, plural: bool, lang: Lang, locale: Locale) -> String {
    match lang {
        Lang::Hi => u.hi.to_owned(),
        Lang::En => {
            let name = if plural { u.en_many } else { u.en_one };
            match locale {
                Locale::In => name.to_owned(),
                Locale::Us => name.replace("metre", "meter").replace("litre", "liter"),
            }
        }
    }
}

/// The spoken form of a quantity with a unit, or `None` if the unit is not in the table.
///
/// # Examples
///
/// ```
/// use yuyin_text::classify::number::NumberValue;
/// use yuyin_text::classify::other::Unit;
/// use yuyin_text::verbalise::other::unit;
/// use yuyin_text::{Lang, Locale};
/// let five = Unit { value: NumberValue::Integer { negative: false, value: 5 }, unit: "km".into() };
/// assert_eq!(unit(&five, Lang::En, Locale::In).unwrap(), "five kilometres");
/// assert_eq!(unit(&five, Lang::En, Locale::Us).unwrap(), "five kilometers");
/// assert_eq!(unit(&five, Lang::Hi, Locale::In).unwrap(), "पाँच किलोमीटर");
/// ```
#[must_use]
pub fn unit(u: &Unit, lang: Lang, locale: Locale) -> Option<String> {
    let names = lookup_unit(&u.unit)?;
    let singular = matches!(
        u.value,
        crate::classify::number::NumberValue::Integer { value: 1, .. }
    );
    Some(format!(
        "{} {}",
        number(&u.value, lang, locale),
        unit_name(names, !singular, lang, locale)
    ))
}

/// The spoken form of a percentage.
///
/// # Examples
///
/// ```
/// use yuyin_text::classify::number::NumberValue;
/// use yuyin_text::classify::other::Percent;
/// use yuyin_text::verbalise::other::percent;
/// use yuyin_text::{Lang, Locale};
/// let p = Percent {
///     value: NumberValue::Decimal { negative: false, integer: 8, fraction_digits: "5".into() },
///     per_annum: false,
/// };
/// assert_eq!(percent(&p, Lang::En, Locale::In), "eight point five percent");
/// assert_eq!(percent(&p, Lang::Hi, Locale::In), "आठ दशमलव पाँच प्रतिशत");
/// ```
#[must_use]
pub fn percent(p: &Percent, lang: Lang, locale: Locale) -> String {
    let mut text = format!("{} {}", number(&p.value, lang, locale), percent_word(lang));
    if p.per_annum {
        text.push(' ');
        text.push_str(per_annum_words(lang));
    }
    text
}

/// Verbaliser for `Percent`, `Unit`, `Range`, `Email`, and `Url`, spoken in the context
/// language. Returns `None` for a unit outside the table, so the source text passes through.
#[must_use]
pub fn verbalise(sem: &Semiotic, ctx: &VerbaliseCtx<'_>) -> Option<Verbalised> {
    let text = match sem {
        Semiotic::Percent(p) => percent(p, ctx.lang, ctx.locale),
        Semiotic::Unit(u) => unit(u, ctx.lang, ctx.locale)?,
        Semiotic::Email(e) => email(e, ctx.lang),
        Semiotic::Url(u) => url(&u.raw, ctx.lang),
        Semiotic::Range(r) => {
            let start = verbalise_any(&r.start, ctx)?.text;
            let end = verbalise_any(&r.end, ctx)?.text;
            format!("{start} {} {end}", range_word(ctx.lang))
        }
        _ => return None,
    };
    Some(Verbalised {
        text,
        lang: ctx.lang,
        pace_hint: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::classify::number::NumberValue;
    use crate::classify::other::{parse_email, Range, Url};
    use crate::verbalise::{samples, test_ctx};

    /// Parses `s` as an email and speaks it, or `None` if it is not one. Test convenience.
    fn speak_email(s: &str, lang: Lang) -> Option<String> {
        parse_email(s).map(|e| email(&e, lang))
    }

    fn int(value: u64) -> NumberValue {
        NumberValue::Integer {
            negative: false,
            value,
        }
    }

    fn say(sem: &Semiotic, lang: Lang, locale: Locale) -> Option<String> {
        let mut ctx = test_ctx(lang, "x");
        ctx.locale = locale;
        verbalise(sem, &ctx).map(|v| v.text)
    }

    #[test]
    fn test_other_verbalise_samples_speak_in_both_languages() {
        let expected_en = [
            "five kilometres",
            "help at example dot com",
            "example dot com",
            "ten to fifteen",
            "eight percent",
        ];
        for s in samples::all() {
            let en = say(&s, Lang::En, Locale::In);
            match &s {
                Semiotic::Percent(_)
                | Semiotic::Unit(_)
                | Semiotic::Email(_)
                | Semiotic::Url(_)
                | Semiotic::Range(_) => {
                    let text = en.unwrap_or_default();
                    assert!(expected_en.contains(&text.as_str()), "{s:?}: {text}");
                    assert!(say(&s, Lang::Hi, Locale::In).is_some());
                }
                _ => assert_eq!(en, None),
            }
        }
    }

    #[test]
    fn test_unit_unknown_symbol_passes_through() {
        let u = Semiotic::Unit(Unit {
            value: int(5),
            unit: "xyz".into(),
        });
        assert_eq!(say(&u, Lang::En, Locale::In), None);
    }

    #[test]
    fn test_unit_plural_agreement_and_spelling() {
        let one = Semiotic::Unit(Unit {
            value: int(1),
            unit: "L".into(),
        });
        let two = Semiotic::Unit(Unit {
            value: int(2),
            unit: "L".into(),
        });
        let frac = Semiotic::Unit(Unit {
            value: NumberValue::Decimal {
                negative: false,
                integer: 1,
                fraction_digits: "0".into(),
            },
            unit: "L".into(),
        });
        assert_eq!(
            say(&one, Lang::En, Locale::In).as_deref(),
            Some("one litre")
        );
        assert_eq!(
            say(&two, Lang::En, Locale::In).as_deref(),
            Some("two litres")
        );
        assert_eq!(
            say(&two, Lang::En, Locale::Us).as_deref(),
            Some("two liters")
        );
        assert_eq!(
            say(&frac, Lang::En, Locale::In).as_deref(),
            Some("one point zero litres")
        );
        assert_eq!(say(&two, Lang::Hi, Locale::Us).as_deref(), Some("दो लीटर"));
    }

    #[test]
    fn test_percent_per_annum_both_languages() {
        let p = Semiotic::Percent(Percent {
            value: int(9),
            per_annum: true,
        });
        assert_eq!(
            say(&p, Lang::En, Locale::In).as_deref(),
            Some("nine percent per annum")
        );
        assert_eq!(
            say(&p, Lang::Hi, Locale::In).as_deref(),
            Some("नौ प्रतिशत प्रति वर्ष")
        );
    }

    #[test]
    fn test_range_with_unspeakable_end_passes_through() {
        let r = Semiotic::Range(Range {
            start: Box::new(Semiotic::Cardinal(int(1))),
            end: Box::new(Semiotic::Unit(Unit {
                value: int(2),
                unit: "xyz".into(),
            })),
        });
        assert_eq!(say(&r, Lang::En, Locale::In), None);
    }

    #[test]
    fn test_email_speaks_digits_separators_and_hindi_tlds() {
        assert_eq!(
            speak_email("user+tag@mail.example.co.in", Lang::Hi).as_deref(),
            Some("user प्लस tag एट mail डॉट example डॉट सी ओ डॉट इन")
        );
        assert_eq!(
            speak_email("a.b%c@x2.example.org", Lang::En).as_deref(),
            Some("a dot b percent c at x two dot example dot org")
        );
        // The first label is never mapped, even when it is a TLD word.
        assert_eq!(
            speak_email("a@net.example.com", Lang::Hi).as_deref(),
            Some("a एट net डॉट example डॉट कॉम")
        );
    }

    #[test]
    fn test_url_drops_scheme_query_fragment_and_trailing_slash() {
        for (raw, en) in [
            ("https://example.com", "example dot com"),
            ("HTTP://Example.com/", "Example dot com"),
            (
                "https://example.com/a/b/",
                "example dot com slash a slash b",
            ),
            (
                "https://example.com/a//b",
                "example dot com slash a slash slash b",
            ),
            ("https://example.com/a?x=1#y", "example dot com slash a"),
            ("https://example.com?x=1", "example dot com"),
            ("https://example.com#top", "example dot com"),
            ("www.example.com/x", "w w w dot example dot com slash x"),
            ("WWW.example.com", "w w w dot example dot com"),
            (
                "https://example.com:443/",
                "example dot com colon four four three",
            ),
            (
                "https://example.com/a~b=c,d@e",
                "example dot com slash a tilde b equals c comma d at e",
            ),
            ("https://example.com/a(b)", "example dot com slash a b"),
        ] {
            assert_eq!(url(raw, Lang::En), en, "{raw}");
        }
        assert_eq!(
            say(
                &Semiotic::Url(Url {
                    raw: "www.example.in".into()
                }),
                Lang::Hi,
                Locale::In
            )
            .as_deref(),
            Some("डब्ल्यू डब्ल्यू डब्ल्यू डॉट example डॉट इन")
        );
    }
}
