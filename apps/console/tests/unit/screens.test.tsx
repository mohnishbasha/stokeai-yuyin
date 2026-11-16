// @vitest-environment jsdom
// CN-54 e2e_console_screens_all_reachable
// CN-55 e2e_console_screens_emptystateflag_renders
// CN-56 e2e_console_screens_errorstateflag_renders
// Playwright arrives with S2-T09. Until then these run as route and render tests: each console
// page module is called the way Next calls it (with a `searchParams` promise) and the returned
// tree is rendered. S2-T09 adds the browser versions of the same three scenarios.
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsoleNav } from "../../src/components/ConsoleNav";
import { ToastProvider } from "../../src/components/ui/Toast";
import { t, tf } from "../../src/lib/messages";
import { MOCK_ERROR_CODE, MOCK_TRACE_ID } from "../../src/lib/data/mock";
import {
  CONSOLE_HOME_HREF,
  CONSOLE_NAV_ITEMS,
  CONSOLE_SCREENS,
  parseScreenState,
  type ScreenDef,
  type ScreenState,
} from "../../src/lib/screens";

if (typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard/keys" }));

type PageModule = {
  default: (props: {
    searchParams: Promise<Record<string, string | undefined>>;
  }) => Promise<ReactElement> | ReactElement;
};

// Parentheses are glob syntax, so the route group is matched by `*` and filtered by name.
const ALL_PAGES = import.meta.glob<PageModule>("../../src/app/*/dashboard/**/page.tsx");
const PAGES = Object.fromEntries(
  Object.entries(ALL_PAGES).filter(([key]) => key.includes("/(console)/")),
);

function pageKey(href: string): string {
  const rest = href === CONSOLE_HOME_HREF ? "" : href.slice(CONSOLE_HOME_HREF.length);
  return `../../src/app/(console)/dashboard${rest}/page.tsx`;
}

async function renderRoute(href: string, state?: ScreenState) {
  const loader = PAGES[pageKey(href)];
  if (loader === undefined) throw new Error(`No page for ${href}`);
  const page = await loader();
  const tree = await page.default({
    searchParams: Promise.resolve(state === undefined ? {} : { state }),
  });
  return render(<ToastProvider>{tree}</ToastProvider>);
}

afterEach(cleanup);

describe("screen registry", () => {
  it("test_screens_registry_hastenscreensforc1toc10", () => {
    expect(CONSOLE_SCREENS.map((s) => s.wireframe)).toEqual(
      Array.from({ length: 10 }, (_, i) => `C${String(i + 1)}`),
    );
  });

  it("test_screens_parsestate_unknownflagfallsbacktodefault", () => {
    expect(parseScreenState(undefined, "keys")).toBe("default");
    expect(parseScreenState("nonsense", "keys")).toBe("default");
    expect(parseScreenState("empty", "keys")).toBe("empty");
    expect(parseScreenState(["error", "empty"], "keys")).toBe("error");
    // A real state that this screen does not have is treated as default.
    expect(parseScreenState("limit", "keys")).toBe("default");
  });
});

describe("e2e_console_screens_all_reachable", () => {
  it.each(CONSOLE_SCREENS.map((s) => [s.id, s] as const))(
    "test_screens_%s_hasaroutethatrendersitstitle",
    async (_id, def: ScreenDef) => {
      await renderRoute(def.href);
      expect(screen.getByRole("heading", { level: 1, name: t(def.titleKey) })).toBeTruthy();
    },
  );

  it("test_screens_home_overviewlinkstoeveryscreen", async () => {
    await renderRoute(CONSOLE_HOME_HREF);
    const main = screen.getByRole("main");
    for (const def of CONSOLE_SCREENS) {
      const link = within(main).getByRole("link", { name: t(def.titleKey) });
      expect(link.getAttribute("href")).toBe(def.href);
    }
  });

  it("test_screens_nav_linkstoeveryscreenandmarkscurrent", () => {
    render(<ConsoleNav />);
    const nav = screen.getByRole("navigation", { name: t("nav.console") });
    for (const item of CONSOLE_NAV_ITEMS) {
      const link = within(nav).getByRole("link", { name: t(item.labelKey) });
      expect(link.getAttribute("href")).toBe(item.href);
    }
    const current = within(nav).getByRole("link", { name: t("screen.keys.title") });
    expect(current.getAttribute("aria-current")).toBe("page");
  });

  it("test_screens_everyroutefile_isregistered", () => {
    const registered = new Set(
      [CONSOLE_HOME_HREF, ...CONSOLE_SCREENS.map((s) => s.href)].map(pageKey),
    );
    expect(new Set(Object.keys(PAGES))).toEqual(registered);
  });
});

describe("e2e_console_screens_emptystateflag_renders", () => {
  const withEmpty = CONSOLE_SCREENS.filter((s) => s.emptyTitleKey !== undefined);

  it.each(withEmpty.map((s) => [s.id, s] as const))(
    "test_screens_%s_emptyflag_showsemptystate",
    async (_id, def: ScreenDef) => {
      await renderRoute(def.href, "empty");
      const key = def.emptyTitleKey;
      if (key === undefined) throw new Error("unreachable");
      expect(screen.getByRole("heading", { level: 2, name: t(key) })).toBeTruthy();
    },
  );

  it("test_screens_playground_emptyflag_disablesplaywithreason", async () => {
    await renderRoute("/dashboard/playground", "empty");
    const play = screen.getByRole("button", { name: t("screen.playground.play") });
    expect(play.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getAllByText(t("screen.playground.emptyReason")).length).toBeGreaterThan(0);
  });

  it.each(
    CONSOLE_SCREENS.filter((s) => s.states.includes("loading")).map((s) => [s.id, s] as const),
  )("test_screens_%s_loadingflag_showsbusyplaceholder", async (_id, def: ScreenDef) => {
    const { container } = await renderRoute(def.href, "loading");
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });
});

describe("e2e_console_screens_errorstateflag_renders", () => {
  it.each(CONSOLE_SCREENS.map((s) => [s.id, s] as const))(
    "test_screens_%s_errorflag_showscodeandtraceid",
    async (_id, def: ScreenDef) => {
      await renderRoute(def.href, "error");
      expect(screen.getByRole("heading", { level: 1, name: t(def.titleKey) })).toBeTruthy();
      expect(screen.getByText(MOCK_ERROR_CODE)).toBeTruthy();
      expect(screen.getByText(MOCK_TRACE_ID)).toBeTruthy();
    },
  );

  it("test_screens_errorflag_offersretrywherethescreenreloads", async () => {
    await renderRoute("/dashboard/keys", "error");
    expect(screen.getByRole("button", { name: t("error.retry") })).toBeTruthy();
  });
});

describe("state flags per screen", () => {
  it("test_screens_keys_forbiddenflag_disablescreatewithreason", async () => {
    await renderRoute("/dashboard/keys", "forbidden");
    const create = screen.getByRole("button", { name: t("screen.keys.create") });
    expect(create.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getAllByText(t("screen.keys.forbidden")).length).toBeGreaterThan(0);
  });

  it("test_screens_keys_default_showsprefixandlast4only", async () => {
    await renderRoute("/dashboard/keys");
    expect(screen.getByText("Production")).toBeTruthy();
    const row = screen.getByText("Production").closest("tr") as HTMLElement;
    expect(row.textContent).toMatch(/yy_live_[a-z0-9]{8}\.\.\.a91f/);
  });

  it("test_screens_keys_create_revealsthekeyonceandthendropsit", async () => {
    await renderRoute("/dashboard/keys");
    fireEvent.click(screen.getByRole("button", { name: t("screen.keys.create") }));
    fireEvent.change(screen.getByLabelText(t("screen.keys.nameLabel")), {
      target: { value: "Batch jobs" },
    });
    fireEvent.click(screen.getByRole("button", { name: t("screen.keys.createSubmit") }));
    const secret = await screen
      .findByLabelText(t("key.label"), { selector: "section" })
      .then((section) => section.textContent);
    expect(secret).toMatch(/yy_live_[a-z0-9]{8}_[a-z0-9]{32}/);
    fireEvent.click(screen.getByLabelText(t("key.stored")));
    fireEvent.click(screen.getByRole("button", { name: t("key.done") }));
    expect(document.body.textContent).not.toMatch(/yy_live_[a-z0-9]{8}_[a-z0-9]{32}/);
    expect(screen.getByText("Batch jobs")).toBeTruthy();
  });

  it("test_screens_keys_revoke_asksforconfirmationnamingthekey", async () => {
    await renderRoute("/dashboard/keys");
    fireEvent.click(screen.getAllByRole("button", { name: /Revoke/ })[0] as HTMLElement);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("dialog").textContent).toContain("a91f");
  });

  it("test_screens_usage_partialflag_showsbannerandtotals", async () => {
    await renderRoute("/dashboard/usage", "partial");
    expect(screen.getByText(t("screen.usage.partial"))).toBeTruthy();
    expect(screen.getByRole("heading", { name: t("screen.usage.byKey") })).toBeTruthy();
  });

  it("test_screens_usage_rangeswitch_changesthetotals", async () => {
    await renderRoute("/dashboard/usage");
    const before = screen.getByTestId("usage-total-characters").textContent;
    fireEvent.click(screen.getByRole("tab", { name: "7d" }));
    expect(screen.getByTestId("usage-total-characters").textContent).not.toBe(before);
  });

  it("test_screens_billing_default_formatsmoneyfromintegermicrousd", async () => {
    await renderRoute("/dashboard/billing");
    expect(screen.getAllByText("$62.40").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: t("screen.billing.pay") })).toBeTruthy();
  });

  it("test_screens_billing_pendingflag_showspendingbadge", async () => {
    await renderRoute("/dashboard/billing", "pending");
    expect(screen.getByText(t("screen.billing.pending"))).toBeTruthy();
  });

  it("test_screens_billing_failedflag_showserrorstatewithreason", async () => {
    await renderRoute("/dashboard/billing", "failed");
    expect(screen.getByText(t("screen.billing.failed.title"))).toBeTruthy();
    expect(screen.getByText(/declined/)).toBeTruthy();
  });

  it("test_screens_billing_forbiddenflag_isreadonly", async () => {
    await renderRoute("/dashboard/billing", "forbidden");
    expect(
      screen.getByRole("button", { name: t("screen.billing.pay") }).getAttribute("aria-disabled"),
    ).toBe("true");
    expect(screen.getAllByText(t("screen.billing.forbidden")).length).toBeGreaterThan(0);
  });

  it("test_screens_billing_customamountbelowminimum_showserror", async () => {
    await renderRoute("/dashboard/billing");
    fireEvent.click(screen.getByLabelText(t("screen.billing.other")));
    fireEvent.change(screen.getByLabelText(t("screen.billing.otherAmount")), {
      target: { value: "2" },
    });
    expect(screen.getByText(tf("screen.billing.minError", { min: "$5.00" }))).toBeTruthy();
  });

  it("test_screens_lexicon_default_rendersdevanagarirows", async () => {
    await renderRoute("/dashboard/lexicon");
    expect(screen.getByText("ई एम आई")).toBeTruthy();
  });

  it("test_screens_lexicon_limitflag_disablesaddwithreason", async () => {
    await renderRoute("/dashboard/lexicon", "limit");
    expect(
      screen.getByRole("button", { name: t("screen.lexicon.add") }).getAttribute("aria-disabled"),
    ).toBe("true");
    expect(screen.getAllByText(t("screen.lexicon.limitReached")).length).toBeGreaterThan(0);
  });

  it("test_screens_lexicon_importerrorsflag_listsbylinenumber", async () => {
    await renderRoute("/dashboard/lexicon", "import-errors");
    expect(screen.getByText(/Line 3/)).toBeTruthy();
    expect(screen.getByText(/Line 8/)).toBeTruthy();
  });

  it("test_screens_voices_sampleerrorflag_showsinlineretry", async () => {
    await renderRoute("/dashboard/voices", "sample-error");
    expect(screen.getByText(t("voice.sampleError"))).toBeTruthy();
    expect(screen.getByRole("button", { name: t("common.retry") })).toBeTruthy();
  });

  it("test_screens_voicerequest_submitflag_showsreferenceid", async () => {
    await renderRoute("/dashboard/voices/request", "submitted");
    expect(screen.getByText(/CV-2026-0042/)).toBeTruthy();
  });

  it("test_screens_voicerequest_rejectedflag_showsreasonandresubmit", async () => {
    await renderRoute("/dashboard/voices/request", "rejected");
    expect(screen.getByText(/consent form is unsigned/)).toBeTruthy();
    expect(screen.getByRole("button", { name: t("screen.voiceRequest.resubmit") })).toBeTruthy();
  });

  it("test_screens_voicerequest_default_submitdisabledwithreasonuntilconsent", async () => {
    await renderRoute("/dashboard/voices/request");
    const submit = screen.getByRole("button", { name: t("screen.voiceRequest.submit") });
    expect(submit.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getAllByText(t("screen.voiceRequest.submitReason")).length).toBeGreaterThan(0);
  });

  it("test_screens_team_forbiddenflag_isreadonly", async () => {
    await renderRoute("/dashboard/team", "forbidden");
    expect(
      screen.getByRole("button", { name: t("screen.team.invite") }).getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("test_screens_team_default_lastownercannotberemoved", async () => {
    await renderRoute("/dashboard/team");
    expect(screen.getAllByText(t("screen.team.lastOwner")).length).toBeGreaterThan(0);
  });

  it("test_screens_playground_zerobalanceflag_showsbannerwithtopuplink", async () => {
    await renderRoute("/dashboard/playground", "zero-balance");
    const banner = screen
      .getByText(t("screen.playground.zeroBalance"))
      .closest("div") as HTMLElement;
    expect(within(banner).getByRole("link").getAttribute("href")).toBe("/dashboard/billing");
  });

  it("test_screens_playground_overlimitflag_disablesplay", async () => {
    await renderRoute("/dashboard/playground", "over-limit");
    expect(screen.getByText(/over the limit/)).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: t("screen.playground.play") })
        .getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("test_screens_playground_default_labelsttfaasmeasuredinthebrowser", async () => {
    await renderRoute("/dashboard/playground");
    expect(screen.getByText(t("pulse.label.measured"))).toBeTruthy();
  });

  it("test_screens_onboarding_completeflag_ticksallsteps", async () => {
    await renderRoute("/dashboard/onboarding", "complete");
    const steps = screen.getByRole("list", { name: t("screen.onboarding.steps") });
    expect(within(steps).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getAllByText(t("screen.onboarding.done")).length).toBe(3);
  });

  it("test_screens_onboarding_default_marksthecurrentstep", async () => {
    await renderRoute("/dashboard/onboarding");
    const steps = screen.getByRole("list", { name: t("screen.onboarding.steps") });
    expect(steps.querySelector('[aria-current="step"]')).not.toBeNull();
  });

  it("test_screens_settings_default_hasfourtabsanddangerzone", async () => {
    await renderRoute("/dashboard/settings");
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.getByRole("button", { name: t("screen.settings.delete") })).toBeTruthy();
  });

  it("test_screens_settings_delete_requirestypedconfirmation", async () => {
    await renderRoute("/dashboard/settings");
    fireEvent.click(screen.getByRole("button", { name: t("screen.settings.delete") }));
    const confirm = screen.getByRole("button", { name: t("screen.settings.deleteConfirm") });
    expect(confirm.getAttribute("aria-disabled")).toBe("true");
    fireEvent.change(screen.getByLabelText(t("screen.settings.deleteTypeLabel")), {
      target: { value: "Acme" },
    });
    expect(
      screen
        .getByRole("button", { name: t("screen.settings.deleteConfirm") })
        .getAttribute("aria-disabled"),
    ).toBe("false");
  });
});
