// Self-hosted fonts (DESIGN 3.1). WOFF2 files are committed under src/fonts with their OFL
// text and are bundled at build time by next/font/local; nothing loads from a font CDN.
// Latin comes first in the stack (tokens.css) so Devanagari glyphs fall through per glyph.
import localFont from "next/font/local";

export const plexSans = localFont({
  src: [
    { path: "../fonts/ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-sans",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const plexDevanagari = localFont({
  src: [
    {
      path: "../fonts/ibm-plex-sans-devanagari-devanagari-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/ibm-plex-sans-devanagari-devanagari-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/ibm-plex-sans-devanagari-devanagari-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-plex-devanagari",
  display: "swap",
  preload: false,
  fallback: ["Noto Sans Devanagari", "sans-serif"],
});

export const plexMono = localFont({
  src: [{ path: "../fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" }],
  variable: "--font-plex-mono",
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "monospace"],
});

export const fontVariables = [plexSans, plexDevanagari, plexMono]
  .map((font) => font.variable)
  .join(" ");
