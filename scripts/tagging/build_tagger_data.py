#!/usr/bin/env python3
"""Regenerates the S1-T02 tagger data files deterministically.

Outputs (all under crates/yuyin-text/data/):
  roman_hindi_lexicon.tsv  romanised Hindi word forms (roman, devanagari)
  english_lexicon.txt      English word forms
  tagger_ngram.tsv         character trigram log-likelihood ratios (Hindi vs English)

Inputs:
  * Aksharantar (AI4Bharat), Hindi split, rows with source "AK-Freq" only. Those rows are
    manually collected, released under CC BY 4.0. Rows from every other source (Dakshina is CC
    BY-SA, others are mixed) are ignored on purpose. Downloaded from a pinned commit and checked
    against SHA-256 below.
  * scripts/tagging/hindi_seed.txt and english_seed.txt: first-party word lists.
  * A first-party deterministic Devanagari to Roman transliterator (this file) that adds
    spelling variants of the Aksharantar words.

Usage:
  python3 scripts/tagging/build_tagger_data.py [--cache DIR]

No third-party Python packages are needed. The network is used only to fetch hin.zip into the
cache directory when it is not there already. Output is byte-identical on every run.
"""
import argparse
import collections
import hashlib
import io
import json
import math
import os
import re
import sys
import urllib.request
import zipfile

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(REPO, "crates", "yuyin-text", "data")
SEED_DIR = os.path.dirname(os.path.abspath(__file__))

AKSHARANTAR_COMMIT = "e418c1fc928d9f5393af33268472cf20c1891be8"
AKSHARANTAR_URL = (
    "https://huggingface.co/datasets/ai4bharat/Aksharantar/resolve/%s/hin.zip" % AKSHARANTAR_COMMIT
)
HIN_ZIP_SHA256 = "208c2d1b128234e6dc777b750779b4f5e6214ab43244039349b530bf9868bdaf"
SPLITS = ("hin_train.json", "hin_valid.json", "hin_test.json")

MIN_NGRAM_COUNT = 4
NGRAM_SCALE = 100  # stored as integer hundredths of a nat

CONS = {
    "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "n",
    "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "n",
    "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
    "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
    "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
    "य": "y", "र": "r", "ल": "l", "व": "v", "श": "sh",
    "ष": "sh", "स": "s", "ह": "h",
}
NUKTA = {"ज": "z", "फ": "f", "ड": "r", "ढ": "rh", "क": "q", "ख": "kh", "ग": "g"}
MATRA = {
    "ा": "aa", "ि": "i", "ी": "ii", "ु": "u", "ू": "uu", "ृ": "ri", "े": "e", "ै": "ai",
    "ो": "o", "ौ": "au", "ॉ": "o", "ॅ": "e", "ॆ": "e", "ॊ": "o",
}
INDEP = {
    "अ": "a", "आ": "aa", "इ": "i", "ई": "ii", "उ": "u", "ऊ": "uu", "ऋ": "ri", "ए": "e",
    "ऐ": "ai", "ओ": "o", "औ": "au", "ऑ": "o", "ऍ": "e", "ऎ": "e", "ऒ": "o",
}
VIRAMA, NUKTA_C, ANUSVARA, CHANDRABINDU, VISARGA = "्", "़", "ं", "ँ", "ः"
LABIAL = ("p", "b", "m")

SCHEMES = (
    {"aa": "a", "ii": "i", "uu": "u", "w": False, "m": False},
    {"aa": "aa", "ii": "ee", "uu": "oo", "w": False, "m": False},
    {"aa": "a", "ii": "ee", "uu": "oo", "w": True, "m": True},
)


def parse_syllables(word):
    """Devanagari word to a list of [consonant, vowel, schwa, nasal]. None on unknown chars."""
    word = word.replace("क़", "क़").replace("ज़", "ज़").replace("फ़", "फ़")
    word = word.replace("ड़", "ड़").replace("ढ़", "ढ़")
    units = []
    i = 0
    n = len(word)
    while i < n:
        c = word[i]
        if c in CONS:
            cons = CONS[c]
            i += 1
            if i < n and word[i] == NUKTA_C:
                cons = NUKTA.get(c, cons)
                i += 1
            if i < n and word[i] == VIRAMA:
                units.append([cons, "", False, ""])
                i += 1
            elif i < n and word[i] in MATRA:
                units.append([cons, MATRA[word[i]], False, ""])
                i += 1
            else:
                units.append([cons, "a", True, ""])
        elif c in INDEP:
            units.append(["", INDEP[c], False, ""])
            i += 1
        elif c in (ANUSVARA, CHANDRABINDU):
            if not units:
                return None
            units[-1][3] = "n"
            i += 1
        elif c == VISARGA:
            if not units:
                return None
            units[-1][3] = "h"
            i += 1
        elif c in (NUKTA_C, "‌", "‍"):
            i += 1
        else:
            return None
    return units or None


def romanise(word, scheme):
    units = parse_syllables(word)
    if units is None:
        return None
    # Schwa deletion: word-final, and medial in a V C(schwa) C V pattern.
    voiced = [bool(u[1]) for u in units]
    last = len(units) - 1
    for i, u in enumerate(units):
        if not u[2]:
            continue
        if i == last:
            u[1] = ""
            voiced[i] = False
        elif i > 0 and voiced[i - 1] and units[i + 1][0] and units[i + 1][1] and not u[3]:
            u[1] = ""
            voiced[i] = False
    out = []
    for idx, (cons, vow, _, nas) in enumerate(units):
        if cons == "v" and scheme["w"]:
            cons = "w"
        v = vow
        if v == "aa" and idx == 0 and not cons:
            pass  # word-initial aa stays aa in every scheme ("aap", "aaj")
        elif v in ("aa", "ii", "uu"):
            v = scheme[v]
        piece = cons + v
        if nas == "n":
            nxt = units[idx + 1][0] if idx < last else ""
            piece += "m" if scheme["m"] and nxt in LABIAL else "n"
        elif nas == "h":
            piece += "h"
        out.append(piece)
    text = "".join(out).replace("kssh", "ksh").replace("jny", "gy")
    return text


def variants(word):
    seen = []
    for sc in SCHEMES:
        r = romanise(word, sc)
        if r and re.fullmatch(r"[a-z]+", r) and r not in seen:
            seen.append(r)
    return seen


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def fetch_aksharantar(cache):
    os.makedirs(cache, exist_ok=True)
    path = os.path.join(cache, "aksharantar-hin-%s.zip" % AKSHARANTAR_COMMIT[:8])
    if not os.path.exists(path):
        print("downloading", AKSHARANTAR_URL, file=sys.stderr)
        urllib.request.urlretrieve(AKSHARANTAR_URL, path)
    digest = sha256(path)
    if digest != HIN_ZIP_SHA256:
        sys.exit("hin.zip SHA-256 mismatch: got %s" % digest)
    rows = []
    with zipfile.ZipFile(path) as z:
        names = {os.path.basename(n): n for n in z.namelist()}
        for split in SPLITS:
            with z.open(names[split]) as f:
                for line in io.TextIOWrapper(f, encoding="utf-8"):
                    d = json.loads(line)
                    if d.get("source") == "AK-Freq":
                        rows.append((d["native word"], d["english word"].strip().lower()))
    return rows


def read_words(path):
    words = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            if line.startswith("#"):
                continue
            words.extend(line.split())
    return words


def english_forms(seed):
    forms = set(w for w in seed if re.fullmatch(r"[a-z]+", w))
    for w in list(forms):
        if len(w) < 4:
            continue
        stem = w[:-1] if w.endswith("e") else w
        forms.update([w + "s", stem + "ed" if w.endswith("e") else w + "ed", stem + "ing", w + "ly", w + "er"])
    return sorted(forms)


def trigrams(word):
    p = "^" + word + "$"
    return [p[i : i + 3] for i in range(len(p) - 2)]


def build_ngram(hindi, english):
    ch, ce = collections.Counter(), collections.Counter()
    for w in hindi:
        ch.update(trigrams(w))
    for w in english:
        ce.update(trigrams(w))
    keys = sorted(k for k in set(ch) | set(ce) if ch[k] + ce[k] >= MIN_NGRAM_COUNT)
    vocab = len(set(ch) | set(ce))
    th, te = sum(ch.values()), sum(ce.values())
    rows = []
    for k in keys:
        ph = (ch[k] + 0.5) / (th + 0.5 * vocab)
        pe = (ce[k] + 0.5) / (te + 0.5 * vocab)
        v = round(math.log(ph / pe) * NGRAM_SCALE)
        if v != 0:
            rows.append((k, v))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=os.path.join(REPO, "target", "tagger-data-cache"))
    args = ap.parse_args()

    ak = fetch_aksharantar(args.cache)
    english = english_forms(read_words(os.path.join(SEED_DIR, "english_seed.txt")))
    english_set = set(english)
    hindi_seed = read_words(os.path.join(SEED_DIR, "hindi_seed.txt"))

    hindi_seed_set = set(hindi_seed)
    lex = {}  # roman -> devanagari
    # An English word wins over a crowd-sourced Devanagari loanword romanisation ("phone",
    # "number"). Words in the first-party Hindi seed ("to", "me", "is") stay in both lexicons
    # and the tagger resolves them from context.
    for native, roman in sorted(ak):
        if re.fullmatch(r"[a-z]{2,}", roman) and (roman not in english_set or roman in hindi_seed_set):
            lex.setdefault(roman, native)
    for native in sorted({n for n, _ in ak}):
        for v in variants(native):
            if len(v) >= 3 and v not in english_set:
                lex.setdefault(v, native)
    for w in hindi_seed:
        if re.fullmatch(r"[a-z]{2,}", w):
            lex.setdefault(w, "-")

    with open(os.path.join(DATA, "roman_hindi_lexicon.tsv"), "w", encoding="utf-8", newline="\n") as f:
        f.write("roman\tdevanagari\n")
        f.write("# Romanised Hindi word forms for the Yuyin tagger. Generated by scripts/tagging/build_tagger_data.py.\n")
        f.write("# Do not edit by hand. Sources and licences: docs/licences/roman-hindi-lexicon.md\n")
        for roman in sorted(lex):
            f.write("%s\t%s\n" % (roman, lex[roman]))

    with open(os.path.join(DATA, "english_lexicon.txt"), "w", encoding="utf-8", newline="\n") as f:
        f.write("word\n")
        f.write("# First-party English word forms for the Yuyin tagger. Generated by scripts/tagging/build_tagger_data.py.\n")
        for w in english:
            f.write(w + "\n")

    hindi_train = sorted(lex)
    rows = build_ngram(hindi_train, english)
    with open(os.path.join(DATA, "tagger_ngram.tsv"), "w", encoding="utf-8", newline="\n") as f:
        f.write("ngram\tllr\n")
        f.write("# Character trigram log-likelihood ratios in hundredths of a nat: positive means Hindi, negative English.\n")
        f.write("# Trained on roman_hindi_lexicon.tsv and english_lexicon.txt by scripts/tagging/build_tagger_data.py.\n")
        for k, v in rows:
            f.write("%s\t%d\n" % (k, v))
    print("lexicon forms:", len(lex), "english forms:", len(english), "ngrams:", len(rows), file=sys.stderr)


if __name__ == "__main__":
    main()
