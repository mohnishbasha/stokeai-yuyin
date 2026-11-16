// @vitest-environment jsdom
// CN-49 unit_console_codeblock_copy_languagetabswork
// CN-47 unit_console_keyreveal_secret_shownonce
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CodeBlock } from "../../../src/components/ui/CodeBlock";
import { KeyReveal } from "../../../src/components/ui/KeyReveal";
import { buildSpeechSnippets } from "../../../src/lib/snippets";

let written: string[] = [];

function stubClipboard(fail = false): void {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: (text: string) => {
        if (fail) return Promise.reject(new Error("denied"));
        written.push(text);
        return Promise.resolve();
      },
    },
  });
}

beforeEach(() => {
  written = [];
  localStorage.clear();
  stubClipboard();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("CodeBlock", () => {
  const snippets = buildSpeechSnippets();

  it("test_codeblock_render_showscurlfirstwithlabelledfocusableregion", () => {
    render(<CodeBlock snippets={snippets} />);
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "curl",
      "TypeScript",
      "Python",
    ]);
    const region = screen.getByRole("region", { name: /curl/ });
    expect(region.getAttribute("tabindex")).toBe("0");
    expect(region.textContent).toContain("curl");
  });

  it("test_codeblock_tabs_switchlanguagebyclickandarrowkey", () => {
    render(<CodeBlock snippets={snippets} />);
    fireEvent.click(screen.getByRole("tab", { name: "TypeScript" }));
    expect(screen.getByRole("region", { name: /TypeScript/ }).textContent).toContain("fetch(");
    fireEvent.keyDown(screen.getByRole("tab", { name: "TypeScript" }), { key: "ArrowRight" });
    expect(screen.getByRole("region", { name: /Python/ }).textContent).toContain("requests");
  });

  it("test_codeblock_copy_writesselectedsnippetandsayscopiedfortwoseconds", async () => {
    vi.useFakeTimers();
    render(<CodeBlock snippets={snippets} />);
    fireEvent.click(screen.getByRole("tab", { name: "Python" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
      await Promise.resolve();
    });
    expect(written).toEqual([snippets[2]?.code]);
    expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy();
    expect(document.querySelector('[aria-live="polite"]')?.textContent).toContain("Copied");
    act(() => {
      vi.advanceTimersByTime(2_100);
    });
    expect(screen.getByRole("button", { name: "Copy" })).toBeTruthy();
  });

  it("test_codeblock_copyfails_showsselecttextmessage", async () => {
    stubClipboard(true);
    render(<CodeBlock snippets={snippets} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
      await Promise.resolve();
    });
    expect(screen.getByRole("button", { name: "Copy failed, select the text" })).toBeTruthy();
  });

  it("test_codeblock_language_persistsinlocalstorage", () => {
    const { unmount } = render(<CodeBlock snippets={snippets} />);
    fireEvent.click(screen.getByRole("tab", { name: "Python" }));
    unmount();
    render(<CodeBlock snippets={snippets} />);
    expect(screen.getByRole("tab", { name: "Python" }).getAttribute("aria-selected")).toBe("true");
  });

  it("test_codeblock_empty_disablescopyandloadingshowsskeleton", () => {
    const { rerender } = render(<CodeBlock snippets={[{ id: "curl", label: "curl", code: "" }]} />);
    expect(screen.getByRole("button", { name: "Copy" }).getAttribute("aria-disabled")).toBe("true");
    rerender(<CodeBlock snippets={snippets} loading />);
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it("test_codeblock_keyplaceholdernotice_isshown", () => {
    render(<CodeBlock snippets={snippets} />);
    expect(screen.getByText(/YUYIN_API_KEY/, { selector: "p" })).toBeTruthy();
  });
});

describe("KeyReveal", () => {
  // Built at runtime so no key-shaped literal is committed (gitleaks).
  const SECRET = ["yy", "test", "ab12", "c0ffee00deadbeef"].join("_");

  function setup(onDone = vi.fn()) {
    const view = render(<KeyReveal secret={SECRET} onDone={onDone} />);
    return { onDone, ...view };
  }

  it("test_keyreveal_open_showsbannerkeyandfocusesthekey", () => {
    setup();
    expect(screen.getByText("Shown once")).toBeTruthy();
    const key = screen.getByText(SECRET);
    expect(document.activeElement).toBe(key);
  });

  it("test_keyreveal_copy_writessecret", async () => {
    setup();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
      await Promise.resolve();
    });
    expect(written).toEqual([SECRET]);
  });

  it("test_keyreveal_done_isdisabledUntilCheckboxTicked", () => {
    const { onDone } = setup();
    const done = screen.getByRole("button", { name: "Done" });
    expect(done.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(done);
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox", { name: "I have stored this key" }));
    expect(done.getAttribute("aria-disabled")).toBe("false");
  });

  it("test_keyreveal_escapebeforeticking_doesnotdismissandexplains", () => {
    const { onDone } = setup();
    fireEvent.keyDown(screen.getByText(SECRET), { key: "Escape" });
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByText(SECRET)).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Store the key before closing");
  });

  it("test_keyreveal_done_removessecretfromdomandneverreturns", () => {
    const { onDone, rerender } = setup();
    fireEvent.click(screen.getByRole("checkbox", { name: "I have stored this key" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).not.toContain(SECRET);
    expect(screen.getByText(/cannot be shown again/)).toBeTruthy();
    rerender(<KeyReveal secret={SECRET} onDone={onDone} />);
    expect(document.body.textContent).not.toContain(SECRET);
  });

  it("test_keyreveal_curlexample_usesenvplaceholderneverthesecret", () => {
    setup();
    const pre = document.querySelector("pre");
    expect(pre?.textContent).toContain("YUYIN_API_KEY");
    expect(pre?.textContent).not.toContain(SECRET);
  });

  it("test_keyreveal_loadingandmintfailure_showpartialnothing", () => {
    const onRetry = vi.fn();
    const { rerender } = render(<KeyReveal secret={null} loading onDone={() => undefined} />);
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
    rerender(
      <KeyReveal secret={null} errorCode="internal" onRetry={onRetry} onDone={() => undefined} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});
