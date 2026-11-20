// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "../../../src/components/ui/Button";

afterEach(cleanup);

describe("Button", () => {
  it("test_button_click_callsonclick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Create API key</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Create API key" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("test_button_disabled_staysfocusableignoresclickandexplains", () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled disabledReason="Only owners can do this">
        Revoke
      </Button>,
    );
    const button = screen.getByRole("button", { name: /Revoke/ });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.hasAttribute("disabled")).toBe(false);
    button.focus();
    expect(document.activeElement).toBe(button);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(button.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByText("Only owners can do this")).toBeTruthy();
  });

  it("test_button_loading_isbusykeepslabelandignoresclick", () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} loading>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: /Save/ });
    expect(button.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("test_button_defaulttype_isbuttonnotsubmit", () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole("button", { name: "Delete" }).getAttribute("type")).toBe("button");
  });
});
