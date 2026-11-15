//! Date and time verbaliser (owner: S1-T05, PRD FR-008).
//!
//! Spoken in the context language. English reads dates with the locale's habit: `en-IN` "the
//! fifth of December twenty twenty-six", `en-US` "December fifth twenty twenty-six". Hindi always
//! reads the day first: "पाँच दिसंबर दो हज़ार छब्बीस". Times read as "five thirty P M" or
//! "शाम के साढ़े पाँच बजे"; `hrs` times read as "seventeen thirty hours".

use super::number::{cardinal, ordinal};
use super::{VerbaliseCtx, Verbalised};
use crate::classify::datetime::{Date, Meridiem, Time};
use crate::{Lang, Locale, Semiotic};

const EN_MONTHS: [&str; 12] = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];
const HI_MONTHS: [&str; 12] = [
    "जनवरी",
    "फरवरी",
    "मार्च",
    "अप्रैल",
    "मई",
    "जून",
    "जुलाई",
    "अगस्त",
    "सितंबर",
    "अक्टूबर",
    "नवंबर",
    "दिसंबर",
];
const HUNDRED: u64 = 100;
/// Hours on a 12 hour clock face.
const NOON: u8 = 12;

/// Verbaliser for `Date` and `Time`.
///
/// # Examples
///
/// ```
/// use yuyin_text::classify::datetime::Date;
/// use yuyin_text::verbalise::{datetime::verbalise, VerbaliseCtx};
/// use yuyin_text::{Lang, LanguageHint, Lexicons, Locale, Semiotic};
/// let sem = Semiotic::Date(Date { day: Some(5), month: Some(12), year: Some(2026) });
/// let ctx = VerbaliseCtx {
///     lang: Lang::En, locale: Locale::Us, hint: LanguageHint::EnUs,
///     lexicons: Lexicons::builtin(), tenant: None, source: "12/05/2026",
/// };
/// assert_eq!(verbalise(&sem, &ctx).unwrap().text, "December fifth twenty twenty-six");
/// ```
#[must_use]
pub fn verbalise(sem: &Semiotic, ctx: &VerbaliseCtx<'_>) -> Option<Verbalised> {
    let text = match sem {
        Semiotic::Date(d) => date(d, ctx.lang, ctx.locale),
        Semiotic::Time(t) => time(*t, ctx.lang, ctx.locale),
        _ => return None,
    };
    Some(Verbalised {
        text,
        lang: ctx.lang,
        pace_hint: None,
    })
}

/// A year as spoken: "twenty twenty-six", "nineteen ninety-nine", "two thousand five".
/// Hindi reads 2000 and later as a cardinal and earlier years in hundreds ("उन्नीस सौ निन्यानवे").
#[must_use]
pub fn year(y: u16, lang: Lang, locale: Locale) -> String {
    let y = u64::from(y);
    let (high, low) = (y / HUNDRED, y % HUNDRED);
    let words = |n: u64| cardinal(n, lang, locale);
    match lang {
        Lang::Hi if y >= 2000 || high < 11 => words(y),
        Lang::Hi if low == 0 => format!("{} सौ", words(high)),
        Lang::Hi => format!("{} सौ {}", words(high), words(low)),
        Lang::En if (2000..2010).contains(&y) => words(y),
        Lang::En if low == 0 => format!("{} hundred", words(high)),
        Lang::En if low < 10 => format!("{} oh {}", words(high), words(low)),
        Lang::En => format!("{} {}", words(high), words(low)),
    }
}

/// A date as spoken words.
#[must_use]
pub fn date(d: &Date, lang: Lang, locale: Locale) -> String {
    let month = d
        .month
        .and_then(|m| usize::from(m).checked_sub(1))
        .and_then(|i| match lang {
            Lang::Hi => HI_MONTHS.get(i),
            Lang::En => EN_MONTHS.get(i),
        })
        .copied();
    let day = d.day.map(u64::from);
    let mut parts: Vec<String> = Vec::new();
    match (lang, day, month) {
        (Lang::Hi, day, month) => {
            parts.extend(day.map(|n| cardinal(n, lang, locale)));
            parts.extend(month.map(str::to_owned));
        }
        (Lang::En, Some(n), Some(m)) if locale == Locale::Us => {
            parts.push(m.to_owned());
            parts.push(ordinal(n, lang, locale));
        }
        (Lang::En, Some(n), Some(m)) => {
            parts.push(format!("the {} of {m}", ordinal(n, lang, locale)));
        }
        (Lang::En, _, month) => parts.extend(month.map(str::to_owned)),
    }
    parts.extend(d.year.map(|y| year(y, lang, locale)));
    parts.join(" ")
}

/// A time of day or a duration as spoken words.
#[must_use]
pub fn time(t: Time, lang: Lang, locale: Locale) -> String {
    match (t.duration, lang) {
        (true, _) => duration(t, lang, locale),
        (false, Lang::En) => en_clock(t, locale),
        (false, Lang::Hi) => hi_clock(t, locale),
    }
}

/// "two hours fifteen minutes", "दो घंटे पंद्रह मिनट".
fn duration(t: Time, lang: Lang, locale: Locale) -> String {
    let parts = [
        (u64::from(t.hour), "hour", "घंटा", "घंटे"),
        (u64::from(t.minute), "minute", "मिनट", "मिनट"),
        (u64::from(t.second.unwrap_or(0)), "second", "सेकंड", "सेकंड"),
    ];
    parts
        .iter()
        .filter(|(n, ..)| *n > 0)
        .map(|(n, en, hi_one, hi_many)| {
            let words = cardinal(*n, lang, locale);
            match lang {
                Lang::En if *n == 1 => format!("{words} {en}"),
                Lang::En => format!("{words} {en}s"),
                Lang::Hi if *n == 1 => format!("{words} {hi_one}"),
                Lang::Hi => format!("{words} {hi_many}"),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// "oh five" for 1 to 9, the cardinal otherwise.
fn en_minute(m: u8, locale: Locale) -> String {
    if (1..10).contains(&m) {
        format!("oh {}", cardinal(u64::from(m), Lang::En, locale))
    } else {
        cardinal(u64::from(m), Lang::En, locale)
    }
}

fn en_seconds(t: Time, locale: Locale) -> String {
    t.second.filter(|s| *s > 0).map_or_else(String::new, |s| {
        format!(" and {} seconds", cardinal(u64::from(s), Lang::En, locale))
    })
}

fn en_clock(t: Time, locale: Locale) -> String {
    let hour = |h: u8| cardinal(u64::from(h), Lang::En, locale);
    let seconds = en_seconds(t, locale);
    if let Some(m) = t.meridiem {
        if t.minute == 0 && t.hour == NOON && t.second.is_none() {
            return match m {
                Meridiem::Am => "midnight".to_owned(),
                Meridiem::Pm => "noon".to_owned(),
            };
        }
        let mer = match m {
            Meridiem::Am => "A M",
            Meridiem::Pm => "P M",
        };
        let minute = if t.minute == 0 && seconds.is_empty() {
            String::new()
        } else {
            format!(" {}", en_minute(t.minute, locale))
        };
        return format!("{}{minute}{seconds} {mer}", hour(t.hour));
    }
    if t.hours_suffix || t.hour == 0 || t.hour > NOON {
        // Twenty-four hour reading: "seventeen thirty hours", "oh nine hundred hours".
        let head = match (t.hour, t.minute) {
            (0, 0) => "zero".to_owned(),
            (0, _) => "zero zero".to_owned(),
            (h, _) if h < 10 => format!("oh {}", hour(h)),
            (h, _) => hour(h),
        };
        let minute = match t.minute {
            0 => " hundred".to_owned(),
            m => format!(" {}", en_minute(m, locale)),
        };
        let suffix = if t.hours_suffix { " hours" } else { "" };
        return format!("{head}{minute}{seconds}{suffix}");
    }
    if t.minute == 0 && seconds.is_empty() {
        return format!("{} o'clock", hour(t.hour));
    }
    format!("{} {}{seconds}", hour(t.hour), en_minute(t.minute, locale))
}

/// The Hindi part of the day for an hour on the 24 hour clock.
fn hi_period(hour24: u8) -> &'static str {
    match hour24 {
        4..=11 => "सुबह",
        12..=14 => "दोपहर",
        15..=19 => "शाम",
        _ => "रात",
    }
}

/// "साढ़े तीन बजे", "सवा एक बजे", "पौने दो बजे", "तीन बजकर बीस मिनट".
fn hi_clock_body(hour12: u8, minute: u8, seconds: Option<u8>, locale: Locale) -> String {
    let word = |n: u8| cardinal(u64::from(n), Lang::Hi, locale);
    if let Some(s) = seconds.filter(|s| *s > 0) {
        return format!(
            "{} बजकर {} मिनट {} सेकंड",
            word(hour12),
            word(minute),
            word(s)
        );
    }
    let next = hour12 % NOON + 1;
    match (minute, hour12) {
        (0, h) => format!("{} बजे", word(h)),
        (15, h) => format!("सवा {} बजे", word(h)),
        (30, 1) => "डेढ़ बजे".to_owned(),
        (30, 2) => "ढाई बजे".to_owned(),
        (30, h) => format!("साढ़े {} बजे", word(h)),
        (45, _) => format!("पौने {} बजे", word(next)),
        (m, h) => format!("{} बजकर {} मिनट", word(h), word(m)),
    }
}

fn hi_clock(t: Time, locale: Locale) -> String {
    let word = |n: u8| cardinal(u64::from(n), Lang::Hi, locale);
    if t.hours_suffix {
        return match (t.minute, t.second.filter(|s| *s > 0)) {
            (0, None) => format!("{} बजे", word(t.hour)),
            (m, None) => format!("{} बजकर {} मिनट", word(t.hour), word(m)),
            (m, Some(s)) => format!("{} बजकर {} मिनट {} सेकंड", word(t.hour), word(m), word(s)),
        };
    }
    let (hour24, with_period) = match t.meridiem {
        Some(Meridiem::Am) => (t.hour % NOON, true),
        Some(Meridiem::Pm) => (t.hour % NOON + NOON, true),
        None => (t.hour, t.hour == 0 || t.hour > NOON),
    };
    let hour12 = match hour24 % NOON {
        0 => NOON,
        h => h,
    };
    if hour24 == 0 && t.minute == 0 && t.second.is_none() {
        return "आधी रात".to_owned();
    }
    let body = hi_clock_body(hour12, t.minute, t.second, locale);
    if with_period {
        format!("{} के {body}", hi_period(hour24))
    } else {
        body
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::verbalise::{samples, test_ctx};

    fn dt(h: u8, m: u8, mer: Option<Meridiem>, hrs: bool) -> Time {
        Time {
            hour: h,
            minute: m,
            second: None,
            meridiem: mer,
            hours_suffix: hrs,
            duration: false,
        }
    }

    fn en(t: Time) -> String {
        time(t, Lang::En, Locale::In)
    }

    fn hi(t: Time) -> String {
        time(t, Lang::Hi, Locale::In)
    }

    #[test]
    fn test_datetime_verbalise_owns_dates_and_times_only() {
        for s in samples::all() {
            let spoken = verbalise(&s, &test_ctx(Lang::Hi, "x"));
            let mine = matches!(s, Semiotic::Date(_) | Semiotic::Time(_));
            assert_eq!(spoken.is_some(), mine, "{s:?}");
        }
        let v = verbalise(&samples::all()[1], &test_ctx(Lang::En, "x")).expect("date");
        assert_eq!(v.lang, Lang::En);
        assert_eq!(v.pace_hint, None);
    }

    #[test]
    fn test_datetime_years() {
        let cases = [
            (2026, "twenty twenty-six"),
            (2000, "two thousand"),
            (2005, "two thousand five"),
            (2010, "twenty ten"),
            (1999, "nineteen ninety-nine"),
            (1905, "nineteen oh five"),
            (1900, "nineteen hundred"),
        ];
        for (y, words) in cases {
            assert_eq!(year(y, Lang::En, Locale::In), words, "{y}");
        }
        assert_eq!(year(2026, Lang::Hi, Locale::In), "दो हज़ार छब्बीस");
        assert_eq!(year(1999, Lang::Hi, Locale::In), "उन्नीस सौ निन्यानवे");
        assert_eq!(year(1900, Lang::Hi, Locale::In), "उन्नीस सौ");
        assert_eq!(year(1000, Lang::Hi, Locale::In), "एक हज़ार");
    }

    #[test]
    fn test_datetime_date_shapes() {
        let full = Date {
            day: Some(5),
            month: Some(3),
            year: Some(2026),
        };
        assert_eq!(
            date(&full, Lang::En, Locale::In),
            "the fifth of March twenty twenty-six"
        );
        assert_eq!(
            date(&full, Lang::En, Locale::Us),
            "March fifth twenty twenty-six"
        );
        assert_eq!(date(&full, Lang::Hi, Locale::Us), "पाँच मार्च दो हज़ार छब्बीस");
        let month_year = Date {
            day: None,
            month: Some(3),
            year: Some(2026),
        };
        assert_eq!(
            date(&month_year, Lang::En, Locale::In),
            "March twenty twenty-six"
        );
        assert_eq!(
            date(&month_year, Lang::Hi, Locale::In),
            "मार्च दो हज़ार छब्बीस"
        );
        let bad = Date {
            day: Some(1),
            month: Some(13),
            year: None,
        };
        assert_eq!(date(&bad, Lang::En, Locale::In), "");
    }

    #[test]
    fn test_datetime_english_clock() {
        use Meridiem::{Am, Pm};
        assert_eq!(en(dt(5, 30, Some(Pm), false)), "five thirty P M");
        assert_eq!(en(dt(9, 5, Some(Am), false)), "nine oh five A M");
        assert_eq!(en(dt(9, 0, Some(Am), false)), "nine A M");
        assert_eq!(en(dt(12, 0, Some(Am), false)), "midnight");
        assert_eq!(en(dt(12, 0, Some(Pm), false)), "noon");
        assert_eq!(en(dt(12, 30, Some(Am), false)), "twelve thirty A M");
        assert_eq!(en(dt(17, 30, None, true)), "seventeen thirty hours");
        assert_eq!(en(dt(9, 0, None, true)), "oh nine hundred hours");
        assert_eq!(en(dt(0, 0, None, true)), "zero hundred hours");
        assert_eq!(en(dt(0, 30, None, true)), "zero zero thirty hours");
        assert_eq!(en(dt(17, 5, None, false)), "seventeen oh five");
        assert_eq!(en(dt(5, 30, None, false)), "five thirty");
        assert_eq!(en(dt(5, 0, None, false)), "five o'clock");
        let mut s = dt(5, 30, Some(Pm), false);
        s.second = Some(15);
        assert_eq!(en(s), "five thirty and fifteen seconds P M");
        s.second = Some(0);
        assert_eq!(en(s), "five thirty P M");
        let mut bare = dt(5, 0, None, false);
        bare.second = Some(5);
        assert_eq!(en(bare), "five zero and five seconds");
    }

    #[test]
    fn test_datetime_hindi_clock() {
        use Meridiem::{Am, Pm};
        assert_eq!(hi(dt(3, 30, Some(Pm), false)), "शाम के साढ़े तीन बजे");
        assert_eq!(hi(dt(9, 0, Some(Am), false)), "सुबह के नौ बजे");
        assert_eq!(hi(dt(1, 30, Some(Pm), false)), "दोपहर के डेढ़ बजे");
        assert_eq!(hi(dt(2, 30, Some(Pm), false)), "दोपहर के ढाई बजे");
        assert_eq!(hi(dt(1, 15, Some(Am), false)), "रात के सवा एक बजे");
        assert_eq!(hi(dt(1, 45, Some(Pm), false)), "दोपहर के पौने दो बजे");
        assert_eq!(hi(dt(11, 45, Some(Pm), false)), "रात के पौने बारह बजे");
        assert_eq!(hi(dt(5, 20, Some(Pm), false)), "शाम के पाँच बजकर बीस मिनट");
        assert_eq!(hi(dt(12, 0, Some(Am), false)), "आधी रात");
        assert_eq!(hi(dt(12, 0, Some(Pm), false)), "दोपहर के बारह बजे");
        assert_eq!(hi(dt(17, 30, None, true)), "सत्रह बजकर तीस मिनट");
        assert_eq!(hi(dt(17, 0, None, true)), "सत्रह बजे");
        assert_eq!(hi(dt(17, 30, None, false)), "शाम के साढ़े पाँच बजे");
        assert_eq!(hi(dt(0, 30, None, false)), "रात के साढ़े बारह बजे");
        assert_eq!(hi(dt(5, 30, None, false)), "साढ़े पाँच बजे");
        let mut s = dt(5, 30, Some(Pm), false);
        s.second = Some(15);
        assert_eq!(hi(s), "शाम के पाँच बजकर तीस मिनट पंद्रह सेकंड");
        let mut h = dt(17, 30, None, true);
        h.second = Some(15);
        assert_eq!(hi(h), "सत्रह बजकर तीस मिनट पंद्रह सेकंड");
    }

    #[test]
    fn test_datetime_durations_spoken() {
        let d = |h, m, s| Time {
            hour: h,
            minute: m,
            second: s,
            meridiem: None,
            hours_suffix: false,
            duration: true,
        };
        assert_eq!(en(d(2, 15, None)), "two hours fifteen minutes");
        assert_eq!(en(d(1, 1, Some(1))), "one hour one minute one second");
        assert_eq!(en(d(0, 0, Some(30))), "thirty seconds");
        assert_eq!(hi(d(2, 15, None)), "दो घंटे पंद्रह मिनट");
        assert_eq!(hi(d(1, 0, Some(30))), "एक घंटा तीस सेकंड");
    }
}
