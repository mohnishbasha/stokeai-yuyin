# Hinglish tagging held-out set

`hinglish_heldout.tsv` holds hand-labelled tokens for the S1-T02 tagger accuracy test
(`crates/yuyin-text/tests/tagging_heldout.rs`). Columns: `sentence` (id), `token`, `lang`
(`hi` or `en`). Rows of one sentence are in order; the test joins them with spaces and tags
the sentence with `language: "auto"`.

Labelling convention: Hindi function and content words in Roman or Devanagari script are
`hi`. English words, loanwords written in Roman script (account, refund, order), acronyms
(OTP, KYC, EMI), and brand names (Jio, Paytm) are `en`.

The sentences are original first-party text written for this set, before the lexicon and
n-gram model were built. They are not used to build or train either, and must not be used
for training or for choosing lexicon entries.

Review note: after the first run, a label review fixed seven annotation typos (for example a
word marked English by mistake). No labels were changed to fit tagger output beyond that, and
no vocabulary was added to the tagger to fix individual misses.
