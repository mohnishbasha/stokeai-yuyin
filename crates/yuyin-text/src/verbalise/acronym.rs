//! Acronym verbaliser (owner: S1-T07, PRD FR-010).
//!
//! Precedence: tenant override, then built-in lexicon, then letter-by-letter for an unknown
//! all-caps token. Readings follow `docs/TEST_PLAN.md` section 5: English letters are capitals
//! separated by spaces ("K Y C"), Hindi is Devanagari ("के वाई सी"), a word reading is the word.

use super::{VerbaliseCtx, Verbalised};
use crate::classify::acronym::is_spellable_caps;
use crate::lexicon::{Lexicons, TenantLexicon};
use crate::{Lang, Semiotic};

/// Hindi letter names, A to Z. Z uses the nukta form, as the other Hindi readings do.
const HINDI_LETTERS: [(char, &str); 26] = [
    ('A', "ए"),
    ('B', "बी"),
    ('C', "सी"),
    ('D', "डी"),
    ('E', "ई"),
    ('F', "एफ"),
    ('G', "जी"),
    ('H', "एच"),
    ('I', "आई"),
    ('J', "जे"),
    ('K', "के"),
    ('L', "एल"),
    ('M', "एम"),
    ('N', "एन"),
    ('O', "ओ"),
    ('P', "पी"),
    ('Q', "क्यू"),
    ('R', "आर"),
    ('S', "एस"),
    ('T', "टी"),
    ('U', "यू"),
    ('V', "वी"),
    ('W', "डब्ल्यू"),
    ('X', "एक्स"),
    ('Y', "वाई"),
    ('Z', "ज\u{093C}ेड"),
];

/// Spells `term` letter by letter in `lang`, or `None` if it has a character outside A to Z.
///
/// # Examples
///
/// ```
/// use yuyin_text::verbalise::acronym::spell;
/// use yuyin_text::Lang;
/// assert_eq!(spell("XYZ", Lang::En).as_deref(), Some("X Y Z"));
/// assert_eq!(spell("KYC", Lang::Hi).as_deref(), Some("के वाई सी"));
/// assert_eq!(spell("K1", Lang::En), None);
/// ```
#[must_use]
pub fn spell(term: &str, lang: Lang) -> Option<String> {
    let mut parts: Vec<String> = Vec::new();
    for c in term.chars() {
        if !c.is_ascii_uppercase() {
            return None;
        }
        match lang {
            Lang::En => parts.push(c.to_string()),
            Lang::Hi => {
                let (_, name) = HINDI_LETTERS.iter().find(|(l, _)| *l == c)?;
                parts.push((*name).to_owned());
            }
        }
    }
    (!parts.is_empty()).then(|| parts.join(" "))
}

/// The spoken form of `term` in `lang` and the language of that text.
///
/// Tenant override first, then the built-in lexicon, then letter by letter for an unknown
/// all-caps token of 2 to 5 letters. `None` means the term is not an acronym.
///
/// # Examples
///
/// ```
/// use yuyin_text::verbalise::acronym::spoken_form;
/// use yuyin_text::{Lang, Lexicons, TenantLexicon};
/// let lex = Lexicons::builtin();
/// assert_eq!(spoken_form("EMI", Lang::En, lex, None), Some(("E M I".to_owned(), Lang::En)));
/// assert_eq!(spoken_form("EMI", Lang::Hi, lex, None), Some(("ई एम आई".to_owned(), Lang::Hi)));
/// let mut tenant = TenantLexicon::new();
/// tenant.insert("EMI", "ee em aai", Some(Lang::En)).unwrap();
/// assert_eq!(
///     spoken_form("EMI", Lang::En, lex, Some(&tenant)),
///     Some(("ee em aai".to_owned(), Lang::En))
/// );
/// ```
#[must_use]
pub fn spoken_form(
    term: &str,
    lang: Lang,
    lexicons: &Lexicons,
    tenant: Option<&TenantLexicon>,
) -> Option<(String, Lang)> {
    if let Some(entry) = tenant.and_then(|t| t.get(term, lang)) {
        return Some((entry.spoken_form.clone(), entry.lang.unwrap_or(lang)));
    }
    if let Some(entry) = lexicons.acronyms.get(term) {
        let text = match lang {
            Lang::En => &entry.reading_en,
            Lang::Hi => &entry.reading_hi,
        };
        return Some((text.clone(), lang));
    }
    if is_spellable_caps(term) {
        return spell(term, lang).map(|t| (t, lang));
    }
    None
}

/// Verbaliser for `Acronym`.
///
/// # Examples
///
/// ```
/// use yuyin_text::{normalise_to_string, LanguageHint, NormaliseOptions};
/// let en = normalise_to_string("Your EMI is due", &NormaliseOptions::new(LanguageHint::EnIn)).unwrap();
/// assert_eq!(en, "Your E M I is due");
/// let hi = normalise_to_string("आपकी EMI बाकी है", &NormaliseOptions::new(LanguageHint::Hi)).unwrap();
/// assert_eq!(hi, "आपकी ई एम आई बाकी है");
/// ```
#[must_use]
pub fn verbalise(sem: &Semiotic, ctx: &VerbaliseCtx<'_>) -> Option<Verbalised> {
    let Semiotic::Acronym(a) = sem else {
        return None;
    };
    let (text, lang) = spoken_form(&a.term, ctx.lang, ctx.lexicons, ctx.tenant)?;
    Some(Verbalised {
        text,
        lang,
        pace_hint: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::classify::acronym::Acronym;
    use crate::verbalise::{samples, test_ctx};
    use crate::{normalise_to_string, LanguageHint, NormaliseOptions};

    fn acr(term: &str) -> Semiotic {
        Semiotic::Acronym(Acronym { term: term.into() })
    }

    fn say(term: &str, lang: Lang) -> Option<String> {
        verbalise(&acr(term), &test_ctx(lang, term)).map(|v| v.text)
    }

    #[test]
    fn test_acronym_verbalise_ignores_other_variants() {
        for s in samples::all() {
            if !matches!(s, Semiotic::Acronym(_)) {
                assert_eq!(verbalise(&s, &test_ctx(Lang::Hi, "x")), None);
            }
        }
    }

    #[test]
    fn test_acronym_verbalise_not_an_acronym_is_none() {
        assert_eq!(say("Hello", Lang::En), None);
        assert_eq!(say("QZXWVU", Lang::Hi), None);
    }

    #[test]
    fn test_acronym_spell_rejects_empty_and_non_capitals() {
        assert_eq!(spell("", Lang::En), None);
        assert_eq!(spell("", Lang::Hi), None);
        assert_eq!(spell("kyc", Lang::Hi), None);
        assert_eq!(
            spell("ZZ", Lang::Hi).as_deref(),
            Some("ज\u{093C}ेड ज\u{093C}ेड")
        );
    }

    #[test]
    fn test_acronym_hindi_letter_table_is_in_alphabet_order() {
        let letters: String = HINDI_LETTERS.iter().map(|(c, _)| *c).collect();
        assert_eq!(letters, "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    }

    #[test]
    fn unit_text_acronyms_unknowncaps_2to5letters_letterbyletter() {
        let opts = |h| NormaliseOptions::new(h);
        let en = |s: &str| normalise_to_string(s, &opts(LanguageHint::EnUs)).unwrap();
        assert_eq!(en("QZ"), "Q Z");
        assert_eq!(en("The QZX plan"), "The Q Z X plan");
        assert_eq!(en("QZXW"), "Q Z X W");
        assert_eq!(en("QZXWV"), "Q Z X W V");
        // Outside 2 to 5 letters or not all capitals: untouched.
        assert_eq!(en("QZXWVU"), "QZXWVU");
        assert_eq!(en("Qzx"), "Qzx");
        assert_eq!(en("qzx"), "qzx");
        let hi = normalise_to_string("यह QZX है", &opts(LanguageHint::Hi)).unwrap();
        assert_eq!(hi, "यह क्यू ज\u{093C}ेड एक्स है");
    }

    #[test]
    fn unit_text_acronyms_builtin_emikycupi_readcorrectly() {
        for (term, en, hi) in [
            ("EMI", "E M I", "ई एम आई"),
            ("KYC", "K Y C", "के वाई सी"),
            ("UPI", "U P I", "यू पी आई"),
        ] {
            assert_eq!(say(term, Lang::En).as_deref(), Some(en));
            assert_eq!(say(term, Lang::Hi).as_deref(), Some(hi));
        }
        assert_eq!(say("PAN", Lang::En).as_deref(), Some("pan"));
        assert_eq!(say("PAN", Lang::Hi).as_deref(), Some("पैन"));
        assert_eq!(say("NASA", Lang::En).as_deref(), Some("nasa"));
        assert_eq!(say("NASA", Lang::Hi).as_deref(), Some("नासा"));
    }

    #[test]
    fn unit_text_acronyms_override_tenantprecedence_beatsbuiltin() {
        let mut tenant = crate::TenantLexicon::new();
        tenant.insert("EMI", "ee em aai", Some(Lang::En)).unwrap();
        tenant.insert("KYC", "केवाईसी", None).unwrap();
        tenant
            .insert("KYC", "के वाई सी जाँच", Some(Lang::Hi))
            .unwrap();
        tenant.insert("QZX", "quiz ex", None).unwrap();
        let with = |text: &str, hint| {
            let mut o = NormaliseOptions::new(hint);
            o.tenant_lexicon = Some(&tenant);
            normalise_to_string(text, &o).unwrap()
        };
        let without =
            |text: &str, hint| normalise_to_string(text, &NormaliseOptions::new(hint)).unwrap();
        // Organisation A has the override, organisation B has none (FR-010 AC-2).
        assert_eq!(with("EMI", LanguageHint::EnIn), "ee em aai");
        assert_eq!(without("EMI", LanguageHint::EnIn), "E M I");
        // An English-only override does not leak into Hindi.
        assert_eq!(with("आपकी EMI", LanguageHint::Hi), "आपकी ई एम आई");
        // A language-specific override beats an all-language one.
        assert_eq!(with("अपना KYC", LanguageHint::Hi), "अपना के वाई सी जाँच");
        assert_eq!(with("my KYC", LanguageHint::EnIn), "my केवाईसी");
        // An override also beats the unknown-caps default.
        assert_eq!(with("QZX", LanguageHint::EnUs), "quiz ex");
        assert_eq!(without("QZX", LanguageHint::EnUs), "Q Z X");
    }

    #[test]
    fn unit_text_acronym_tenant_override_wins() {
        let mut tenant = crate::TenantLexicon::new();
        tenant
            .insert("PAN", "permanent account number", None)
            .unwrap();
        let lex = Lexicons::builtin();
        assert_eq!(
            spoken_form("PAN", Lang::En, lex, Some(&tenant))
                .map(|r| r.0)
                .as_deref(),
            Some("permanent account number")
        );
        assert_eq!(
            spoken_form("PAN", Lang::En, lex, None)
                .map(|r| r.0)
                .as_deref(),
            Some("pan")
        );
    }
}
