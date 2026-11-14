# Models and Voices

Model weights are not stored in this repository. `scripts/fetch-models.sh` downloads them into `./models` from the sources recorded in ADR-015 and verifies checksums (available from Sprint 3). Never commit weights, and never commit upstream licence files outside `docs/licences/`.

Requirement (NFR-017): every third-party model and voice has a recorded licence that permits commercial hosted use. Licence evidence is saved by hand in `docs/licences/`, and every voice in the registry has a `licence_ref` that resolves to a file there.

## What to record for each entry

- Licence of the code, the weights, each voice, and the phonemiser, with links.
- Whether commercial hosted use and redistribution inside a container image are allowed.
- Training data terms (reject non-commercial datasets).
- Attribution text required, if any.
- Checksum and source URL.

Reject GPL-licensed phonemisers and voices trained on datasets with non-commercial terms.

## Engine bake-off candidates (Sprint 1, S1-T10)

| Component | Candidate | Code licence | Weights licence | Voices licence | Phonemiser licence | Decision |
|---|---|---|---|---|---|---|
| Speech engine | Kokoro family | [TBD] | [TBD] | [TBD] | [TBD] | [Owner to decide after bake-off] |
| Speech engine | VITS family (Piper voices) | [TBD] | [TBD] | [TBD] | [TBD] | [Owner to decide after bake-off] |
| Speech engine | Matcha-TTS family | [TBD] | [TBD] | [TBD] | [TBD] | [Owner to decide after bake-off] |
| Runtime | ONNX Runtime / sherpa-onnx | [TBD] | n/a | n/a | n/a | [Owner to decide] |

## Selected models and voices

None selected yet. Add one row per voice once ADR-015 is merged.

| Voice or model | Language | Source URL | Licence | Attribution | `licence_ref` | Commercial hosted use confirmed |
|---|---|---|---|---|---|---|
| [none] | | | | | | |

## Fonts

Console fonts need their licences verified (SIL Open Font License expected) and recorded here: [TBD].
