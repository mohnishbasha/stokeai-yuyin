// CN-27 (unit half) unit support for e2e_render_devanagarifixture_conjunctsmatras_matchessnapshot:
// the fixture holds 50 distinct Devanagari strings and covers the shaping cases the snapshot
// is meant to catch: conjuncts (virama joins), every matra, nukta, chandrabindu and visarga.
import { describe, expect, it } from "vitest";
import { DEVANAGARI_FIXTURE } from "../../src/lib/devanagari-fixture";

const FIXTURE_SIZE = 50;
const VIRAMA = "्";
const NUKTA = "़";
const CHANDRABINDU = "ँ";
const ANUSVARA = "ं";
const VISARGA = "ः";
// Dependent vowel signs (matras) that the fixture must show at least once each.
const MATRAS = ["ा", "ि", "ी", "ु", "ू", "ृ", "ॄ", "ॅ", "ॆ", "े", "ै", "ॉ", "ॊ", "ो", "ौ"];

const all = DEVANAGARI_FIXTURE.join("");

describe("devanagari fixture", () => {
  it("has exactly 50 distinct, non-empty strings", () => {
    expect(DEVANAGARI_FIXTURE).toHaveLength(FIXTURE_SIZE);
    expect(new Set(DEVANAGARI_FIXTURE).size).toBe(FIXTURE_SIZE);
    for (const s of DEVANAGARI_FIXTURE) expect(s.trim().length).toBeGreaterThan(0);
  });

  it("is Devanagari text with punctuation, hyphens and spaces only", () => {
    for (const s of DEVANAGARI_FIXTURE) {
      expect(s).toMatch(/^[\p{Script=Devanagari}\s,.?!।-]+$/u);
      expect(s.normalize("NFC")).toBe(s);
    }
  });

  it("carries a conjunct in every string", () => {
    for (const s of DEVANAGARI_FIXTURE) {
      expect(s, s).toMatch(/\p{Script=Devanagari}्\p{Script=Devanagari}/u);
    }
  });

  it("covers every matra, nukta, chandrabindu, anusvara, visarga and virama", () => {
    for (const mark of [...MATRAS, NUKTA, CHANDRABINDU, ANUSVARA, VISARGA, VIRAMA]) {
      expect(all.includes(mark), `U+${String(mark.codePointAt(0))}`).toBe(true);
    }
  });

  it("includes stacked conjuncts of three consonants", () => {
    expect(all).toMatch(/\p{Script=Devanagari}्\p{Script=Devanagari}्\p{Script=Devanagari}/u);
  });
});
