// The console screen registry (DESIGN 6.2, S2-T05). One entry per screen: its route, its
// navigation label, and the states a reviewer can open with the `?state=` query flag. Tests,
// the navigation, and the dashboard overview all read this list, so a screen that is missing
// here is missing everywhere.
import type { MessageKey } from "./messages";

export const SCREEN_STATES = [
  "default",
  "loading",
  "empty",
  "error",
  "forbidden",
  "partial",
  "pending",
  "failed",
  "limit",
  "import-errors",
  "sample-error",
  "zero-balance",
  "over-limit",
  "complete",
  "submitted",
  "rejected",
] as const;
export type ScreenState = (typeof SCREEN_STATES)[number];

export function isScreenState(value: unknown): value is ScreenState {
  return typeof value === "string" && (SCREEN_STATES as readonly string[]).includes(value);
}

export const SCREEN_IDS = [
  "onboarding",
  "playground",
  "keys",
  "usage",
  "billing",
  "lexicon",
  "voices",
  "voice-request",
  "team",
  "settings",
] as const;
export type ScreenId = (typeof SCREEN_IDS)[number];

export interface ScreenDef {
  readonly id: ScreenId;
  /** The DESIGN 6.2 wireframe id, for traceability. */
  readonly wireframe: string;
  readonly href: string;
  readonly titleKey: MessageKey;
  /** The heading of the EmptyState this screen shows for `?state=empty`, when it has one. */
  readonly emptyTitleKey?: MessageKey;
  /** Every state the screen renders. `default` and `error` are always present. */
  readonly states: readonly ScreenState[];
}

// The console lives under /dashboard so the proxy gate (src/proxy.ts matcher) covers it.
export const CONSOLE_HOME_HREF = "/dashboard";

export const CONSOLE_SCREENS: readonly ScreenDef[] = [
  {
    id: "onboarding",
    wireframe: "C1",
    href: "/dashboard/onboarding",
    titleKey: "screen.onboarding.title",
    states: ["default", "error", "complete"],
  },
  {
    id: "playground",
    wireframe: "C2",
    href: "/dashboard/playground",
    titleKey: "screen.playground.title",
    states: ["default", "empty", "over-limit", "zero-balance", "error"],
  },
  {
    id: "keys",
    wireframe: "C3",
    href: "/dashboard/keys",
    titleKey: "screen.keys.title",
    emptyTitleKey: "screen.keys.empty.title",
    states: ["default", "loading", "empty", "forbidden", "error"],
  },
  {
    id: "usage",
    wireframe: "C4",
    href: "/dashboard/usage",
    titleKey: "screen.usage.title",
    emptyTitleKey: "screen.usage.empty.title",
    states: ["default", "loading", "empty", "partial", "error"],
  },
  {
    id: "billing",
    wireframe: "C5",
    href: "/dashboard/billing",
    titleKey: "screen.billing.title",
    emptyTitleKey: "screen.billing.ledgerEmpty.title",
    states: ["default", "loading", "empty", "pending", "failed", "forbidden", "error"],
  },
  {
    id: "lexicon",
    wireframe: "C6",
    href: "/dashboard/lexicon",
    titleKey: "screen.lexicon.title",
    emptyTitleKey: "screen.lexicon.empty.title",
    states: ["default", "loading", "empty", "import-errors", "limit", "forbidden", "error"],
  },
  {
    id: "voices",
    wireframe: "C7",
    href: "/dashboard/voices",
    titleKey: "screen.voices.title",
    emptyTitleKey: "screen.voices.empty.title",
    states: ["default", "loading", "empty", "sample-error", "error"],
  },
  {
    id: "voice-request",
    wireframe: "C8",
    href: "/dashboard/voices/request",
    titleKey: "screen.voiceRequest.title",
    states: ["default", "submitted", "rejected", "error"],
  },
  {
    id: "team",
    wireframe: "C9",
    href: "/dashboard/team",
    titleKey: "screen.team.title",
    emptyTitleKey: "screen.team.empty.title",
    states: ["default", "loading", "empty", "forbidden", "error"],
  },
  {
    id: "settings",
    wireframe: "C10",
    href: "/dashboard/settings",
    titleKey: "screen.settings.title",
    states: ["default", "loading", "error"],
  },
];

export interface ConsoleNavItem {
  readonly href: string;
  readonly labelKey: MessageKey;
}

/** The console navigation: the home overview, then every screen in wireframe order. */
export const CONSOLE_NAV_ITEMS: readonly ConsoleNavItem[] = [
  { href: CONSOLE_HOME_HREF, labelKey: "screen.home.title" },
  ...CONSOLE_SCREENS.map((def) => ({ href: def.href, labelKey: def.titleKey })),
];

export function screenById(id: ScreenId): ScreenDef {
  const found = CONSOLE_SCREENS.find((screen) => screen.id === id);
  if (found === undefined) throw new Error(`Unknown console screen: ${id}`);
  return found;
}

/** The `state` query flag, or `default` when it is missing or not valid for the screen. */
export function parseScreenState(
  raw: string | readonly string[] | undefined,
  id: ScreenId,
): ScreenState {
  const value = typeof raw === "string" ? raw : raw?.[0];
  if (!isScreenState(value)) return "default";
  return screenById(id).states.includes(value) ? value : "default";
}
