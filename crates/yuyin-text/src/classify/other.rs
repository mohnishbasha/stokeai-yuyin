//! Percent, unit, range, email, and URL detection (owner: S1-T08, PRD FR-011).
//!
//! Detected shapes (rules in ARCHITECTURE 5.2, "Normalisation: other classes"):
//!
//! - Percent: a number directly followed by `%`, with an optional `p.a.` after it.
//! - Unit: a number, glued or after one space, followed by a symbol from the built-in table
//!   ([`lookup_unit`]), for example `5 km`, `50GB`, `100 Mbps`, `30°C`, `60 km/h`.
//! - Range: two non-negative numbers joined by a tight `-` or an en dash, start below end
//!   (`10-15`). A percent or unit after the range belongs to the end (`5-10 kg`).
//! - Email: `local@domain.tld`, ASCII only.
//! - URL: text starting with `http://`, `https://`, or `www.`.
//!
//! Spoken forms are in [`crate::verbalise::other`]. Golden rows: `golden/other.tsv` (classes
//! `percent`, `unit`, `range`, `email`, `url`).

use std::cmp::Ordering;

use super::number::{parse_number, NumberValue};
use super::{ClassifyCtx, Detection, Semiotic};
use crate::SpanKind;

/// Longest email local part (RFC 5321).
const MAX_EMAIL_LOCAL: usize = 64;
/// Longest DNS label (RFC 1035).
const MAX_LABEL: usize = 63;
/// Shortest top-level domain.
const MIN_TLD: usize = 2;
/// Digits at which an ungrouped number on either side of a dash looks like an identifier or a
/// phone number rather than a range.
const ID_LIKE_MIN_DIGITS: usize = 7;
/// The scheme prefixes that make text a URL, lowercase.
const URL_PREFIXES: [&str; 3] = ["https://", "http://", "www."];
/// Characters allowed in a URL after the host, other than ASCII letters and digits.
const URL_TAIL_CHARS: &str = "-._~/:%+=,@?#&;!*'()$";
/// Characters trimmed from the end of an email or URL: sentence punctuation, closers, danda.
const TRAILING_PUNCT: &str = ".,;:!?)]}>'\"\u{0964}\u{0965}";
/// The en dash, accepted in ranges with or without spaces around it.
const EN_DASH: &str = "\u{2013}";
/// The minus sign, accepted as a sign like `-`.
const MINUS_SIGN: &str = "\u{2212}";
/// The `p.a.` suffix of an annual rate, lowercase and without the final dot.
const PER_ANNUM: &str = "p.a";

/// A parsed percentage.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Percent {
    /// The number before `%`.
    pub value: NumberValue,
    /// True when `p.a.` follows (`9% p.a.`).
    pub per_annum: bool,
}

/// A parsed quantity with a unit.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Unit {
    /// The quantity.
    pub value: NumberValue,
    /// The unit as written, for example `"km"`, `"Mbps"`.
    pub unit: String,
}

/// A parsed email address.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Email {
    /// The part before `@`.
    pub local: String,
    /// The part after `@`.
    pub domain: String,
}

/// A parsed URL.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Url {
    /// The URL as written.
    pub raw: String,
}

/// A parsed range, for example `10-15` or `5-10 kg`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Range {
    /// The lower end.
    pub start: Box<Semiotic>,
    /// The upper end.
    pub end: Box<Semiotic>,
}

/// The names of one unit.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct UnitName {
    /// Accepted spellings, for example `["Mbps", "mbps"]`.
    pub symbols: &'static [&'static str],
    /// English name for exactly one, in India spelling (`kilometre`).
    pub en_one: &'static str,
    /// English plural, in India spelling (`kilometres`).
    pub en_many: &'static str,
    /// Hindi name, which does not inflect.
    pub hi: &'static str,
}

macro_rules! unit {
    ([$($sym:literal),+], $one:literal, $many:literal, $hi:literal) => {
        UnitName { symbols: &[$($sym),+], en_one: $one, en_many: $many, hi: $hi }
    };
}

/// The built-in unit table. Time units belong to the time class and the ambiguous single
/// letters `m` and `l` are left out on purpose.
const UNITS: &[UnitName] = &[
    unit!(["mm", "MM"], "millimetre", "millimetres", "मिलीमीटर"),
    unit!(["cm", "CM"], "centimetre", "centimetres", "सेंटीमीटर"),
    unit!(["km", "Km", "KM"], "kilometre", "kilometres", "किलोमीटर"),
    unit!(["ft"], "foot", "feet", "फुट"),
    unit!(["mg"], "milligram", "milligrams", "मिलीग्राम"),
    unit!(["g", "gm"], "gram", "grams", "ग्राम"),
    unit!(["kg", "Kg", "KG"], "kilogram", "kilograms", "किलोग्राम"),
    unit!(["ml", "mL", "ML"], "millilitre", "millilitres", "मिलीलीटर"),
    unit!(["L", "ltr"], "litre", "litres", "लीटर"),
    unit!(["KB", "kB", "kb"], "kilobyte", "kilobytes", "किलोबाइट"),
    unit!(["MB", "mb"], "megabyte", "megabytes", "मेगाबाइट"),
    unit!(["GB", "gb", "Gb"], "gigabyte", "gigabytes", "गीगाबाइट"),
    unit!(["TB", "tb"], "terabyte", "terabytes", "टेराबाइट"),
    unit!(
        ["kbps", "Kbps", "KBPS"],
        "kilobit per second",
        "kilobits per second",
        "किलोबिट प्रति सेकंड"
    ),
    unit!(
        ["Mbps", "mbps", "MBPS", "Mb/s"],
        "megabit per second",
        "megabits per second",
        "मेगाबिट प्रति सेकंड"
    ),
    unit!(
        ["Gbps", "gbps", "GBPS"],
        "gigabit per second",
        "gigabits per second",
        "गीगाबिट प्रति सेकंड"
    ),
    unit!(["Hz"], "hertz", "hertz", "हर्ट्ज़"),
    unit!(["kHz"], "kilohertz", "kilohertz", "किलोहर्ट्ज़"),
    unit!(["MHz"], "megahertz", "megahertz", "मेगाहर्ट्ज़"),
    unit!(["GHz", "ghz"], "gigahertz", "gigahertz", "गीगाहर्ट्ज़"),
    unit!(["kW", "KW"], "kilowatt", "kilowatts", "किलोवाट"),
    unit!(
        ["kWh", "KWh", "kwh", "KWH"],
        "kilowatt hour",
        "kilowatt hours",
        "किलोवाट घंटा"
    ),
    unit!(
        ["mAh", "mah"],
        "milliampere hour",
        "milliampere hours",
        "मिलीएम्पियर आवर"
    ),
    unit!(
        ["km/h", "kmph", "km/hr", "kph"],
        "kilometre per hour",
        "kilometres per hour",
        "किलोमीटर प्रति घंटा"
    ),
    unit!(["mph"], "mile per hour", "miles per hour", "मील प्रति घंटा"),
    unit!(
        ["\u{b0}C", "\u{2103}"],
        "degree Celsius",
        "degrees Celsius",
        "डिग्री सेल्सियस"
    ),
    unit!(
        ["\u{b0}F"],
        "degree Fahrenheit",
        "degrees Fahrenheit",
        "डिग्री फ़ारेनहाइट"
    ),
];

/// The names for a unit symbol, or `None` if the symbol is not in the table.
///
/// # Examples
///
/// ```
/// use yuyin_text::classify::other::lookup_unit;
/// // English and Hindi names for the same symbol.
/// let mbps = lookup_unit("Mbps").unwrap();
/// assert_eq!(mbps.en_many, "megabits per second");
/// assert_eq!(mbps.hi, "मेगाबिट प्रति सेकंड");
/// assert!(lookup_unit("xyz").is_none());
/// ```
#[must_use]
pub fn lookup_unit(symbol: &str) -> Option<&'static UnitName> {
    UNITS.iter().find(|u| u.symbols.contains(&symbol))
}

/// The longest unit symbol at the start of `s` that is not followed by a letter or digit.
fn unit_prefix(s: &str) -> Option<&str> {
    let mut best: Option<&str> = None;
    for sym in UNITS.iter().flat_map(|u| u.symbols.iter().copied()) {
        if let Some(rest) = s.strip_prefix(sym) {
            let bounded = rest.chars().next().is_none_or(|c| !c.is_alphanumeric());
            if bounded && best.is_none_or(|b| sym.len() > b.len()) {
                best = s.get(..sym.len());
            }
        }
    }
    best
}

// ----------------------------------------------------------------------------------------
// Shared helpers
// ----------------------------------------------------------------------------------------

/// The token index `end` (exclusive) such that token `end - 1` ends at byte `byte_end`,
/// searching from token `from`.
fn end_token(ctx: &ClassifyCtx<'_>, from: usize, byte_end: usize) -> Option<usize> {
    (from..ctx.len())
        .take_while(|&i| {
            ctx.tokens
                .get(i)
                .is_some_and(|t| t.span.range.start < byte_end)
        })
        .find(|&i| {
            ctx.tokens
                .get(i)
                .is_some_and(|t| t.span.range.end == byte_end)
        })
        .map(|i| i + 1)
}

/// Byte offset of the start of token `at`.
fn token_start(ctx: &ClassifyCtx<'_>, at: usize) -> Option<usize> {
    ctx.tokens.get(at).map(|t| t.span.range.start)
}

/// The whitespace-delimited run of text that starts at token `at`.
fn chunk<'a>(ctx: &ClassifyCtx<'a>, at: usize) -> &'a str {
    let Some(start) = token_start(ctx, at) else {
        return "";
    };
    let rest = ctx.text.get(start..).unwrap_or_default();
    rest.split(char::is_whitespace).next().unwrap_or_default()
}

/// True if token `at` starts right after a letter or digit, so a detection there would cut
/// a word in half.
fn glued_to_previous(ctx: &ClassifyCtx<'_>, at: usize) -> bool {
    at > 0 && matches!(ctx.kind(at - 1), Some(SpanKind::Number | SpanKind::Word))
}

fn is_dash(text: &str) -> bool {
    matches!(text, "-" | EN_DASH)
}

// ----------------------------------------------------------------------------------------
// Email
// ----------------------------------------------------------------------------------------

/// Parses an ASCII email address. Returns `None` for anything that is not one.
///
/// # Examples
///
/// ```
/// use yuyin_text::classify::other::parse_email;
/// // The same address is valid in Hindi and English text.
/// let e = parse_email("support@example.com").unwrap();
/// assert_eq!((e.local.as_str(), e.domain.as_str()), ("support", "example.com"));
/// assert!(parse_email("ईमेल@example.com").is_none());
/// assert!(parse_email("no-at-sign.example.com").is_none());
/// ```
#[must_use]
pub fn parse_email(s: &str) -> Option<Email> {
    let (local, domain) = s.split_once('@')?;
    let local_ok = !local.is_empty()
        && local.len() <= MAX_EMAIL_LOCAL
        && local
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || "._%+-".contains(c))
        && !local.starts_with('.')
        && !local.ends_with('.')
        && !local.contains("..");
    (local_ok && is_host(domain)).then(|| Email {
        local: local.to_owned(),
        domain: domain.to_owned(),
    })
}

/// True for a dotted ASCII host with at least two labels and an alphabetic top-level domain.
fn is_host(host: &str) -> bool {
    let labels: Vec<&str> = host.split('.').collect();
    let labels_ok = labels.iter().all(|l| {
        !l.is_empty()
            && l.len() <= MAX_LABEL
            && l.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
            && !l.starts_with('-')
            && !l.ends_with('-')
    });
    labels.len() >= 2
        && labels_ok
        && labels
            .last()
            .is_some_and(|t| t.len() >= MIN_TLD && t.chars().all(|c| c.is_ascii_alphabetic()))
}

/// Detects an email address starting at token `at`.
///
/// # Examples
///
/// ```
/// use yuyin_text::{normalise_to_string, LanguageHint, NormaliseOptions};
/// let en = NormaliseOptions::new(LanguageHint::EnIn);
/// assert_eq!(
///     normalise_to_string("Write to help@example.com.", &en).unwrap(),
///     "Write to help at example dot com."
/// );
/// let hi = NormaliseOptions::new(LanguageHint::Hi);
/// assert_eq!(
///     normalise_to_string("ईमेल help@example.com है।", &hi).unwrap(),
///     "ईमेल help एट example डॉट कॉम है।"
/// );
/// ```
#[must_use]
pub fn detect_email(ctx: &ClassifyCtx<'_>, at: usize) -> Option<Detection> {
    if ctx.kind(at)? == SpanKind::Space || glued_to_previous(ctx, at) {
        return None;
    }
    let candidate = chunk(ctx, at).trim_end_matches(|c| TRAILING_PUNCT.contains(c));
    let email = parse_email(candidate)?;
    let end = end_token(ctx, at, token_start(ctx, at)? + candidate.len())?;
    Some(Detection {
        end,
        value: Semiotic::Email(email),
    })
}

// ----------------------------------------------------------------------------------------
// URL
// ----------------------------------------------------------------------------------------

/// Parses a URL that starts with `http://`, `https://`, or `www.`. Returns the text as is.
///
/// # Examples
///
/// ```
/// use yuyin_text::classify::other::parse_url;
/// assert_eq!(parse_url("https://example.com/pay").unwrap().raw, "https://example.com/pay");
/// assert!(parse_url("www.example.in").is_some());
/// // A bare domain is not a URL: it could be a file name or an abbreviation.
/// assert!(parse_url("example.com").is_none());
/// ```
#[must_use]
pub fn parse_url(s: &str) -> Option<Url> {
    let lower = s.to_ascii_lowercase();
    let prefix = URL_PREFIXES.iter().find(|p| lower.starts_with(**p))?;
    let rest = if prefix.starts_with("www") {
        s
    } else {
        s.get(prefix.len()..)?
    };
    let authority_end = rest.find(['/', '?', '#']).unwrap_or(rest.len());
    let authority = rest.get(..authority_end)?;
    let tail = rest.get(authority_end..)?;
    let (host, port) = match authority.split_once(':') {
        Some((h, p)) => (h, Some(p)),
        None => (authority, None),
    };
    let port_ok = port.is_none_or(|p| !p.is_empty() && p.chars().all(|c| c.is_ascii_digit()));
    let tail_ok = tail
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || URL_TAIL_CHARS.contains(c));
    (is_host(host) && port_ok && tail_ok).then(|| Url { raw: s.to_owned() })
}

/// Detects a URL starting at token `at`.
///
/// # Examples
///
/// ```
/// use yuyin_text::{normalise_to_string, LanguageHint, NormaliseOptions};
/// let en = NormaliseOptions::new(LanguageHint::EnUs);
/// assert_eq!(
///     normalise_to_string("Visit https://example.com/pay today.", &en).unwrap(),
///     "Visit example dot com slash pay today."
/// );
/// let hi = NormaliseOptions::new(LanguageHint::Hi);
/// assert_eq!(
///     normalise_to_string("https://example.com/pay पर जाएं।", &hi).unwrap(),
///     "example डॉट कॉम स्लैश pay पर जाएं।"
/// );
/// ```
#[must_use]
pub fn detect_url(ctx: &ClassifyCtx<'_>, at: usize) -> Option<Detection> {
    if ctx.kind(at)? == SpanKind::Space || glued_to_previous(ctx, at) {
        return None;
    }
    let candidate = chunk(ctx, at).trim_end_matches(|c| TRAILING_PUNCT.contains(c));
    let url = parse_url(candidate)?;
    let end = end_token(ctx, at, token_start(ctx, at)? + candidate.len())?;
    Some(Detection {
        end,
        value: Semiotic::Url(url),
    })
}

// ----------------------------------------------------------------------------------------
// Quantities: percent and unit
// ----------------------------------------------------------------------------------------

/// What follows the number of a quantity.
#[derive(Debug, Clone, PartialEq, Eq)]
enum Suffix {
    /// `%`, with `p.a.` if `per_annum`.
    Percent { per_annum: bool },
    /// A unit symbol from the table, as written.
    Unit(String),
}

/// A number with what follows it.
#[derive(Debug, Clone, PartialEq, Eq)]
struct Quantity {
    value: NumberValue,
    suffix: Suffix,
    /// Token index one past the quantity.
    end: usize,
}

/// Length of the leading number in a token such as `2.5kg`: digits (ASCII or Devanagari),
/// commas, and points, ending on a digit.
fn numeric_prefix_len(s: &str) -> usize {
    let raw = s
        .char_indices()
        .find(|&(_, c)| !(c.is_ascii_digit() || matches!(c, ',' | '.') || is_devanagari_digit(c)))
        .map_or(s.len(), |(i, _)| i);
    s.get(..raw)
        .map_or(0, |p| p.trim_end_matches([',', '.']).len())
}

fn is_devanagari_digit(c: char) -> bool {
    ('\u{0966}'..='\u{096F}').contains(&c)
}

/// Reads a number at token `at` (a Number token, or a Word token that starts with a number
/// and continues with letters, such as `5km`) and what follows it. `negative` is set when a
/// sign was read before the number.
fn quantity_unsigned(ctx: &ClassifyCtx<'_>, at: usize, negative: bool) -> Option<Quantity> {
    let token = ctx.token_text(at);
    let number_len = match ctx.kind(at)? {
        SpanKind::Number => token.len(),
        SpanKind::Word => numeric_prefix_len(token),
        _ => return None,
    };
    let value = with_sign(parse_number(token.get(..number_len)?)?, negative);
    let number_end = token_start(ctx, at)? + number_len;
    let after = ctx.text.get(number_end..).unwrap_or_default();
    // `%` and `p.a.` directly after the number.
    if let Some(rest) = after.strip_prefix('%') {
        let (per_annum, consumed) = per_annum_suffix(rest);
        let end = end_token(ctx, at, number_end + 1 + consumed)?;
        return Some(Quantity {
            value,
            suffix: Suffix::Percent { per_annum },
            end,
        });
    }
    // A unit, glued to the number (`5km`, `30°C`) or after one space.
    let unit_text = after.strip_prefix(' ').unwrap_or(after);
    let skipped = after.len() - unit_text.len();
    let symbol = unit_prefix(unit_text)?;
    let end = end_token(ctx, at, number_end + skipped + symbol.len())?;
    Some(Quantity {
        value,
        suffix: Suffix::Unit(symbol.to_owned()),
        end,
    })
}

/// Reads `p.a.` after a percent sign. Returns whether it was found and how many bytes of
/// `rest` it uses. The final dot is part of it only when a lowercase word follows, because a
/// dot at the end of the text is the sentence end.
fn per_annum_suffix(rest: &str) -> (bool, usize) {
    let trimmed = rest.trim_start();
    let lead = rest.len() - trimmed.len();
    if lead == 0 || !trimmed.to_ascii_lowercase().starts_with(PER_ANNUM) {
        return (false, 0);
    }
    let after = trimmed.get(PER_ANNUM.len()..).unwrap_or_default();
    match after.strip_prefix('.') {
        Some(tail) => {
            let more_words = tail
                .trim_start()
                .chars()
                .next()
                .is_some_and(|c| c.is_alphanumeric() && !c.is_uppercase());
            (true, lead + PER_ANNUM.len() + usize::from(more_words))
        }
        None if after.chars().next().is_none_or(|c| !c.is_alphanumeric()) => {
            (true, lead + PER_ANNUM.len())
        }
        None => (false, 0),
    }
}

fn with_sign(value: NumberValue, negative: bool) -> NumberValue {
    match value {
        NumberValue::Integer { value, .. } => NumberValue::Integer { negative, value },
        NumberValue::Decimal {
            integer,
            fraction_digits,
            ..
        } => NumberValue::Decimal {
            negative,
            integer,
            fraction_digits,
        },
        other @ NumberValue::Fraction { .. } => other,
    }
}

/// A quantity starting at token `at`, with an optional leading minus sign.
fn quantity(ctx: &ClassifyCtx<'_>, at: usize) -> Option<Quantity> {
    if matches!(ctx.token_text(at), "-" | MINUS_SIGN) {
        if glued_to_previous(ctx, at) {
            return None;
        }
        return quantity_unsigned(ctx, at + 1, true);
    }
    quantity_unsigned(ctx, at, false)
}

/// Detects a percentage starting at token `at`.
///
/// # Examples
///
/// ```
/// use yuyin_text::{normalise_to_string, LanguageHint, NormaliseOptions};
/// let en = NormaliseOptions::new(LanguageHint::EnIn);
/// assert_eq!(normalise_to_string("Rate 8.5%", &en).unwrap(), "Rate eight point five percent");
/// let hi = NormaliseOptions::new(LanguageHint::Hi);
/// assert_eq!(normalise_to_string("ब्याज 8.5% है", &hi).unwrap(), "ब्याज आठ दशमलव पाँच प्रतिशत है");
/// ```
#[must_use]
pub fn detect_percent(ctx: &ClassifyCtx<'_>, at: usize) -> Option<Detection> {
    let q = quantity(ctx, at)?;
    let Suffix::Percent { per_annum } = q.suffix else {
        return None;
    };
    Some(Detection {
        end: q.end,
        value: Semiotic::Percent(Percent {
            value: q.value,
            per_annum,
        }),
    })
}

/// Detects a quantity with a unit starting at token `at`.
///
/// # Examples
///
/// ```
/// use yuyin_text::{normalise_to_string, LanguageHint, NormaliseOptions};
/// let en = NormaliseOptions::new(LanguageHint::EnIn);
/// assert_eq!(normalise_to_string("Speed 100 Mbps", &en).unwrap(), "Speed one hundred megabits per second");
/// let hi = NormaliseOptions::new(LanguageHint::Hi);
/// assert_eq!(normalise_to_string("वज़न 2 kg है", &hi).unwrap(), "वज़न दो किलोग्राम है");
/// ```
#[must_use]
pub fn detect_unit(ctx: &ClassifyCtx<'_>, at: usize) -> Option<Detection> {
    let q = quantity(ctx, at)?;
    let Suffix::Unit(unit) = q.suffix else {
        return None;
    };
    Some(Detection {
        end: q.end,
        value: Semiotic::Unit(Unit {
            value: q.value,
            unit,
        }),
    })
}

// ----------------------------------------------------------------------------------------
// Range
// ----------------------------------------------------------------------------------------

/// Compares two non-negative decimal or integer values.
fn compare(a: &NumberValue, b: &NumberValue) -> Option<Ordering> {
    fn parts(v: &NumberValue) -> Option<(u64, &str)> {
        match v {
            NumberValue::Integer { value, .. } => Some((*value, "")),
            NumberValue::Decimal {
                integer,
                fraction_digits,
                ..
            } => Some((*integer, fraction_digits.as_str())),
            NumberValue::Fraction { .. } => None,
        }
    }
    let (ai, af) = parts(a)?;
    let (bi, bf) = parts(b)?;
    let width = af.len().max(bf.len());
    Some(
        ai.cmp(&bi)
            .then_with(|| format!("{af:0<width$}").cmp(&format!("{bf:0<width$}"))),
    )
}

/// True for a long ungrouped digit run, which looks like an identifier or a phone number.
fn id_like(text: &str) -> bool {
    !text.contains(',') && text.chars().filter(char::is_ascii_digit).count() >= ID_LIKE_MIN_DIGITS
}

/// The end of a range at token `next`: a quantity with a suffix, or a plain number.
fn range_end(ctx: &ClassifyCtx<'_>, next: usize) -> Option<(NumberValue, Semiotic, usize)> {
    if let Some(q) = quantity_unsigned(ctx, next, false) {
        let sem = match q.suffix {
            Suffix::Percent { per_annum } => Semiotic::Percent(Percent {
                value: q.value.clone(),
                per_annum,
            }),
            Suffix::Unit(unit) => Semiotic::Unit(Unit {
                value: q.value.clone(),
                unit,
            }),
        };
        return Some((q.value, sem, q.end));
    }
    if ctx.kind(next) != Some(SpanKind::Number) {
        return None;
    }
    let text = ctx.token_text(next);
    let value = parse_number(text)?;
    // The end must not continue a chain (`10-15-20`, `10-15/20`, `10-15:30`).
    let chained = matches!(ctx.token_text(next + 1), "-" | "/" | ":" | EN_DASH)
        && ctx.kind(next + 2) == Some(SpanKind::Number);
    if id_like(text) || chained {
        return None;
    }
    Some((value.clone(), Semiotic::Cardinal(value), next + 1))
}

/// Detects a range starting at token `at`.
///
/// # Examples
///
/// ```
/// use yuyin_text::{normalise_to_string, LanguageHint, NormaliseOptions};
/// let en = NormaliseOptions::new(LanguageHint::EnIn);
/// assert_eq!(normalise_to_string("10-15 days", &en).unwrap(), "ten to fifteen days");
/// let hi = NormaliseOptions::new(LanguageHint::Hi);
/// assert_eq!(normalise_to_string("10-15 दिन", &hi).unwrap(), "दस से पंद्रह दिन");
/// ```
#[must_use]
pub fn detect_range(ctx: &ClassifyCtx<'_>, at: usize) -> Option<Detection> {
    if ctx.kind(at)? != SpanKind::Number {
        return None;
    }
    // Inside a chain such as `1-2-3` or `05/12/2026` a range would start mid-chain.
    if at >= 2
        && matches!(ctx.token_text(at - 1), "-" | "/" | EN_DASH)
        && ctx.kind(at - 2) == Some(SpanKind::Number)
    {
        return None;
    }
    let start_text = ctx.token_text(at);
    let start = parse_number(start_text)?;
    let mut dash = at + 1;
    let spaced = ctx.kind(dash) == Some(SpanKind::Space);
    if spaced {
        dash += 1;
    }
    let dash_text = ctx.token_text(dash);
    // A hyphen must be tight (`10-15`), so `10 - 5` stays a subtraction. An en dash may have spaces.
    if !is_dash(dash_text) || (spaced && dash_text == "-") {
        return None;
    }
    let mut next = dash + 1;
    if spaced && ctx.kind(next) == Some(SpanKind::Space) {
        next += 1;
    }
    let (end_value, end_sem, end) = range_end(ctx, next)?;
    if id_like(start_text) || compare(&start, &end_value) != Some(Ordering::Less) {
        return None;
    }
    Some(Detection {
        end,
        value: Semiotic::Range(Range {
            start: Box::new(Semiotic::Cardinal(start)),
            end: Box::new(end_sem),
        }),
    })
}

#[cfg(test)]
mod tests {
    use super::super::testutil::Fixture;
    use super::*;
    use crate::LanguageHint;

    fn int(value: u64) -> NumberValue {
        NumberValue::Integer {
            negative: false,
            value,
        }
    }

    fn found(
        text: &str,
        detect: super::super::Detector,
        hint: LanguageHint,
    ) -> Option<(usize, usize, Semiotic)> {
        Fixture::new(text, hint)
            .first(detect)
            .map(|(at, d)| (at, d.end, d.value))
    }

    #[test]
    fn test_email_detected_with_trailing_period_left_out() {
        let f = Fixture::new("Mail help@example.com. Thanks", LanguageHint::EnIn);
        let (at, d) = f.first(detect_email).expect("email");
        assert_eq!(
            d.value,
            Semiotic::Email(Email {
                local: "help".into(),
                domain: "example.com".into()
            })
        );
        assert_eq!(f.ctx().text_between(at, d.end), "help@example.com");
    }

    #[test]
    fn test_email_rejects_bad_shapes() {
        for bad in [
            "a@b",
            "@example.com",
            "a@example.c0m",
            "a..b@example.com",
            ".a@example.com",
            "a@-example.com",
            "a@example..com",
            "a@b@example.com",
            "नाम@example.com",
        ] {
            assert_eq!(parse_email(bad), None, "{bad}");
        }
        let long = format!("{}@example.com", "a".repeat(MAX_EMAIL_LOCAL + 1));
        assert_eq!(parse_email(&long), None);
    }

    #[test]
    fn test_url_requires_scheme_or_www() {
        assert!(parse_url("HTTPS://Example.com/Pay").is_some());
        assert!(parse_url("http://example.com:80/x?y=1#z").is_some());
        for bad in [
            "example.com",
            "ftp://example.com",
            "https://example",
            "https://example.com:/x",
            "https://example.com:8a/x",
            "https://exa mple.com",
            "https://example.com/पथ",
            "www.",
        ] {
            assert_eq!(parse_url(bad), None, "{bad}");
        }
    }

    #[test]
    fn test_url_trailing_punctuation_and_danda_left_out() {
        for text in ["See https://example.com/a.", "देखें https://example.com/a।"] {
            let f = Fixture::new(text, LanguageHint::Auto);
            let (at, d) = f.first(detect_url).expect("url");
            assert_eq!(f.ctx().text_between(at, d.end), "https://example.com/a");
        }
    }

    #[test]
    fn test_percent_detects_signed_grouped_and_devanagari() {
        for (text, value, per_annum) in [
            ("8%", int(8), false),
            ("१५%", int(15), false),
            ("9% p.a. hai", int(9), true),
            ("9% p.a", int(9), true),
            ("9 % off", int(9), false),
        ] {
            let got = found(text, detect_percent, LanguageHint::EnIn);
            if text == "9 % off" {
                assert_eq!(got, None);
            } else {
                let (_, _, sem) = got.unwrap_or_else(|| panic!("{text}"));
                assert_eq!(
                    sem,
                    Semiotic::Percent(Percent { value, per_annum }),
                    "{text}"
                );
            }
        }
        let (_, _, neg) = found("-2.5%", detect_percent, LanguageHint::EnIn).expect("neg");
        let Semiotic::Percent(p) = neg else {
            panic!("not a percent")
        };
        assert!(matches!(
            p.value,
            NumberValue::Decimal { negative: true, .. }
        ));
    }

    #[test]
    fn test_percent_per_annum_final_dot_belongs_to_sentence_at_end() {
        // At the end of the text the dot stays: it is the sentence end.
        let f = Fixture::new("Rate 9% p.a.", LanguageHint::EnIn);
        let (at, d) = f.first(detect_percent).expect("percent");
        assert_eq!(f.ctx().text_between(at, d.end), "9% p.a");
        // Before a lowercase word the dot is part of the abbreviation.
        let f = Fixture::new("Rate 9% p.a. hai", LanguageHint::Hinglish);
        let (at, d) = f.first(detect_percent).expect("percent");
        assert_eq!(f.ctx().text_between(at, d.end), "9% p.a.");
        // `p.an` is not `p.a`.
        assert_eq!(per_annum_suffix(" p.any"), (false, 0));
        assert_eq!(per_annum_suffix("p.a"), (false, 0));
    }

    #[test]
    fn test_unit_detects_glued_spaced_and_slash_forms() {
        for (text, unit) in [
            ("5 km", "km"),
            ("5km", "km"),
            ("2.5kg", "kg"),
            ("60 km/h", "km/h"),
            ("30°C", "°C"),
            ("100 Mbps", "Mbps"),
            ("5 Lakh", ""),
            ("5 kgs", ""),
            ("5  km", ""),
        ] {
            let got = found(text, detect_unit, LanguageHint::EnIn);
            if unit.is_empty() {
                assert_eq!(got, None, "{text}");
            } else {
                let (_, _, Semiotic::Unit(u)) = got.unwrap_or_else(|| panic!("{text}")) else {
                    panic!("not a unit: {text}")
                };
                assert_eq!(u.unit, unit, "{text}");
            }
        }
    }

    #[test]
    fn test_unit_longest_symbol_wins() {
        assert_eq!(unit_prefix("km/h now"), Some("km/h"));
        assert_eq!(unit_prefix("km now"), Some("km"));
        assert_eq!(unit_prefix("gm"), Some("gm"));
        assert_eq!(unit_prefix("kmx"), None);
    }

    #[test]
    fn test_unit_negative_quantity() {
        let (_, _, sem) = found("-5 kg", detect_unit, LanguageHint::EnIn).expect("unit");
        let Semiotic::Unit(u) = sem else {
            panic!("not a unit")
        };
        assert_eq!(
            u.value,
            NumberValue::Integer {
                negative: true,
                value: 5
            }
        );
        // A dash glued to a word on its left is not a sign.
        assert_eq!(
            found("x-5 kg", detect_unit, LanguageHint::EnIn).map(|f| f.0),
            Some(2)
        );
    }

    #[test]
    fn test_unit_table_symbols_are_unique_and_named() {
        let mut seen = std::collections::HashSet::new();
        for u in UNITS {
            assert!(!u.en_one.is_empty() && !u.en_many.is_empty() && !u.hi.is_empty());
            for s in u.symbols {
                assert!(seen.insert(*s), "duplicate symbol {s}");
                assert_eq!(lookup_unit(s), Some(u));
            }
        }
    }

    #[test]
    fn test_range_detects_numbers_units_and_percent_ends() {
        let (_, end, sem) = found("10-15 days", detect_range, LanguageHint::EnIn).expect("range");
        assert_eq!(end, 3);
        assert_eq!(
            sem,
            Semiotic::Range(Range {
                start: Box::new(Semiotic::Cardinal(int(10))),
                end: Box::new(Semiotic::Cardinal(int(15))),
            })
        );
        let (_, _, sem) = found("5-10 kg", detect_range, LanguageHint::EnIn).expect("unit range");
        let Semiotic::Range(r) = sem else {
            panic!("not a range")
        };
        assert!(matches!(*r.end, Semiotic::Unit(_)));
        let (_, _, sem) = found("10-15%", detect_range, LanguageHint::EnIn).expect("pct range");
        let Semiotic::Range(r) = sem else {
            panic!("not a range")
        };
        assert!(matches!(*r.end, Semiotic::Percent(_)));
    }

    #[test]
    fn test_range_en_dash_may_have_spaces_but_hyphen_may_not() {
        assert!(found("20 \u{2013} 30", detect_range, LanguageHint::EnIn).is_some());
        assert!(found("20\u{2013}30", detect_range, LanguageHint::EnIn).is_some());
        assert_eq!(found("20 - 30", detect_range, LanguageHint::EnIn), None);
        assert_eq!(found("20- 30", detect_range, LanguageHint::EnIn), None);
    }

    #[test]
    fn test_range_rejects_non_ranges() {
        for text in [
            "15-10",
            "10-10",
            "1-2-3",
            "10-15/20",
            "10-15:30",
            "9876543-9876544",
            "98765-43210",
            "5-x",
            "e-mail",
            "T-shirt",
            "10-",
            "1.5-1.2",
        ] {
            let got = found(text, detect_range, LanguageHint::EnIn);
            assert!(got.is_none(), "{text}: {got:?}");
        }
    }

    #[test]
    fn test_range_decimals_compare_by_value() {
        assert!(found("1.5-2.25", detect_range, LanguageHint::EnIn).is_some());
        assert!(found("1.50-1.5", detect_range, LanguageHint::EnIn).is_none());
        assert!(found("1.5-1.55", detect_range, LanguageHint::EnIn).is_some());
    }

    #[test]
    fn test_compare_orders_fractions_as_unordered() {
        let frac = NumberValue::Fraction {
            negative: false,
            numerator: 1,
            denominator: 2,
        };
        assert_eq!(compare(&frac, &int(1)), None);
        assert_eq!(compare(&int(1), &frac), None);
    }

    #[test]
    fn test_other_detectors_ignore_plain_text() {
        let f = Fixture::new(
            "नमस्ते duniya, 25 saal. Visit example.com or call 5 times.",
            LanguageHint::Auto,
        );
        for detect in [
            detect_email,
            detect_url,
            detect_range,
            detect_percent,
            detect_unit,
        ] {
            assert_eq!(f.first(detect), None);
        }
    }
}
