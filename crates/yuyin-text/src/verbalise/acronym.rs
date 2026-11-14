//! Acronym verbaliser (owner: S1-T07).
//!
//! Stub: [`verbalise`] returns `None` until S1-T07 lands, so the source text passes through.

use super::{VerbaliseCtx, Verbalised};
use crate::Semiotic;

/// Verbaliser for `Acronym`.
///
/// Stub: always `None` (the source text passes through).
#[must_use]
pub fn verbalise(sem: &Semiotic, ctx: &VerbaliseCtx<'_>) -> Option<Verbalised> {
    let _ = (sem, ctx);
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::verbalise::{samples, test_ctx};
    use crate::Lang;

    #[test]
    fn test_acronym_verbalise_stub_returns_none() {
        for s in samples::all() {
            assert_eq!(verbalise(&s, &test_ctx(Lang::Hi, "KYC")), None);
            assert_eq!(verbalise(&s, &test_ctx(Lang::En, "KYC")), None);
        }
    }
}
