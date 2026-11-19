// @vitest-environment jsdom
// CN-65 e2e_operator_screens_all_reachable
// CN-66 e2e_operator_screens_emptystateflag_renders
// CN-67 e2e_operator_screens_errorstateflag_renders
// CN-69 unit_operator_screens_mutations_aremockandrequirereason
// Route and render tests for the operator screens O1 to O7 (DESIGN 6.3). Each page module is
// called the way Next calls it and the returned tree is rendered. A Playwright version of the
// reachability, empty and error scenarios is in tests/e2e/screens.spec.ts.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OperatorNav } from "../../src/components/OperatorNav";
import { ToastProvider } from "../../src/components/ui/Toast";
import { MOCK_ERROR_CODE, MOCK_TRACE_ID } from "../../src/lib/data/mock";
import { t, tf } from "../../src/lib/messages";
import {
  OPERATOR_HOME_HREF,
  OPERATOR_NAV_ITEMS,
  OPERATOR_SAMPLE_ORG_ID,
  OPERATOR_SCREENS,
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

vi.mock("next/navigation", () => ({ usePathname: () => "/operator/abuse" }));

type PageModule = {
  default: (props: {
    searchParams: Promise<Record<string, string | undefined>>;
    params?: Promise<Record<string, string>>;
  }) => Promise<ReactElement> | ReactElement;
};

const ALL_PAGES = import.meta.glob<PageModule>("../../src/app/*/operator/**/page.tsx");
const PAGES = Object.fromEntries(
  Object.entries(ALL_PAGES).filter(([key]) => key.includes("/(operator)/")),
);

const DETAIL_PREFIX = "/operator/organizations/";

function pageKey(href: string): string {
  if (href === OPERATOR_HOME_HREF) return "../../src/app/(operator)/operator/page.tsx";
  if (href.startsWith(DETAIL_PREFIX)) {
    return "../../src/app/(operator)/operator/organizations/[orgId]/page.tsx";
  }
  return `../../src/app/(operator)${href}/page.tsx`;
}

async function renderRoute(href: string, state?: ScreenState) {
  const loader = PAGES[pageKey(href)];
  if (loader === undefined) throw new Error(`No page for ${href}`);
  const page = await loader();
  const tree = await page.default({
    searchParams: Promise.resolve(state === undefined ? {} : { state }),
    params: Promise.resolve(
      href.startsWith(DETAIL_PREFIX) ? { orgId: href.slice(DETAIL_PREFIX.length) } : {},
    ),
  });
  return render(<ToastProvider>{tree}</ToastProvider>);
}

const heading = (name: string) => screen.getByRole("heading", { level: 1, name });

afterEach(cleanup);

describe("operator screen registry", () => {
  it("test_operatorscreens_registry_hassevenscreensforo1too7", () => {
    expect(OPERATOR_SCREENS.map((s) => s.wireframe)).toEqual(
      Array.from({ length: 7 }, (_, i) => `O${String(i + 1)}`),
    );
  });

  it("test_operatorscreens_parsestate_knowsoperatorflags", () => {
    expect(parseScreenState("suspended", "organization")).toBe("suspended");
    expect(parseScreenState("not-found", "organization")).toBe("not-found");
    expect(parseScreenState("negative", "ledger-adjustments")).toBe("negative");
    expect(parseScreenState("conflict", "abuse")).toBe("conflict");
    expect(parseScreenState("asset-error", "custom-voices")).toBe("asset-error");
    expect(parseScreenState("metrics-unavailable", "capacity")).toBe("metrics-unavailable");
    expect(parseScreenState("suspended", "abuse")).toBe("default");
  });
});

describe("e2e_operator_screens_all_reachable", () => {
  it.each(OPERATOR_SCREENS.filter((s) => s.id !== "organization").map((s) => [s.id, s] as const))(
    "test_operatorscreens_%s_hasaroutethatrendersitstitle",
    async (_id, def: ScreenDef) => {
      await renderRoute(def.href);
      expect(heading(t(def.titleKey))).toBeTruthy();
    },
  );

  it("test_operatorscreens_organization_rendersthenameandid", async () => {
    await renderRoute(`/operator/organizations/${OPERATOR_SAMPLE_ORG_ID}`);
    expect(heading("Acme Voice")).toBeTruthy();
    expect(screen.getAllByText(OPERATOR_SAMPLE_ORG_ID).length).toBeGreaterThan(0);
  });

  it("test_operatorscreens_home_overviewlinkstoeveryscreen", async () => {
    await renderRoute(OPERATOR_HOME_HREF);
    const main = screen.getByRole("main");
    expect(heading(t("op.home.title"))).toBeTruthy();
    for (const def of OPERATOR_SCREENS) {
      const link = within(main).getByRole("link", { name: t(def.titleKey) });
      expect(link.getAttribute("href")).toBe(def.href);
    }
  });

  it("test_operatorscreens_nav_linkstoeverytopscreenandmarkscurrent", () => {
    render(<OperatorNav />);
    const nav = screen.getByRole("navigation", { name: t("op.nav.label") });
    for (const item of OPERATOR_NAV_ITEMS) {
      const link = within(nav).getByRole("link", { name: t(item.labelKey) });
      expect(link.getAttribute("href")).toBe(item.href);
    }
    expect(OPERATOR_NAV_ITEMS.map((i) => i.href)).toEqual([
      "/operator",
      "/operator/organizations",
      "/operator/ledger",
      "/operator/abuse",
      "/operator/voices",
      "/operator/capacity",
      "/operator/audit",
    ]);
    const current = within(nav).getByRole("link", { name: t("op.nav.abuse") });
    expect(current.getAttribute("aria-current")).toBe("page");
  });

  it("test_operatorscreens_bar_isalabelledtextbarnotcolouralone", () => {
    const { container } = render(<OperatorNav />);
    expect(container.firstElementChild?.textContent).toBe(t("op.bar.label"));
  });

  it("test_operatorscreens_everyroutefile_isregistered", () => {
    const registered = new Set(
      [OPERATOR_HOME_HREF, ...OPERATOR_SCREENS.map((s) => s.href)].map(pageKey),
    );
    expect(new Set(Object.keys(PAGES))).toEqual(registered);
  });

  it("test_operatorscreens_layout_keepstheallowlistguard", () => {
    const source = readFileSync(
      join(import.meta.dirname, "../../src/app/(operator)/layout.tsx"),
      "utf8",
    );
    expect(source).toContain("authorizeOperator");
    expect(source).toContain('redirect("/sign-in")');
    expect(source).toContain("notFound()");
  });
});

describe("e2e_operator_screens_emptystateflag_renders", () => {
  const withEmpty = OPERATOR_SCREENS.filter((s) => s.emptyTitleKey !== undefined);

  it.each(withEmpty.map((s) => [s.id, s] as const))(
    "test_operatorscreens_%s_emptyflag_showsemptystate",
    async (_id, def: ScreenDef) => {
      const state: ScreenState = def.id === "organization" ? "not-found" : "empty";
      await renderRoute(def.href, state);
      const key = def.emptyTitleKey;
      if (key === undefined) throw new Error("unreachable");
      expect(screen.getByRole("heading", { level: 2, name: t(key) })).toBeTruthy();
    },
  );

  it.each(
    OPERATOR_SCREENS.filter((s) => s.states.includes("loading")).map((s) => [s.id, s] as const),
  )("test_operatorscreens_%s_loadingflag_showsbusyplaceholder", async (_id, def: ScreenDef) => {
    const { container } = await renderRoute(def.href, "loading");
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("test_operatorscreens_organization_suspendedflag_showsbannerandunsuspend", async () => {
    await renderRoute(`/operator/organizations/${OPERATOR_SAMPLE_ORG_ID}`, "suspended");
    expect(screen.getByText(t("op.org.suspendedBanner"))).toBeTruthy();
    expect(screen.getByRole("button", { name: t("op.org.unsuspend") })).toBeTruthy();
  });

  it("test_operatorscreens_ledger_negativeflag_warnsandfailedflagstatesnothingapplied", async () => {
    await renderRoute("/operator/ledger", "negative");
    expect(screen.getByText(t("op.ledger.negative"))).toBeTruthy();
    cleanup();
    await renderRoute("/operator/ledger", "failed");
    fillLedger("Debit", "5");
    fireEvent.click(screen.getByRole("button", { name: t("op.ledger.apply") }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: t("op.confirm") }),
    );
    expect(screen.getByText(t("op.ledger.failed"))).toBeTruthy();
  });

  it("test_operatorscreens_abuse_conflictflag_showsreloadmessage", async () => {
    await renderRoute("/operator/abuse", "conflict");
    expect(screen.getByText(t("op.abuse.conflict"))).toBeTruthy();
    expect(screen.getByRole("button", { name: t("op.abuse.reload") })).toBeTruthy();
  });

  it("test_operatorscreens_voices_assetErrorflag_showserrorwithretry", async () => {
    await renderRoute("/operator/voices", "asset-error");
    expect(screen.getByText(t("op.voices.assetError"))).toBeTruthy();
    expect(screen.getByRole("button", { name: t("error.retry") })).toBeTruthy();
  });

  it("test_operatorscreens_capacity_metricsunavailable_showsnofigures", async () => {
    await renderRoute("/operator/capacity", "metrics-unavailable");
    expect(screen.getByRole("heading", { name: t("op.capacity.unavailable.title") })).toBeTruthy();
    expect(screen.queryByText(t("op.capacity.queue"))).toBeNull();
  });
});

describe("e2e_operator_screens_errorstateflag_renders", () => {
  it.each(OPERATOR_SCREENS.map((s) => [s.id, s] as const))(
    "test_operatorscreens_%s_errorflag_showscodeandtraceid",
    async (_id, def: ScreenDef) => {
      await renderRoute(def.href, "error");
      expect(heading(t(def.titleKey))).toBeTruthy();
      expect(screen.getByText(MOCK_ERROR_CODE)).toBeTruthy();
      expect(screen.getByText(MOCK_TRACE_ID)).toBeTruthy();
    },
  );
});

function fillLedger(type: string, amount: string) {
  fireEvent.click(screen.getByRole("combobox", { name: new RegExp(t("op.ledger.org")) }));
  fireEvent.click(screen.getAllByRole("option")[0] as HTMLElement);
  fireEvent.click(screen.getByLabelText(type));
  fireEvent.change(screen.getByLabelText(t("op.ledger.amount")), { target: { value: amount } });
  fireEvent.change(screen.getByLabelText(t("op.reason.label")), {
    target: { value: "Test reason" },
  });
}

describe("unit_operator_screens_mutations_aremockandrequirereason", () => {
  const disabled = (name: string | RegExp) =>
    screen.getByRole("button", { name }).getAttribute("aria-disabled");

  it("test_operatorscreens_organizations_filterbysearchandlinktodetail", async () => {
    await renderRoute("/operator/organizations");
    const link = screen.getByRole("link", { name: "Acme Voice" });
    expect(link.getAttribute("href")).toBe(`/operator/organizations/${OPERATOR_SAMPLE_ORG_ID}`);
    fireEvent.change(screen.getByLabelText(t("op.orgs.search")), { target: { value: "zzz" } });
    expect(screen.getByRole("heading", { level: 2, name: t("op.orgs.empty.title") })).toBeTruthy();
  });

  it("test_operatorscreens_organization_keysshowprefixandlast4only", async () => {
    await renderRoute(`/operator/organizations/${OPERATOR_SAMPLE_ORG_ID}`);
    fireEvent.click(screen.getByRole("tab", { name: t("op.org.tabKeys") }));
    const row = screen.getByText("Production").closest("tr") as HTMLElement;
    expect(row.textContent).toMatch(/yy_live_[a-z0-9]{8}/);
    expect(row.textContent).toContain("a91f");
    expect(document.body.textContent).not.toMatch(/yy_live_[a-z0-9]{8}_[a-z0-9]{32}/);
  });

  it("test_operatorscreens_organization_suspendneedsreasonthenshowsmocknotice", async () => {
    await renderRoute(`/operator/organizations/${OPERATOR_SAMPLE_ORG_ID}`);
    fireEvent.click(screen.getByRole("button", { name: t("op.org.suspend") }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Acme Voice");
    const confirm = within(dialog).getByRole("button", { name: t("op.confirm") });
    expect(confirm.getAttribute("aria-disabled")).toBe("true");
    fireEvent.change(within(dialog).getByLabelText(t("op.reason.label")), {
      target: { value: "Confirmed abuse" },
    });
    expect(
      within(dialog)
        .getByRole("button", { name: t("op.confirm") })
        .getAttribute("aria-disabled"),
    ).toBe("false");
    fireEvent.click(within(dialog).getByRole("button", { name: t("op.confirm") }));
    expect(screen.getByText(t("op.mock.notice"))).toBeTruthy();
  });

  it("test_operatorscreens_ledger_applyneedsorgamountandreason", async () => {
    await renderRoute("/operator/ledger");
    expect(disabled(t("op.ledger.apply"))).toBe("true");
    fillLedger("Credit", "5.00");
    expect(disabled(t("op.ledger.apply"))).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: t("op.ledger.apply") }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("$5.00");
    fireEvent.click(within(dialog).getByRole("button", { name: t("op.confirm") }));
    expect(screen.getByText(t("op.mock.notice"))).toBeTruthy();
  });

  it("test_operatorscreens_ledger_previewshowsbeforeandafterfrominteger", async () => {
    await renderRoute("/operator/ledger");
    fillLedger("Credit", "5.00");
    expect(
      screen.getByText(tf("op.ledger.preview", { before: "$62.40", after: "$67.40" })),
    ).toBeTruthy();
  });

  it("test_operatorscreens_ledger_debitbelowzeroshowswarning", async () => {
    await renderRoute("/operator/ledger");
    fillLedger("Debit", "999");
    expect(screen.getByText(t("op.ledger.negative"))).toBeTruthy();
  });

  it("test_operatorscreens_abuse_evidenceisredactedUntilrevealed", async () => {
    await renderRoute("/operator/abuse");
    expect(screen.getByText(t("op.abuse.redacted"))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: t("op.abuse.reveal") }));
    expect(screen.queryByText(t("op.abuse.redacted"))).toBeNull();
    expect(screen.getByRole("button", { name: t("op.abuse.hide") })).toBeTruthy();
  });

  it("test_operatorscreens_abuse_actionsneedareasonthenshowmocknotice", async () => {
    await renderRoute("/operator/abuse");
    expect(disabled(t("op.abuse.warn"))).toBe("true");
    expect(screen.getAllByText(t("op.reason.required")).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText(t("op.reason.label")), { target: { value: "Spam" } });
    expect(disabled(t("op.abuse.warn"))).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: t("op.abuse.warn") }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: t("op.confirm") }),
    );
    expect(screen.getByText(t("op.mock.notice"))).toBeTruthy();
  });

  it("test_operatorscreens_abuse_selectingacaseshowsitsdetail", async () => {
    await renderRoute("/operator/abuse");
    fireEvent.click(screen.getByRole("button", { name: tf("op.abuse.open", { id: "case_102" }) }));
    expect(
      screen.getByRole("heading", { name: tf("op.abuse.caseTitle", { id: "case_102" }) }),
    ).toBeTruthy();
  });

  it("test_operatorscreens_voices_approveblockeduntilconsentverified", async () => {
    await renderRoute("/operator/voices");
    // The first request has verified consent.
    expect(disabled(t("op.voices.approve"))).toBe("false");
    fireEvent.click(
      screen.getByRole("button", { name: tf("op.voices.open", { id: "cv_req_22" }) }),
    );
    expect(disabled(t("op.voices.approve"))).toBe("true");
    expect(screen.getAllByText(t("op.voices.approveBlocked")).length).toBeGreaterThan(0);
  });

  it("test_operatorscreens_voices_playbackneverautoplays", async () => {
    const { container } = await renderRoute("/operator/voices");
    expect(container.querySelector("audio[autoplay]")).toBeNull();
    expect(screen.getAllByRole("button", { name: /^Play / }).length).toBeGreaterThan(0);
  });

  it("test_operatorscreens_capacity_changeadmissionneedsreasonandconfirm", async () => {
    await renderRoute("/operator/capacity");
    fireEvent.click(screen.getByRole("button", { name: t("op.capacity.change") }));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog)
        .getByRole("button", { name: t("op.confirm") })
        .getAttribute("aria-disabled"),
    ).toBe("true");
    fireEvent.change(within(dialog).getByLabelText(t("op.reason.label")), {
      target: { value: "Maintenance" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: t("op.confirm") }));
    expect(screen.getByText(t("op.mock.notice"))).toBeTruthy();
  });

  it("test_operatorscreens_capacity_createincidentisamockaction", async () => {
    await renderRoute("/operator/capacity");
    fireEvent.click(screen.getByRole("button", { name: t("op.capacity.createIncident") }));
    expect(screen.getByText(t("op.mock.notice"))).toBeTruthy();
  });

  it("test_operatorscreens_audit_rowexpandsbeforeandafter", async () => {
    await renderRoute("/operator/audit");
    fireEvent.click(screen.getByRole("button", { name: tf("op.audit.expand", { id: "aud_6" }) }));
    expect(screen.getByText(t("op.audit.before"))).toBeTruthy();
    expect(screen.getByText("$57.40")).toBeTruthy();
  });

  it("test_operatorscreens_audit_exportreportsprogressthenready", async () => {
    await renderRoute("/operator/audit");
    fireEvent.click(screen.getByRole("button", { name: t("op.audit.export") }));
    expect(screen.getByText(t("op.audit.exported"))).toBeTruthy();
  });
});
