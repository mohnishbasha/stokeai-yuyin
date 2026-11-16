// @vitest-environment jsdom
// CN-48 unit_console_components_keyboardnav_focusringvisible (Dialog, Toast)
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dialog } from "../../../src/components/ui/Dialog";
import { ToastProvider, useToast } from "../../../src/components/ui/Toast";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function Host({ onClose = vi.fn(), busy = false }: { onClose?: () => void; busy?: boolean }) {
  return (
    <div>
      <button type="button">Trigger</button>
      <Dialog
        open
        onClose={onClose}
        title="Revoke key sk_live_...a91f?"
        description="Requests using this key fail at once."
        busy={busy}
        error="Could not revoke"
        footer={
          <>
            <button type="button">Cancel</button>
            <button type="button">Revoke</button>
          </>
        }
      >
        <p>Body</p>
      </Dialog>
    </div>
  );
}

describe("Dialog", () => {
  it("test_dialog_open_hasdialogroleandmodalandlabelled", () => {
    render(<Host />);
    const dialog = screen.getByRole("dialog", { name: "Revoke key sk_live_...a91f?" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
  });

  it("test_dialog_open_movesfocusinsideandfocusesfirstcontrol", () => {
    render(<Host />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("test_dialog_error_ismovedfocusedsummary", () => {
    render(<Host />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Could not revoke");
    expect(document.activeElement).toBe(alert);
  });

  it("test_dialog_tab_trapsfocusbothdirections", () => {
    render(<Host />);
    const dialog = screen.getByRole("dialog");
    const revoke = screen.getByRole("button", { name: "Revoke" });
    const close = screen.getByRole("button", { name: "Close" });
    revoke.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    close.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(revoke);
  });

  it("test_dialog_escape_closesunlessbusy", () => {
    const onClose = vi.fn();
    const { rerender } = render(<Host onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<Host onClose={onClose} busy />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("test_dialog_close_returnsfocustotrigger", () => {
    const { getByRole } = render(<ToggleHost />);
    const trigger = getByRole("button", { name: "Open" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("test_dialog_scrimclick_closes", () => {
    const onClose = vi.fn();
    render(<Host onClose={onClose} />);
    fireEvent.mouseDown(screen.getByTestId("dialog-scrim"));
    expect(onClose).toHaveBeenCalled();
  });

  it("test_dialog_closed_rendersnothing", () => {
    render(
      <Dialog open={false} onClose={() => undefined} title="x">
        y
      </Dialog>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

function ToggleHost() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Open
      </button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        title="Hello"
      >
        <p>Body</p>
      </Dialog>
    </div>
  );
}

function Pusher({ kind }: { kind: "success" | "error" }) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        toast.push({
          kind,
          message: "Key created",
          action: { label: "View", onClick: () => undefined },
        });
      }}
    >
      Push
    </button>
  );
}

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("test_toast_push_rendersinpoliteliveregion", () => {
    render(
      <ToastProvider>
        <Pusher kind="success" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Push" }));
    const region = screen.getByRole("region", { name: "Notifications" });
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.textContent).toContain("Key created");
  });

  it("test_toast_success_dismissesafteratleastsixseconds", () => {
    render(
      <ToastProvider>
        <Pusher kind="success" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Push" }));
    act(() => {
      vi.advanceTimersByTime(5_900);
    });
    expect(screen.queryByText("Key created")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(screen.queryByText("Key created")).toBeNull();
  });

  it("test_toast_hover_pausesthetimer", () => {
    render(
      <ToastProvider>
        <Pusher kind="success" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Push" }));
    const item = screen.getByText("Key created").closest("li") as HTMLElement;
    fireEvent.mouseEnter(item);
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.queryByText("Key created")).toBeTruthy();
    fireEvent.mouseLeave(item);
    act(() => {
      vi.advanceTimersByTime(7_000);
    });
    expect(screen.queryByText("Key created")).toBeNull();
  });

  it("test_toast_error_staysuntildismissed", () => {
    render(
      <ToastProvider>
        <Pusher kind="error" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Push" }));
    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(screen.queryByText("Key created")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Key created")).toBeNull();
  });

  it("test_toast_escapeanditsaction_dismissandrun", () => {
    render(
      <ToastProvider>
        <Pusher kind="error" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Push" }));
    expect(screen.getByRole("button", { name: "View" })).toBeTruthy();
    fireEvent.keyDown(screen.getByText("Key created").closest("li") as HTMLElement, {
      key: "Escape",
    });
    expect(screen.queryByText("Key created")).toBeNull();
  });

  it("test_toast_f8_movesfocustoregion", () => {
    render(
      <ToastProvider>
        <Pusher kind="success" />
      </ToastProvider>,
    );
    fireEvent.keyDown(document, { key: "F8" });
    expect(document.activeElement).toBe(screen.getByRole("region", { name: "Notifications" }));
  });

  it("test_toast_usetoastoutsideprovider_throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Pusher kind="success" />)).toThrow();
    spy.mockRestore();
  });
});
