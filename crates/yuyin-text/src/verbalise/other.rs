//! Percent, unit, range, email, and URL verbaliser (owner: S1-T08).
//!
//! Stub: [`verbalise`] returns `None` until S1-T08 lands, so the source text passes through.

use super::{VerbaliseCtx, Verbalised};
use crate::Semiotic;

/// Verbaliser for `Percent`, `Unit`, `Range`, `Email`, and `Url`.
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
    fn test_other_verbalise_stub_returns_none() {
        for s in samples::all() {
            assert_eq!(verbalise(&s, &test_ctx(Lang::Hi, "8%")), None);
            assert_eq!(verbalise(&s, &test_ctx(Lang::En, "8%")), None);
        }
    }
}
