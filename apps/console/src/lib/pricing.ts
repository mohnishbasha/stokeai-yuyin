// Reads config/pricing.toml for the Pricing page (FR-023, DESIGN M2). The file is read when
// the page is rendered, which for a static route is build time; no price is typed anywhere
// else. A missing or empty file is "not published"; a malformed one throws so a build fails.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseToml, type TomlTable } from "./toml";

export interface Pricing {
  /** Characters that one rate applies to, for example 1,000. */
  readonly unitCharacters: number;
  readonly minTopUpMicroUsd: number;
  /** Micro-USD per `unitCharacters`, keyed by audio format. */
  readonly rates: Readonly<Record<string, number>>;
  readonly launchGrant: { readonly characters: number; readonly verifiedSignups: number };
}

/** The config directory: `YUYIN_CONFIG_DIR`, else `config/` at the repository root. */
export function configDir(): string {
  return process.env["YUYIN_CONFIG_DIR"] ?? join(process.cwd(), "..", "..", "config");
}

function count(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`pricing.toml: ${name} must be a non-negative integer`);
  }
  return value;
}

function table(value: unknown, name: string): TomlTable {
  if (typeof value !== "object" || value === null) {
    throw new TypeError(`pricing.toml: [${name}] is missing`);
  }
  return value as TomlTable;
}

export function loadPricing(file: string = join(configDir(), "pricing.toml")): Pricing | undefined {
  if (!existsSync(/* turbopackIgnore: true */ file)) return undefined;
  const parsed = parseToml(readFileSync(/* turbopackIgnore: true */ file, "utf8"));
  if (Object.keys(parsed).length === 0) return undefined;
  const rates = table(parsed["rate_micro_usd"], "rate_micro_usd");
  const grant = table(parsed["launch_grant"], "launch_grant");
  return {
    unitCharacters: count(parsed["unit_characters"], "unit_characters"),
    minTopUpMicroUsd: count(parsed["min_topup_micro_usd"], "min_topup_micro_usd"),
    rates: Object.fromEntries(
      Object.entries(rates).map(([format, rate]) => [
        format,
        count(rate, `rate_micro_usd.${format}`),
      ]),
    ),
    launchGrant: {
      characters: count(grant["characters"], "launch_grant.characters"),
      verifiedSignups: count(grant["verified_signups"], "launch_grant.verified_signups"),
    },
  };
}
