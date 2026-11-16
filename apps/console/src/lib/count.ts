// The character count shown in the Textarea. It follows the gateway rule (PRD, Pricing and
// billing rules; ARCHITECTURE decision log): Unicode scalar values after NFC normalisation and
// before text normalisation. Not UTF-16 units, not grapheme clusters. Whitespace, punctuation,
// matras and virama all count. The Rust counter lives in `yuyin-meter` (and `yuyin-count-wasm`
// once it is built); until the WASM build is wired in, this helper is the console's single
// implementation.

/** Returns the number of Unicode code points of `text` after NFC normalisation. */
export function countCodePoints(text: string): number {
  return Array.from(text.normalize("NFC")).length;
}
