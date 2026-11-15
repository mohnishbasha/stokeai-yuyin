# Meta MMS-TTS Hindi licence evidence

Retrieved: 2026-11-14
Retrieved by: agent (S1-T10 engine bake-off)

## Sources
- https://huggingface.co/facebook/mms-tts-hin: model card and licence
- https://k2-fsa.github.io/sherpa/onnx/tts/mms.html: sherpa-onnx MMS conversion page
- https://api.github.com/repos/k2-fsa/sherpa-onnx/releases/tags/tts-models: release asset list

## Licence
| Item | Value |
|---|---|
| Weights (facebook/mms-tts-hin) | CC-BY-NC 4.0 |
| Parameters | 36.3M |
| Code (fairseq / transformers VITS) | not verified |
| Phonemiser | MMS uses a character-level vocabulary (uroman not needed for Hindi); not verified in detail |
| Training data | not verified (MMS paper: arXiv 2305.13516, religious-text derived recordings, from general knowledge) |

- sherpa-onnx packaging: the MMS docs page says converted MMS models are on the tts-models release. In the release asset list fetched today there is no vits-mms-hin file (only nan, eng, spa, fra, tha, ukr, rus, deu seen in my filter). So a ready Hindi MMS ONNX package from sherpa-onnx was not found; it would need self-conversion, which does not change the licence.

## Excerpts
> License: CC-BY-NC 4.0 (facebook/mms-tts-hin model card)

> "Scaling Speech Technology to 1,000+ Languages" (required citation, Pratap et al., Meta AI)

## Commercial hosted use and container redistribution
CC-BY-NC 4.0 prohibits commercial use. A paid hosted TTS service, and any ONNX conversion shipped in a container, is a derivative under the same NC terms. A hosted service is commercial regardless of whether weights are redistributed. There is no route to clean use without a separate licence from Meta.
Verdict: RESTRICTED
