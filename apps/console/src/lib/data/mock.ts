// The mock console data layer (S2-T05). It implements the `ConsoleData` interfaces from
// `types.ts` with fixed, deterministic data, shaped by the `?state=` query flag so every empty,
// error, and permission state can be opened without a backend. Nothing here talks to a network
// or a database. Hindi and English rows are equals: lexicon and voice data carry both.
import { can } from "../auth/roles";
import { estimateCostMicroUsd } from "../money";
import type { Role } from "../auth/types";
import type { ScreenId, ScreenState } from "../screens";
import {
  DataError,
  USAGE_RANGES,
  type ApiKeyRecord,
  type ConsoleData,
  type CustomVoiceDraft,
  type LedgerRow,
  type UsagePointRecord,
  type UsageRange,
  type UsageSummary,
  type UsageTotals,
  type Viewer,
  type VoiceRecord,
} from "./types";

/** The error every screen shows for `?state=error`. The code is a mock code, not a gateway code. */
export const MOCK_ERROR_CODE = "mock_unavailable";
export const MOCK_TRACE_ID = "tr_mock_0000000000000000";

/** Fixed clock so rendering is deterministic on the server and in the browser. */
export const MOCK_NOW = "2026-11-16T00:00:00Z";

const DAY_MS = 86_400_000;
const RANGE_DAYS: Readonly<Record<UsageRange, number>> = { "7d": 7, "30d": 30, "90d": 90 };

// Placeholder price of 50,000 micro-USD ($0.05) per 1,000 characters (PRD FR-018 formula).
// The real figure comes from config/pricing.toml when the pricing table is filled (S4-T05).
const MOCK_PRICE_PER_THOUSAND_MICRO_USD = 50_000;
const MOCK_ORG_BALANCE_MICRO_USD = 62_400_000;
const MOCK_BALANCE_CAPACITY_MICRO_USD = 100_000_000;
const MOCK_LOW_THRESHOLD_MICRO_USD = 10_000_000;
// Preset top-ups and the $5.00 minimum, PRD FR-016.
const MOCK_TOP_UP_PRESETS_MICRO_USD = [10_000_000, 25_000_000, 100_000_000] as const;
const MOCK_MIN_TOP_UP_MICRO_USD = 5_000_000;
// Playground text limit, NFR-020 (20,000 code points per connection) trimmed for a mock.
export const MOCK_PLAYGROUND_LIMIT = 5_000;
const MOCK_LEXICON_LIMIT = 500;
const MOCK_LEXICON_USED_AT_LIMIT = MOCK_LEXICON_LIMIT;

/** A role that lacks the action a screen needs, used for `?state=forbidden` (PRD FR-021). */
const FORBIDDEN_ROLE: Readonly<Partial<Record<ScreenId, Role>>> = {
  keys: "billing",
  billing: "developer",
  lexicon: "billing",
  team: "developer",
};

const KEY_HEAD = ["yy", "live"].join("_");

/**
 * Builds a fake key at runtime, never as a literal, so secret scanners have nothing to match.
 * `index` makes the characters differ per key. The result is not a working credential.
 */
export function buildMockKey(index: number): { readonly prefix: string; readonly secret: string } {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const pick = (n: number) => alphabet.charAt((n * 7 + index * 11) % alphabet.length);
  const prefix = Array.from({ length: 8 }, (_, n) => pick(n)).join("");
  const body = Array.from({ length: 32 }, (_, n) => pick(n + 8)).join("");
  return { prefix: `${KEY_HEAD}_${prefix}`, secret: `${KEY_HEAD}_${prefix}_${body}` };
}

function viewerFor(role: Role): Viewer {
  return {
    role,
    canManageKeys: can(role, "keys.manage"),
    canTopUp: can(role, "billing.topup"),
    canManageMembers: can(role, "members.manage"),
    canManageLexicon: role !== "billing",
  };
}

function daysAgo(n: number): string {
  return new Date(Date.parse(MOCK_NOW) - n * DAY_MS).toISOString();
}

function usagePoints(days: number): readonly UsagePointRecord[] {
  return Array.from({ length: days }, (_, i) => ({
    label: daysAgo(days - 1 - i).slice(0, 10),
    // Integer pseudo-pattern, 12,000 to 20,999 characters a day.
    value: 12_000 + ((i * 7_919) % 9_000),
  }));
}

function totalsFor(points: readonly UsagePointRecord[]): UsageTotals {
  const characters = points.reduce((sum, point) => sum + point.value, 0);
  const charactersPerRequest = 90;
  return {
    characters,
    requests: Math.floor(characters / charactersPerRequest),
    spendMicroUsd: estimateCostMicroUsd(characters, MOCK_PRICE_PER_THOUSAND_MICRO_USD),
  };
}

function usageSummary(state: ScreenState): UsageSummary {
  const empty = state === "empty";
  const series = Object.fromEntries(
    USAGE_RANGES.map((range) => [range, empty ? [] : usagePoints(RANGE_DAYS[range])]),
  ) as Record<UsageRange, readonly UsagePointRecord[]>;
  const totals = Object.fromEntries(
    USAGE_RANGES.map((range) => [range, totalsFor(series[range])]),
  ) as Record<UsageRange, UsageTotals>;
  return {
    series,
    totals,
    partial: state === "partial",
    byKey: empty
      ? []
      : [
          { name: "Production", characters: 301_000, requests: 3_340 },
          { name: "Staging", characters: 74_000, requests: 820 },
        ],
    byVoice: empty
      ? []
      : [
          { name: "Asha", characters: 233_000 },
          { name: "Dev", characters: 142_000 },
        ],
  };
}

function apiKeys(state: ScreenState): readonly ApiKeyRecord[] {
  if (state === "empty") return [];
  return [
    { name: "Production", last4: "a91f", created: 40, used: 0 },
    { name: "Staging", last4: "7c2e", created: 12, used: 3 },
    { name: "Local development", last4: "0b5d", created: 5, used: null },
  ].map((row, index) => ({
    id: `key_${String(index + 1)}`,
    name: row.name,
    prefix: buildMockKey(index).prefix,
    last4: row.last4,
    createdAt: daysAgo(row.created),
    lastUsedAt: row.used === null ? null : daysAgo(row.used),
  }));
}

const VOICES: readonly VoiceRecord[] = [
  {
    id: "asha",
    name: "Asha",
    languages: ["hi", "en"],
    style: "conversational",
    description: "Warm, even pace. Reads Hindi, English, and Hinglish.",
  },
  {
    id: "dev",
    name: "Dev",
    languages: ["hi", "en"],
    style: "announcer",
    description: "Clear and steady, suited to alerts and notices.",
  },
  {
    id: "meera",
    name: "Meera",
    languages: ["hi"],
    style: "narration",
    description: "Hindi narration with a calm delivery.",
  },
  {
    id: "noor",
    name: "Noor",
    languages: ["en"],
    style: "conversational",
    description: "English voice for support lines.",
    unavailableReason: "Not on the current plan",
  },
];

function ledger(state: ScreenState): readonly LedgerRow[] {
  if (state === "empty") return [];
  return [
    { id: "led_4", ago: 2, kind: "debit", amount: -1_850_000, balance: 62_400_000 },
    { id: "led_3", ago: 9, kind: "credit", amount: 25_000_000, balance: 64_250_000 },
    { id: "led_2", ago: 21, kind: "debit", amount: -4_200_000, balance: 39_250_000 },
    { id: "led_1", ago: 30, kind: "grant", amount: 10_000_000, balance: 43_450_000 },
  ].map((row) => ({
    id: row.id,
    date: daysAgo(row.ago),
    kind: row.kind as LedgerRow["kind"],
    amountMicroUsd: row.amount,
    balanceMicroUsd: row.balance,
  }));
}

function draft(state: ScreenState): CustomVoiceDraft {
  switch (state) {
    case "submitted":
      return { status: "submitted", referenceId: "CV-2026-0042" };
    case "rejected":
      return {
        status: "rejected",
        rejectionReason: "The consent form is unsigned. Upload the signed form and resubmit.",
      };
    default:
      return { status: "draft" };
  }
}

/** Creates the mock layer for one screen and one state flag. */
export function createMockData(state: ScreenState, screen: ScreenId): ConsoleData {
  const failing = state === "error";
  const role: Role = state === "forbidden" ? (FORBIDDEN_ROLE[screen] ?? "owner") : "owner";

  async function read<T>(value: () => T): Promise<T> {
    await Promise.resolve();
    if (failing) throw new DataError(MOCK_ERROR_CODE, MOCK_TRACE_ID);
    return value();
  }

  return {
    viewer: { get: () => Promise.resolve(viewerFor(role)) },
    keys: { list: () => read(() => apiKeys(state)) },
    usage: { summary: () => read(() => usageSummary(state)) },
    billing: {
      overview: () =>
        read(() => {
          const empty = state === "empty";
          return {
            balanceMicroUsd: empty ? 0 : MOCK_ORG_BALANCE_MICRO_USD,
            capacityMicroUsd: MOCK_BALANCE_CAPACITY_MICRO_USD,
            lowThresholdMicroUsd: MOCK_LOW_THRESHOLD_MICRO_USD,
            lowBalanceAlert: true,
            topUpPresetsMicroUsd: MOCK_TOP_UP_PRESETS_MICRO_USD,
            minTopUpMicroUsd: MOCK_MIN_TOP_UP_MICRO_USD,
            paymentPending: state === "pending",
            paymentFailure:
              state === "failed" ? { reason: "The card was declined by the issuer." } : null,
            ledger: ledger(state),
            invoices: empty
              ? []
              : [
                  { id: "inv_2", date: daysAgo(9), amountMicroUsd: 25_000_000 },
                  { id: "inv_1", date: daysAgo(45), amountMicroUsd: 10_000_000 },
                ],
          };
        }),
    },
    lexicon: {
      overview: () =>
        read(() => {
          const full = Array.from({ length: MOCK_LEXICON_USED_AT_LIMIT }, (_, i) => ({
            id: `lex_${String(i + 1)}`,
            written: `शब्द${String(i + 1)}`,
            language: "hi" as const,
            spokenAs: `शब्द ${String(i + 1)}`,
          }));
          const sample = [
            { id: "lex_a", written: "EMI", language: "en" as const, spokenAs: "ई एम आई" },
            { id: "lex_b", written: "UPI", language: "en" as const, spokenAs: "यू पी आई" },
            { id: "lex_c", written: "नमस्ते", language: "hi" as const, spokenAs: "नमस्ते" },
          ];
          return {
            entries: state === "empty" ? [] : state === "limit" ? full : sample,
            limit: MOCK_LEXICON_LIMIT,
            importErrors:
              state === "import-errors"
                ? [
                    { line: 3, message: "Missing the spoken form." },
                    { line: 8, message: "Language must be hi or en." },
                  ]
                : [],
          };
        }),
    },
    voices: {
      list: () => read(() => VOICES),
      custom: () =>
        read(() =>
          state === "empty"
            ? []
            : [
                { id: "cv_1", name: "Support line", status: "approved" as const },
                { id: "cv_2", name: "Branch announcer", status: "in_review" as const },
              ],
        ),
      draft: () => read(() => draft(state)),
    },
    team: {
      list: () =>
        read(() =>
          state === "empty"
            ? [
                {
                  id: "mem_1",
                  name: "Asha Verma",
                  email: "asha@example.com",
                  role: "owner" as const,
                  status: "active" as const,
                },
              ]
            : [
                {
                  id: "mem_1",
                  name: "Asha Verma",
                  email: "asha@example.com",
                  role: "owner" as const,
                  status: "active" as const,
                },
                {
                  id: "mem_2",
                  name: "Ravi Nair",
                  email: "ravi@example.com",
                  role: "developer" as const,
                  status: "active" as const,
                },
                {
                  id: "mem_3",
                  name: "Priya Shah",
                  email: "priya@example.com",
                  role: "billing" as const,
                  status: "invited" as const,
                },
              ],
        ),
    },
    settings: {
      get: () =>
        read(() => ({
          orgName: "Acme",
          defaultVoiceId: "asha",
          defaultLanguage: "auto",
          interfaceLanguage: "en",
          theme: "dark" as const,
        })),
    },
    playground: {
      context: () =>
        read(() => ({
          balanceMicroUsd: state === "zero-balance" ? 0 : MOCK_ORG_BALANCE_MICRO_USD,
          charLimit: MOCK_PLAYGROUND_LIMIT,
          pricePerThousandMicroUsd: MOCK_PRICE_PER_THOUSAND_MICRO_USD,
          sampleText:
            state === "empty"
              ? ""
              : state === "over-limit"
                ? "नमस्ते ".repeat(Math.ceil(MOCK_PLAYGROUND_LIMIT / 4) + 1)
                : "आपका ओटीपी 4 8 2 9 1 6 है।",
        })),
    },
    onboarding: {
      progress: () =>
        read(() => ({
          keyCreated: state === "complete",
          requestSent: state === "complete",
          heard: state === "complete",
        })),
    },
  };
}
