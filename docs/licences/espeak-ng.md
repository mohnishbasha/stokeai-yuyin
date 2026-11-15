# espeak-ng licence evidence

Retrieved: 2026-11-14
Retrieved by: agent (S1-T10 engine bake-off)

## Sources
- https://github.com/espeak-ng/espeak-ng (COPYING, source headers, latest release 1.52.0): licence
- https://github.com/bootphon/phonemizer (README Licence section, backend/espeak/api.py, release v3.6.0): Python wrapper
- https://pypi.org/project/phonemizer-fork/ (v3.3.2): fork used by misaki
- https://github.com/rhasspy/piper-phonemize (CMakeLists.txt): C++ library
- https://github.com/k2-fsa/sherpa-onnx (commit 0b36476, PR #4055, CHANGELOG, v1.13.8 and v2.0.1 releases): runtime
- sherpa-onnx kokoro-multi-lang-v1_0.tar.bz2 file listing (tts-models release)

## Licence
- Code: espeak-ng GPL-3.0 (COPYING is the GNU GPL v3 text; source headers say "version 3 of the License, or (at your option) any later version", so GPL-3.0-or-later). Data (espeak-ng-data dictionaries, hi_dict etc.) ships in the same project and is distributed with it; separate data licence not verified.
- Weights: not applicable.
- Voices: not applicable.
- Phonemiser: espeak-ng is the phonemiser for Hindi in misaki and for most non-English languages.
- Training data: not applicable.
- phonemizer (bootphon) GPL-3.0 (GitHub licence API; README: "either version 3 of the License"). phonemizer-fork on PyPI is also GPL-3.0 (full GPLv3 text in its licence field).
- piper-phonemize: GitHub licence API says MIT, but CMake downloads and links rhasspy/espeak-ng (`target_link_libraries ... espeak-ng`), so the resulting binary is effectively GPL. Repository now says "Piper development has moved: https://github.com/OHF-Voice/piper1-gpl".

## How each consumer uses espeak-ng
| Consumer | Mechanism |
|---|---|
| phonemizer / phonemizer-fork | Python ctypes: `ctypes.cdll.LoadLibrary(library)` on libespeak-ng (dlopen at runtime). It copies the library to a temp file per wrapper instance to get independent state. Library path may come from `espeakng_loader`. |
| misaki, kokoro | via phonemizer-fork plus `espeakng_loader.get_library_path()` (misaki/espeak.py). |
| kokoro-onnx | phonemizer plus `espeakng_loader`, ctypes, global lock (src/kokoro_onnx/tokenizer.py). |
| piper-phonemize | Linked as C++ library (static or shared per CMake `espeak-ng` link). |
| sherpa-onnx up to v1.13.8 | Built in: cmake/espeak-ng-for-piper.cmake fetched csukuangfj/espeak-ng and built it with BUILD_SHARED_LIBS forced OFF (static) inside sherpa-onnx, linked via piper_phonemize. |
| sherpa-onnx v2.0.0 and later (2026-10-20 commit, PR #4055) | Removed. Not built, not linked. |

## Excerpts
> GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007 (espeak-ng COPYING)
> it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 3 of the License, or (at your option) any later version. (espeak-ng source header)
> espeak-ng and piper-phonemize are no longer built into sherpa-onnx. ... That library is GPL, so it stays optional: sherpa-onnx is GPL-free after this PR. (sherpa-onnx PR #4055)

## Commercial hosted use and container redistribution
Purely hosted use (users only reach an API) does not distribute the binary, so GPL-3.0 copyleft is not triggered by network use (GPL-3.0, not AGPL); this is a general reading, not legal advice. Shipping a container image, or a self-host build (the project has a self-host licence), that contains libespeak-ng or espeak-ng-data is distribution and requires GPL-3.0 compliance for the combined work if linked, plus source offer. dlopen from Python (phonemizer) is still a derivative-work question under GPL; an arm's-length separate process is the safest isolation, and a GPL-free text frontend avoids the issue. Note the sherpa-onnx bundle kokoro-multi-lang-v1_0 still contains an espeak-ng-data directory (including Hindi data), so redistributing that tarball carries GPL data even though sherpa-onnx 2.0 does not link the library.
