// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Badge } from "../../../src/components/ui/Badge";
import { Banner } from "../../../src/components/ui/Banner";
import { EmptyState } from "../../../src/components/ui/EmptyState";
import { ErrorState } from "../../../src/components/ui/ErrorState";
import { BalanceMeter } from "../../../src/components/ui/BalanceMeter";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Badge", () => {
  it("test_badge_status_pairsiconandtextandisnotfocusable", () => {
    render(<Badge status="ok">Active</Badge>);
    const badge = screen.getByText("Active").closest("span") as HTMLElement;
    expect(badge.textContent).toContain("Active");
    expect(badge.querySelector('[aria-hidden="true"]')).toBeTruthy();
    expect(badge.hasAttribute("tabindex")).toBe(false);
  });

  it.each(["neutral", "ok", "warn", "err", "info"] as const)("test_badge_status_%s_renders", (status) => {
    render(<Badge status={status}>Label</Badge>);
    expect(screen.getByText("Label")).toBeTruthy();
  });
});

describe("Banner", () => {
  it("test_banner_default_isstatusandactionisalink", () => {
    render(<Banner status="warn" action={{ label: "Top up", href: "/console/billing" }}>Low balance</Banner>);
    expect(screen.getByRole("status").textContent).toContain("Low balance");
    expect(screen.getByRole("link", { name: "Top up" }).getAttribute("href")).toBe("/console/billing");
  });

  it("test_banner_incident_usesalertandcannotbedismissed", () => {
    render(
      <Banner status="err" role="alert" onDismiss={() => undefined} incident>
        Incident
      </Banner>,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
  });

  it("test_banner_dismiss_callsback", () => {
    const onDismiss = vi.fn();
    render(<Banner status="info" onDismiss={onDismiss}>Test mode</Banner>);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe("EmptyState", () => {
  it("test_emptystate_render_hastitlebodyandonlyactionisatabstop", () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="No API keys yet"
        body="Create one to send your first request."
        action={{ label: "Create API key", onClick }}
        docs={{ label: "Read the docs", href: "/docs" }}
      />,
    );
    expect(screen.getByRole("heading", { name: "No API keys yet" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Create API key" }));
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Read the docs" })).toBeTruthy();
  });

  it("test_emptystate_actiondisabled_showsreason", () => {
    render(
      <EmptyState
        title="t"
        body="b"
        action={{ label: "Create", onClick: () => undefined, disabledReason: "Needs the developer role" }}
      />,
    );
    expect(screen.getByRole("button", { name: /Create/ }).getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText("Needs the developer role")).toBeTruthy();
  });
});

describe("ErrorState", () => {
  it("test_errorstate_render_showscodetraceidandretry", () => {
    const onRetry = vi.fn();
    render(
      <ErrorState
        title="Could not load keys"
        cause="The service did not answer."
        code="engine_unavailable"
        traceId="req_01HXYZ"
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText("engine_unavailable")).toBeTruthy();
    expect(screen.getByText("req_01HXYZ")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("test_errorstate_afteruseraction_isanalertandtitlegetsfocus", () => {
    render(<ErrorState title="Save failed" cause="x" afterUserAction focusOnMount />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Save failed" }));
  });

  it("test_errorstate_retryafter_disablesandcountsdown", () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    render(<ErrorState title="Slow down" cause="x" retryAfterSeconds={3} onRetry={onRetry} />);
    const retry = screen.getByRole("button", { name: /Retry in 3 s/ });
    expect(retry.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(retry);
    expect(onRetry).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(screen.getByRole("button", { name: "Retry" }).getAttribute("aria-disabled")).toBe("false");
  });

  it("test_errorstate_loading_marksretrybusy", () => {
    render(<ErrorState title="t" cause="c" onRetry={() => undefined} retrying />);
    expect(screen.getByRole("button", { name: /Retry/ }).getAttribute("aria-busy")).toBe("true");
  });

  it("test_errorstate_help_rendersasecondarylink", () => {
    render(<ErrorState title="t" cause="c" help={{ label: "Status page", href: "/status" }} />);
    expect(screen.getByRole("link", { name: "Status page" })).toBeTruthy();
  });
});

describe("BalanceMeter", () => {
  it("test_balancemeter_default_isameterwithvaluetext", () => {
    render(
      <BalanceMeter
        balanceMicroUsd={12_500_000}
        capacityMicroUsd={50_000_000}
        lowThresholdMicroUsd={5_000_000}
        topUpHref="/console/billing"
      />,
    );
    const meter = screen.getByRole("meter");
    expect(meter.getAttribute("aria-valuemin")).toBe("0");
    expect(meter.getAttribute("aria-valuemax")).toBe("100");
    expect(meter.getAttribute("aria-valuenow")).toBe("25");
    expect(meter.getAttribute("aria-valuetext")).toBe("$12.50 of $50.00 USD");
    expect(screen.getByRole("link", { name: "Top up" }).getAttribute("href")).toBe("/console/billing");
    expect(screen.queryByText("Low balance")).toBeNull();
  });

  it("test_balancemeter_belowthreshold_statesLowBalanceInText", () => {
    render(
      <BalanceMeter
        balanceMicroUsd={1_000_000}
        capacityMicroUsd={50_000_000}
        lowThresholdMicroUsd={5_000_000}
        topUpHref="/x"
      />,
    );
    expect(screen.getByText("Low balance")).toBeTruthy();
    expect(screen.getByRole("meter").getAttribute("aria-valuetext")).toContain("Low balance");
  });

  it("test_balancemeter_exactamount_isavailableasatooltip", () => {
    render(<BalanceMeter balanceMicroUsd={1_234_567} capacityMicroUsd={5_000_000} topUpHref="/x" />);
    expect(screen.getByRole("meter").getAttribute("title")).toBe("$1.234567");
  });

  it("test_balancemeter_loading_isbusywithoutmeter", () => {
    render(<BalanceMeter loading topUpHref="/x" />);
    expect(screen.queryByRole("meter")).toBeNull();
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it("test_balancemeter_error_showsunavailableandretry", () => {
    const onRetry = vi.fn();
    render(<BalanceMeter error onRetry={onRetry} topUpHref="/x" />);
    expect(screen.getByText("Balance unavailable")).toBeTruthy();
    expect(screen.queryByRole("meter")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });
});
