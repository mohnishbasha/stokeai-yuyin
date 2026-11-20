// The single money formatter for the console (DESIGN 5.13). Amounts are integer micro-USD
// (one millionth of a dollar) and every step is integer arithmetic: no floating point on a
// money path (SOUL).

const MICRO_PER_USD = 1_000_000n;
const MICRO_PER_CENT = 10_000n;

export interface FormatOptions {
  /** Show all six decimals instead of truncating to whole cents. */
  readonly exact?: boolean;
}

function toBigInt(micro: number | bigint): bigint {
  if (typeof micro === "bigint") return micro;
  if (!Number.isSafeInteger(micro)) {
    throw new RangeError("Money must be a safe integer number of micro-USD");
  }
  return BigInt(micro);
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Formats integer micro-USD as US dollars, for example `$12.50`. Cents are truncated, not rounded. */
export function formatMicroUsd(micro: number | bigint, options: FormatOptions = {}): string {
  const value = toBigInt(micro);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const dollars = groupThousands((abs / MICRO_PER_USD).toString());
  const rest = abs % MICRO_PER_USD;
  const fraction =
    options.exact === true
      ? rest.toString().padStart(6, "0")
      : (rest / MICRO_PER_CENT).toString().padStart(2, "0");
  return `${negative ? "-" : ""}$${dollars}.${fraction}`;
}

const CHARS_PER_PRICE_UNIT = 1_000n;

/**
 * Estimated cost of `characters` at `perThousandMicroUsd`, rounded up to a whole micro-USD:
 * `ceil(chars * price_per_1k / 1000)` (PRD FR-018). The gateway count is what is billed.
 */
export function estimateCostMicroUsd(characters: number, perThousandMicroUsd: number): number {
  const product = BigInt(characters) * toBigInt(perThousandMicroUsd);
  return Number((product + CHARS_PER_PRICE_UNIT - 1n) / CHARS_PER_PRICE_UNIT);
}

/** Parses typed dollars ("25" or "25.50", at most two decimals) to micro-USD, or null. */
export function parseDollarsToMicro(text: string): number | null {
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(text.trim());
  if (match === null) return null;
  const cents = BigInt(((match[2] ?? "") + "00").slice(0, 2));
  return Number(BigInt(match[1] ?? "0") * MICRO_PER_USD + cents * MICRO_PER_CENT);
}

/** Whole percent (0 to 100) of `part` in `whole`, clamped. Integer arithmetic only. */
export function percentOf(part: number | bigint, whole: number | bigint): number {
  const p = toBigInt(part);
  const w = toBigInt(whole);
  if (w <= 0n || p <= 0n) return 0;
  if (p >= w) return 100;
  return Number((p * 100n) / w);
}
