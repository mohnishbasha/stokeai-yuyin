//! Date and time detection (owner: S1-T05, PRD FR-008).
//!
//! Detected shapes:
//!
//! - Numeric dates `5/12/2026`, `5-12-2026`, `5.12.2026`. The day and month order follows the
//!   locale (ARCHITECTURE "Normalisation: dates and times"): day first for `hi`, `hinglish`,
//!   `en-IN` and `auto`, month first for `en-US` ([`ClassifyCtx::locale`]). A value that is not a
//!   real date in the locale's order (`31/02/2026`, `25/03/2026` for `en-US`) is never swapped
//!   and never read as a date: the span is left alone.
//! - ISO dates `2026-03-05` always parse, in every locale.
//! - Month names in English and Hindi: `5 March 2026`, `5th Dec`, `March 5, 2026`, `March 2026`,
//!   `5 मार्च 2026`. English month-first forms need a capitalised month (`May 12`, not `may 12`).
//! - A four digit year after `in`, `since`, `during`, `until`, `till`, `year`, `साल`, `वर्ष`,
//!   `सन`, or before `में` (`in 2026`, `2026 में`).
//! - Clock times `5:30`, `5:30:15`, `5:30 PM`, `5:30 p.m.`, `5 pm`, `17:30 hrs`, and a Hindi
//!   `बजे` right after (`5:30 बजे`) is absorbed.
//! - Durations `2h 15m`, `45 min`, `2 hrs 15 mins`, `1h 30m 10s`. A lone `m` or `s` is not a
//!   duration (`5m`, `30s` are left to the unit class and to decades).
//!
//! Relative formats (`kal`, `tomorrow`, `next week`, `कल`) are not claimed: they pass through.
//! Dates and times win over the number classifier because [`super::DETECTORS`] runs this
//! detector first. Spoken forms are in [`crate::verbalise::datetime`]. Golden rows:
//! `golden/datetime.tsv` (classes `date`, `time`).

use super::{ClassifyCtx, Detection, Semiotic};
use crate::{Locale, SpanKind};

/// Radix of the written digits.
const RADIX: u32 = 10;
/// Code point of Devanagari digit zero.
const DEVANAGARI_ZERO: u32 = 0x0966;
/// Code point of Devanagari digit nine.
const DEVANAGARI_NINE: u32 = 0x096F;
/// Smallest year read in a numeric date.
const MIN_YEAR: u32 = 1000;
/// Range of a bare year read after a trigger word.
const BARE_YEAR: std::ops::RangeInclusive<u32> = 1900..=2099;
/// Largest value of one duration part.
const MAX_PART: u32 = 255;
/// Most digits in one duration part.
const PART_DIGITS: usize = 3;
/// Words before a bare year that make it a year (lowercase).
const YEAR_TRIGGERS: [&str; 9] = [
    "in",
    "since",
    "during",
    "until",
    "till",
    "year",
    "साल",
    "वर्ष",
    "सन",
];
/// The Hindi word for "o'clock" that follows a clock time.
const HINDI_BAJE: &str = "बजे";

/// A parsed calendar date. Missing parts are `None` (`March 2026` has no day).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Date {
    /// Day of month, 1 to 31.
    pub day: Option<u8>,
    /// Month, 1 to 12.
    pub month: Option<u8>,
    /// Year, for example 2026.
    pub year: Option<u16>,
}

/// AM or PM.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Meridiem {
    /// Before noon.
    Am,
    /// After noon.
    Pm,
}

/// A parsed clock time or duration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Time {
    /// Hour as written, 0 to 23 for a clock time, 0 to 255 for a duration.
    pub hour: u8,
    /// Minute, 0 to 59 for a clock time, 0 to 255 for a duration.
    pub minute: u8,
    /// Second, if written.
    pub second: Option<u8>,
    /// AM or PM, if written.
    pub meridiem: Option<Meridiem>,
    /// True if written with an `hrs` suffix (`17:30 hrs`).
    pub hours_suffix: bool,
    /// True for a duration (`2h 15m`): the fields are amounts, not a time of day.
    pub duration: bool,
}

/// Detects a date or time starting at token `at`.
///
/// # Examples
///
/// ```
/// use yuyin_text::classify::datetime::parse;
/// use yuyin_text::{Locale, Semiotic};
/// // Day first for India, month first for the US.
/// let in_ = parse("05/12/2026", Locale::In).map(|(_, s)| s);
/// let us = parse("05/12/2026", Locale::Us).map(|(_, s)| s);
/// assert!(matches!(in_, Some(Semiotic::Date(d)) if d.month == Some(12)));
/// assert!(matches!(us, Some(Semiotic::Date(d)) if d.month == Some(5)));
/// ```
#[must_use]
pub fn detect(ctx: &ClassifyCtx<'_>, at: usize) -> Option<Detection> {
    let tok = ctx.tokens.get(at)?;
    if matches!(tok.span.kind, SpanKind::Space | SpanKind::Punctuation) {
        return None;
    }
    let start = tok.span.range.start;
    let prev = ctx.text.get(..start).and_then(|t| t.chars().next_back());
    if prev.is_some_and(|c| is_word_char(c) || c.is_alphanumeric() || matches!(c, '/' | ':')) {
        return None;
    }
    let rest = ctx.text.get(start..)?;
    if let Some((len, value)) = parse(rest, ctx.locale) {
        return finish(ctx, at, start + len, value);
    }
    bare_year(ctx, at)
}

/// Ends the detection at the token that ends at byte `end`, if the match stops cleanly.
fn finish(ctx: &ClassifyCtx<'_>, at: usize, end: usize, value: Semiotic) -> Option<Detection> {
    if !ends_cleanly(ctx.text.get(end..)?) {
        return None;
    }
    let last =
        (at..ctx.len()).find(|&j| ctx.tokens.get(j).is_some_and(|t| t.span.range.end == end))?;
    Some(Detection {
        end: last + 1,
        value,
    })
}

/// True if what follows a match does not continue it (a letter, `/5`, `:5`, `.5`).
fn ends_cleanly(rest: &str) -> bool {
    let mut chars = rest.chars();
    match chars.next() {
        Some(c) if is_word_char(c) => false,
        Some('/' | ':' | '.' | ',') => chars.next().and_then(digit_value).is_none(),
        _ => true,
    }
}

/// A four digit year after a trigger word (`in 2026`) or before `में`.
fn bare_year(ctx: &ClassifyCtx<'_>, at: usize) -> Option<Detection> {
    if ctx.kind(at) != Some(SpanKind::Number) {
        return None;
    }
    let text = ctx.token_text(at);
    let mut sc = Scan::new(text);
    let year = sc.num(4, 4)?;
    if sc.pos != text.len() || !BARE_YEAR.contains(&year) {
        return None;
    }
    let before = ctx
        .prev_non_space(at)
        .map(|j| ctx.token_text(j).to_lowercase());
    let triggered = before.is_some_and(|w| YEAR_TRIGGERS.contains(&w.as_str()))
        || ctx
            .next_non_space(at)
            .is_some_and(|j| ctx.token_text(j) == "में");
    triggered.then(|| Detection {
        end: at + 1,
        value: Semiotic::Date(Date {
            day: None,
            month: None,
            year: u16::try_from(year).ok(),
        }),
    })
}

/// Parses a date or time at the start of `s`. Returns the bytes used and the value.
///
/// Numeric dates follow `locale`; ISO dates ignore it.
#[must_use]
pub fn parse(s: &str, locale: Locale) -> Option<(usize, Semiotic)> {
    if s.chars().next().and_then(digit_value).is_some() {
        parse_clock(s)
            .or_else(|| parse_hour_meridiem(s))
            .or_else(|| parse_duration(s))
            .or_else(|| parse_numeric_date(s, locale))
            .or_else(|| parse_day_month(s))
    } else {
        parse_month_first(s)
    }
}

// ---------------------------------------------------------------- scanner

/// A cursor over the text, small enough to copy for backtracking.
#[derive(Debug, Clone, Copy)]
struct Scan<'a> {
    s: &'a str,
    pos: usize,
}

impl<'a> Scan<'a> {
    fn new(s: &'a str) -> Self {
        Self { s, pos: 0 }
    }

    fn rest(&self) -> &'a str {
        self.s.get(self.pos..).unwrap_or_default()
    }

    fn peek(&self) -> Option<char> {
        self.rest().chars().next()
    }

    fn eat(&mut self, c: char) -> bool {
        let hit = self.peek() == Some(c);
        if hit {
            self.pos += c.len_utf8();
        }
        hit
    }

    /// Eats any of `set`, returning the one eaten.
    fn eat_any(&mut self, set: &[char]) -> Option<char> {
        let c = self.peek().filter(|c| set.contains(c))?;
        self.pos += c.len_utf8();
        Some(c)
    }

    /// Eats spaces, returns how many.
    fn spaces(&mut self) -> usize {
        let n = self
            .rest()
            .chars()
            .take_while(|c| matches!(c, ' ' | '\u{a0}'))
            .count();
        self.pos += n * ' '.len_utf8();
        n
    }

    /// Reads one to `max` digits and the count, or `None` if there are none or more than `max`.
    fn num_n(&mut self, max: usize) -> Option<(u32, usize)> {
        let start = self.pos;
        let mut value = 0_u32;
        let mut count = 0;
        while let Some(d) = self.peek().and_then(digit_value) {
            if count == max {
                self.pos = start;
                return None;
            }
            value = value * RADIX + d;
            count += 1;
            self.pos += self.peek().map_or(0, char::len_utf8);
        }
        if count == 0 {
            self.pos = start;
            return None;
        }
        Some((value, count))
    }

    /// Reads exactly `min` to `max` digits.
    fn num(&mut self, min: usize, max: usize) -> Option<u32> {
        let start = self.pos;
        match self.num_n(max) {
            Some((v, n)) if n >= min => Some(v),
            _ => {
                self.pos = start;
                None
            }
        }
    }

    /// Reads a run of letters (any script, with Devanagari signs).
    fn word(&mut self) -> &'a str {
        let rest = self.rest();
        let len: usize = rest
            .chars()
            .take_while(|c| is_word_char(*c))
            .map(char::len_utf8)
            .sum();
        self.pos += len;
        rest.get(..len).unwrap_or_default()
    }
}

/// Value of an ASCII or Devanagari digit.
fn digit_value(c: char) -> Option<u32> {
    if c.is_ascii_digit() {
        c.to_digit(RADIX)
    } else {
        let code = u32::from(c);
        (DEVANAGARI_ZERO..=DEVANAGARI_NINE)
            .contains(&code)
            .then(|| code - DEVANAGARI_ZERO)
    }
}

/// True for letters and Devanagari signs, not digits or the danda.
fn is_word_char(c: char) -> bool {
    c.is_alphabetic()
        || (('\u{0900}'..='\u{097F}').contains(&c) && !('\u{0964}'..='\u{096F}').contains(&c))
}

// ---------------------------------------------------------------- dates

/// English and Hindi month words, lowercase, Hindi without the nukta.
const MONTHS: &[(&str, u8)] = &[
    ("january", 1),
    ("jan", 1),
    ("february", 2),
    ("feb", 2),
    ("march", 3),
    ("mar", 3),
    ("april", 4),
    ("apr", 4),
    ("may", 5),
    ("june", 6),
    ("jun", 6),
    ("july", 7),
    ("jul", 7),
    ("august", 8),
    ("aug", 8),
    ("september", 9),
    ("sept", 9),
    ("sep", 9),
    ("october", 10),
    ("oct", 10),
    ("november", 11),
    ("nov", 11),
    ("december", 12),
    ("dec", 12),
    ("जनवरी", 1),
    ("फरवरी", 2),
    ("मार्च", 3),
    ("अप्रैल", 4),
    ("मई", 5),
    ("जून", 6),
    ("जुलाई", 7),
    ("अगस्त", 8),
    ("सितंबर", 9),
    ("सितम्बर", 9),
    ("अक्तूबर", 10),
    ("अक्टूबर", 10),
    ("नवंबर", 11),
    ("नवम्बर", 11),
    ("दिसंबर", 12),
    ("दिसम्बर", 12),
];

/// The month a word names, and whether it is written in Latin letters.
fn month_of(word: &str) -> Option<(u8, bool)> {
    let key: String = word
        .chars()
        .filter(|c| *c != '\u{093C}')
        // U+095E is the precomposed `फ़`; spell it as plain `फ`.
        .map(|c| if c == '\u{095E}' { '\u{092B}' } else { c })
        .flat_map(char::to_lowercase)
        .collect();
    let month = MONTHS.iter().find(|(w, _)| *w == key).map(|(_, m)| *m)?;
    Some((month, word.is_ascii()))
}

/// Days in `month`, taking `year` into account for February (29 if the year is unknown).
fn days_in(month: u32, year: Option<u32>) -> u32 {
    match month {
        4 | 6 | 9 | 11 => 30,
        2 => match year {
            Some(y) if !(y % 4 == 0 && (y % 100 != 0 || y % 400 == 0)) => 28,
            _ => 29,
        },
        _ => 31,
    }
}

/// A date value if the parts are a real calendar date.
fn make_date(day: Option<u32>, month: u32, year: Option<u32>) -> Option<Semiotic> {
    if !(1..=12).contains(&month) {
        return None;
    }
    if let Some(d) = day {
        if d < 1 || d > days_in(month, year) {
            return None;
        }
    }
    Some(Semiotic::Date(Date {
        day: day.and_then(|d| u8::try_from(d).ok()),
        month: u8::try_from(month).ok(),
        year: year.and_then(|y| u16::try_from(y).ok()),
    }))
}

/// `05/12/2026` (locale order) and `2026-03-05` (ISO).
fn parse_numeric_date(s: &str, locale: Locale) -> Option<(usize, Semiotic)> {
    let mut sc = Scan::new(s);
    let (a, count) = sc.num_n(4)?;
    let sep = sc.eat_any(&['/', '-', '.'])?;
    let b = sc.num(1, 2)?;
    if !sc.eat(sep) {
        return None;
    }
    let value = if count == 4 {
        let d = sc.num(1, 2)?;
        make_date(Some(d), b, Some(a)).filter(|_| a >= MIN_YEAR)?
    } else if count <= 2 {
        let year = sc.num(4, 4).filter(|y| *y >= MIN_YEAR)?;
        let (day, month) = match locale {
            Locale::In => (a, b),
            Locale::Us => (b, a),
        };
        make_date(Some(day), month, Some(year))?
    } else {
        return None;
    };
    Some((sc.pos, value))
}

/// An ordinal suffix glued to a day (`5th`).
fn eat_ordinal_suffix(sc: &mut Scan<'_>) {
    let save = *sc;
    if !matches!(sc.word(), "st" | "nd" | "rd" | "th") {
        *sc = save;
    }
}

/// A year after a month or day: `, 2026`, ` 2026`, `-2026`.
fn year_after(sc: &mut Scan<'_>) -> Option<u32> {
    let save = *sc;
    sc.eat(',');
    if sc.spaces() == 0 && !sc.eat('-') {
        *sc = save;
        return None;
    }
    if let Some(y) = sc.num(4, 4).filter(|y| *y >= MIN_YEAR) {
        Some(y)
    } else {
        *sc = save;
        None
    }
}

/// `5 March 2026`, `5th Dec`, `05-Dec-2026`, `5 मार्च 2026`.
fn parse_day_month(s: &str) -> Option<(usize, Semiotic)> {
    let mut sc = Scan::new(s);
    let day = sc.num(1, 2)?;
    eat_ordinal_suffix(&mut sc);
    if sc.spaces() == 0 && !sc.eat('-') {
        return None;
    }
    let word = sc.word();
    let (month, latin) = month_of(word)?;
    let after_month = sc;
    let year = year_after(&mut sc);
    // A lowercase `may` is the verb unless a year follows.
    if year.is_none() && latin && word == "may" {
        return None;
    }
    if year.is_none() {
        sc = after_month;
    }
    let value = make_date(Some(day), u32::from(month), year)?;
    Some((sc.pos, value))
}

/// `March 5, 2026`, `Dec 25`, `March 2026`.
fn parse_month_first(s: &str) -> Option<(usize, Semiotic)> {
    let mut sc = Scan::new(s);
    let word = sc.word();
    let (month, latin) = month_of(word)?;
    if latin && !word.starts_with(char::is_uppercase) {
        return None;
    }
    if sc.spaces() == 0 {
        return None;
    }
    let after_month = sc;
    if let Some(day) = sc.num(1, 2) {
        eat_ordinal_suffix(&mut sc);
        let year = year_after(&mut sc);
        let value = make_date(Some(day), u32::from(month), year)?;
        return Some((sc.pos, value));
    }
    sc = after_month;
    let year = sc.num(4, 4).filter(|y| *y >= MIN_YEAR)?;
    let value = make_date(None, u32::from(month), Some(year))?;
    Some((sc.pos, value))
}

// ---------------------------------------------------------------- times

/// AM or PM after optional spaces: `PM`, `p.m.`.
fn eat_meridiem(sc: &mut Scan<'_>) -> Option<Meridiem> {
    let save = *sc;
    sc.spaces();
    let letter = sc.peek().map(|c| c.to_ascii_lowercase());
    let meridiem = match letter {
        Some('a') => Meridiem::Am,
        Some('p') => Meridiem::Pm,
        _ => {
            *sc = save;
            return None;
        }
    };
    sc.pos += 1;
    let dotted = sc.eat('.');
    let m = sc.peek().map(|c| c.to_ascii_lowercase());
    if m != Some('m') {
        *sc = save;
        return None;
    }
    sc.pos += 1;
    if dotted {
        sc.eat('.');
    }
    if sc.peek().is_some_and(is_word_char) {
        *sc = save;
        return None;
    }
    Some(meridiem)
}

/// `hrs`, `hr`, `hours` after optional spaces.
fn eat_hours_suffix(sc: &mut Scan<'_>) -> bool {
    let save = *sc;
    sc.spaces();
    if matches!(
        sc.word().to_lowercase().as_str(),
        "hrs" | "hr" | "hours" | "hour"
    ) {
        true
    } else {
        *sc = save;
        false
    }
}

/// Eats a Hindi `बजे` after optional spaces.
fn eat_baje(sc: &mut Scan<'_>) {
    let save = *sc;
    sc.spaces();
    if sc.word() != HINDI_BAJE {
        *sc = save;
    }
}

fn time_value(
    hour: u32,
    minute: u32,
    second: Option<u32>,
    meridiem: Option<Meridiem>,
    hours_suffix: bool,
) -> Option<Semiotic> {
    let hour_ok = if meridiem.is_some() {
        (1..=12).contains(&hour)
    } else {
        hour <= 23
    };
    if !hour_ok || minute > 59 || second.is_some_and(|s| s > 59) {
        return None;
    }
    Some(Semiotic::Time(Time {
        hour: u8::try_from(hour).ok()?,
        minute: u8::try_from(minute).ok()?,
        second: second.and_then(|s| u8::try_from(s).ok()),
        meridiem,
        hours_suffix,
        duration: false,
    }))
}

/// `5:30`, `5:30:15`, with `PM` or `hrs`, and a trailing `बजे`.
fn parse_clock(s: &str) -> Option<(usize, Semiotic)> {
    let mut sc = Scan::new(s);
    let hour = sc.num(1, 2)?;
    if !sc.eat(':') {
        return None;
    }
    let minute = sc.num(2, 2)?;
    let before_seconds = sc;
    let second = if sc.eat(':') {
        let v = sc.num(2, 2);
        if v.is_none() {
            sc = before_seconds;
        }
        v
    } else {
        None
    };
    let after_digits = sc;
    let meridiem = eat_meridiem(&mut sc);
    let hours_suffix = meridiem.is_none() && eat_hours_suffix(&mut sc);
    if meridiem.is_none() && !hours_suffix {
        sc = after_digits;
    }
    eat_baje(&mut sc);
    let value = time_value(hour, minute, second, meridiem, hours_suffix)?;
    Some((sc.pos, value))
}

/// `5 pm`, `11AM`.
fn parse_hour_meridiem(s: &str) -> Option<(usize, Semiotic)> {
    let mut sc = Scan::new(s);
    let hour = sc.num(1, 2)?;
    let meridiem = eat_meridiem(&mut sc)?;
    let value = time_value(hour, 0, None, Some(meridiem), false)?;
    Some((sc.pos, value))
}

/// A duration unit, ranked so that parts must go hours, minutes, seconds.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Part {
    Hours,
    Minutes,
    Seconds,
}

/// The unit a word names, and whether it is a single letter.
fn unit_of(word: &str) -> Option<(Part, bool)> {
    match word {
        "h" => return Some((Part::Hours, true)),
        "m" => return Some((Part::Minutes, true)),
        "s" => return Some((Part::Seconds, true)),
        _ => {}
    }
    let part = match word.to_lowercase().as_str() {
        "hr" | "hrs" | "hour" | "hours" => Part::Hours,
        "min" | "mins" | "minute" | "minutes" => Part::Minutes,
        "sec" | "secs" | "second" | "seconds" => Part::Seconds,
        _ => return None,
    };
    Some((part, false))
}

/// `2h 15m`, `45 min`, `2 hrs 15 mins`.
fn parse_duration(s: &str) -> Option<(usize, Semiotic)> {
    let mut sc = Scan::new(s);
    let mut amounts = [None::<u32>; 3];
    let mut last: Option<Part> = None;
    let mut count = 0;
    let mut lone_letter = false;
    let mut end = 0;
    while let Some((n, _)) = sc.num_n(PART_DIGITS).filter(|(n, _)| *n <= MAX_PART) {
        let spaced = sc.spaces() > 0;
        let Some((part, single)) = unit_of(sc.word()) else {
            break;
        };
        if last.is_some_and(|l| l as u8 >= part as u8) || (single && spaced) {
            break;
        }
        if let Some(slot) = amounts.get_mut(part as usize) {
            *slot = Some(n);
        }
        lone_letter = single && part != Part::Hours;
        last = Some(part);
        count += 1;
        end = sc.pos;
        sc.spaces();
    }
    if count == 0 || (count == 1 && lone_letter) {
        return None;
    }
    let [h, m, sec] = amounts;
    if h.unwrap_or(0) + m.unwrap_or(0) + sec.unwrap_or(0) == 0 {
        return None;
    }
    Some((
        end,
        Semiotic::Time(Time {
            hour: u8::try_from(h.unwrap_or(0)).ok()?,
            minute: u8::try_from(m.unwrap_or(0)).ok()?,
            second: sec.and_then(|v| u8::try_from(v).ok()),
            meridiem: None,
            hours_suffix: false,
            duration: true,
        }),
    ))
}

#[cfg(test)]
mod tests {
    use super::super::testutil::Fixture;
    use super::*;
    use crate::LanguageHint;

    fn date(s: &str, locale: Locale) -> Option<Date> {
        match parse(s, locale)?.1 {
            Semiotic::Date(d) => Some(d),
            _ => None,
        }
    }

    fn time(s: &str) -> Option<(usize, Time)> {
        match parse(s, Locale::In)? {
            (n, Semiotic::Time(t)) => Some((n, t)),
            _ => None,
        }
    }

    fn d(day: u8, month: u8, year: u16) -> Date {
        Date {
            day: Some(day),
            month: Some(month),
            year: Some(year),
        }
    }

    #[test]
    fn test_datetime_numeric_follows_locale() {
        assert_eq!(date("05/12/2026", Locale::In), Some(d(5, 12, 2026)));
        assert_eq!(date("05/12/2026", Locale::Us), Some(d(12, 5, 2026)));
        assert_eq!(date("5-12-2026", Locale::In), Some(d(5, 12, 2026)));
        assert_eq!(date("5.12.2026", Locale::In), Some(d(5, 12, 2026)));
        assert_eq!(date("५/१२/२०२६", Locale::In), Some(d(5, 12, 2026)));
    }

    #[test]
    fn test_datetime_numeric_never_swaps() {
        assert_eq!(date("25/03/2026", Locale::Us), None);
        assert_eq!(date("03/25/2026", Locale::In), None);
        assert_eq!(date("31/02/2026", Locale::In), None);
        assert_eq!(date("29/02/2025", Locale::In), None);
        assert_eq!(date("29/02/2024", Locale::In), Some(d(29, 2, 2024)));
        assert_eq!(date("29/02/2000", Locale::In), Some(d(29, 2, 2000)));
        assert_eq!(date("29/02/1900", Locale::In), None);
        assert_eq!(date("0/12/2026", Locale::In), None);
        assert_eq!(date("5/13/2026", Locale::In), None);
        assert_eq!(date("31/04/2026", Locale::In), None);
    }

    #[test]
    fn test_datetime_numeric_rejects_other_shapes() {
        assert_eq!(date("05/12", Locale::In), None);
        assert_eq!(date("05/12-2026", Locale::In), None);
        assert_eq!(date("05/12/26", Locale::In), None);
        assert_eq!(date("123/12/2026", Locale::In), None);
        assert_eq!(date("12345/12/2026", Locale::In), None);
        assert_eq!(date("0999-12-01", Locale::In), None);
        assert_eq!(date("05/12/0999", Locale::In), None);
        assert_eq!(date("3/4", Locale::In), None);
    }

    #[test]
    fn test_datetime_iso_ignores_locale() {
        assert_eq!(date("2026-03-05", Locale::In), Some(d(5, 3, 2026)));
        assert_eq!(date("2026-03-05", Locale::Us), Some(d(5, 3, 2026)));
        assert_eq!(date("2026/03/05", Locale::In), Some(d(5, 3, 2026)));
        assert_eq!(date("2026-13-05", Locale::In), None);
    }

    #[test]
    fn test_datetime_month_names() {
        assert_eq!(date("5 March 2026", Locale::In), Some(d(5, 3, 2026)));
        assert_eq!(date("5th Dec 2026", Locale::In), Some(d(5, 12, 2026)));
        assert_eq!(date("05-Dec-2026", Locale::In), Some(d(5, 12, 2026)));
        assert_eq!(date("5 मार्च 2026", Locale::In), Some(d(5, 3, 2026)));
        assert_eq!(date("5 फ़रवरी 2026", Locale::In), Some(d(5, 2, 2026)));
        assert_eq!(date("५ सितम्बर २०२६", Locale::In), Some(d(5, 9, 2026)));
        assert_eq!(date("March 5, 2026", Locale::Us), Some(d(5, 3, 2026)));
        assert_eq!(date("Dec 25th", Locale::Us).map(|x| x.year), Some(None));
        assert_eq!(
            date("March 2026", Locale::In),
            Some(Date {
                day: None,
                month: Some(3),
                year: Some(2026)
            })
        );
        assert_eq!(
            date("5 March", Locale::In).map(|x| (x.day, x.month, x.year)),
            Some((Some(5), Some(3), None))
        );
    }

    #[test]
    fn test_datetime_month_name_guards() {
        // Lowercase may is a verb unless a year follows.
        assert_eq!(date("5 may be", Locale::In), None);
        assert_eq!(date("5 may 2026", Locale::In), Some(d(5, 5, 2026)));
        assert_eq!(date("may 5", Locale::In), None);
        assert_eq!(date("May I help", Locale::In), None);
        assert_eq!(date("March", Locale::In), None);
        assert_eq!(date("March12", Locale::In), None);
        assert_eq!(date("31 April 2026", Locale::In), None);
        assert_eq!(date("5 hello 2026", Locale::In), None);
        assert_eq!(date("5March", Locale::In), None);
        assert_eq!(
            date("March 5 12345", Locale::In).map(|x| x.year),
            Some(None)
        );
        assert_eq!(date("March 31, 2026", Locale::In), Some(d(31, 3, 2026)));
        assert_eq!(date("March 32", Locale::In), None);
    }

    #[test]
    fn test_datetime_clock_times() {
        let (n, t) = time("5:30 PM rest").expect("time");
        assert_eq!(n, "5:30 PM".len());
        assert_eq!((t.hour, t.minute, t.meridiem), (5, 30, Some(Meridiem::Pm)));
        let (_, t) = time("17:30 hrs").expect("time");
        assert!(t.hours_suffix && t.meridiem.is_none() && !t.duration);
        assert_eq!(
            time("5:30 p.m.").map(|(_, t)| t.meridiem),
            Some(Some(Meridiem::Pm))
        );
        assert_eq!(
            time("5:30pm").map(|(_, t)| t.meridiem),
            Some(Some(Meridiem::Pm))
        );
        assert_eq!(
            time("9:05 a.m").map(|(_, t)| t.meridiem),
            Some(Some(Meridiem::Am))
        );
        assert_eq!(time("5:30:15").map(|(_, t)| t.second), Some(Some(15)));
        assert_eq!(time("5:30:1").map(|(n, _)| n), Some(4));
        assert_eq!(time("17:30").map(|(_, t)| t.hour), Some(17));
        assert_eq!(time("17:30 hr").map(|(_, t)| t.hours_suffix), Some(true));
        assert_eq!(time("५:३० बजे").map(|(n, _)| n), Some("५:३० बजे".len()));
        assert_eq!(time("5:30 बजे").map(|(n, _)| n), Some("5:30 बजे".len()));
        assert_eq!(time("5:30 बजेx").map(|(n, _)| n), Some("5:30".len()));
    }

    #[test]
    fn test_datetime_clock_rejects() {
        assert_eq!(time("24:00"), None);
        assert_eq!(time("13:00 PM"), None);
        assert_eq!(time("0:30 AM"), None);
        assert_eq!(time("5:60"), None);
        assert_eq!(time("5:5"), None);
        assert_eq!(time("5:30:61"), None);
        assert_eq!(time("5:30 PMx").map(|(n, _)| n), Some("5:30".len()));
        assert_eq!(time("5:30 apple").map(|(n, _)| n), Some("5:30".len()));
        assert_eq!(time("5:30 a b").map(|(n, _)| n), Some("5:30".len()));
        assert_eq!(time("5:30 ax").map(|(n, _)| n), Some("5:30".len()));
        assert_eq!(time("5:30 hrsx").map(|(n, _)| n), Some("5:30".len()));
        assert_eq!(time("5 pm").map(|(_, t)| t.hour), Some(5));
        assert_eq!(time("5 PMs"), None);
        assert_eq!(time("13 pm"), None);
    }

    #[test]
    fn test_datetime_durations() {
        let (n, t) = time("2h 15m left").expect("duration");
        assert_eq!(n, "2h 15m".len());
        assert!(t.duration);
        assert_eq!((t.hour, t.minute, t.second), (2, 15, None));
        assert_eq!(time("2h").map(|(_, t)| t.hour), Some(2));
        assert_eq!(time("2h15m").map(|(_, t)| t.minute), Some(15));
        assert_eq!(time("45 min").map(|(_, t)| t.minute), Some(45));
        assert_eq!(time("90 mins").map(|(_, t)| t.minute), Some(90));
        assert_eq!(time("45 sec").map(|(_, t)| t.second), Some(Some(45)));
        assert_eq!(
            time("1m 30s").map(|(_, t)| (t.minute, t.second)),
            Some((1, Some(30)))
        );
        assert_eq!(
            time("2 hrs 15 mins").map(|(_, t)| (t.hour, t.minute)),
            Some((2, 15))
        );
        assert_eq!(time("1 hour 30 minutes").map(|(_, t)| t.minute), Some(30));
        assert_eq!(time("1h 30m 10s").map(|(_, t)| t.second), Some(Some(10)));
    }

    #[test]
    fn test_datetime_durations_rejects() {
        // A lone minute or second letter is a unit or a decade, not a duration.
        assert_eq!(time("5m"), None);
        assert_eq!(time("30s"), None);
        assert_eq!(time("5 m"), None);
        assert_eq!(time("2 h"), None);
        assert_eq!(time("0 min"), None);
        assert_eq!(time("256 min"), None);
        assert_eq!(time("1234 min"), None);
        // Parts must descend.
        assert_eq!(time("15m 2h").map(|(n, _)| n), None);
        assert_eq!(time("2h 2h").map(|(n, _)| n), Some("2h".len()));
        assert_eq!(time("2 hello"), None);
        assert_eq!(time("2H"), None);
    }

    #[test]
    fn test_datetime_detect_dates_win_over_numbers() {
        let f = Fixture::new("Due 05/12/2026 at 5:30 PM. कल 10 बजे।", LanguageHint::EnIn);
        let ctx = f.ctx();
        let spans = super::super::classify(&ctx);
        let found: Vec<&str> = spans
            .iter()
            .filter(|s| matches!(s.semiotic, Some(Semiotic::Date(_) | Semiotic::Time(_))))
            .map(|s| &f.text[s.tagged.span.range.clone()])
            .collect();
        assert_eq!(found, ["05/12/2026", "5:30 PM"]);
    }

    #[test]
    fn test_datetime_detect_locale_from_hint() {
        let f = Fixture::new("05/12/2026", LanguageHint::EnUs);
        let (_, det) = f.first(detect).expect("date");
        assert_eq!(
            det.value,
            Semiotic::Date(Date {
                day: Some(12),
                month: Some(5),
                year: Some(2026)
            })
        );
    }

    #[test]
    fn test_datetime_detect_bare_year() {
        for (text, hit) in [
            ("in 2026", true),
            ("Since 1999 we", true),
            ("साल 2026", true),
            ("2026 में", true),
            ("pay 2026", false),
            ("in 1850", false),
            ("in 20260", false),
            ("in 2,026", false),
            ("in", false),
        ] {
            let f = Fixture::new(text, LanguageHint::EnIn);
            let found = f.first(detect).is_some();
            assert_eq!(found, hit, "{text}");
        }
    }

    #[test]
    fn test_datetime_detect_respects_neighbours() {
        for text in [
            "x5:30 PM",
            "a/5:30 PM",
            "05/12/2026/7",
            "05/12/2026.5",
            "05/12/2026x",
            "hello",
            "-",
        ] {
            let f = Fixture::new(text, LanguageHint::EnIn);
            let ctx = f.ctx();
            let hit = (0..ctx.len()).any(|i| detect(&ctx, i).is_some());
            assert!(!hit, "{text}");
        }
    }

    #[test]
    fn test_datetime_detect_stops_at_token_boundary() {
        // The match must end where a token ends: `5 PM` inside `5 PM.` is fine.
        let f = Fixture::new("Meet at 5 PM.", LanguageHint::EnIn);
        let (i, det) = f.first(detect).expect("time");
        assert_eq!(f.ctx().text_between(i, det.end), "5 PM");
    }

    #[test]
    fn test_datetime_relative_words_not_claimed() {
        for text in [
            "kal",
            "tomorrow",
            "yesterday",
            "next week",
            "कल",
            "आज",
            "parso",
        ] {
            let f = Fixture::new(text, LanguageHint::Hinglish);
            assert_eq!(f.first(detect), None, "{text}");
        }
    }
}
