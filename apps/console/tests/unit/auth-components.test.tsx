// @vitest-environment jsdom
// Org switcher and sign-in form markup: CSRF field present, token not shown, strings from t().
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrgSwitcher } from "../../src/components/OrgSwitcher";
import { SignInForm } from "../../src/components/SignInForm";
import type { ConsoleView } from "../../src/lib/auth/view";

const view = {
  user: { id: "u1", email: "a@example.test", name: "A", status: "active", createdAt: new Date(0) },
  org: { id: "o1", name: "Acme" },
  role: "developer",
  csrf: "csrf-token-value",
  memberships: [
    { tenantId: "o1", userId: "u1", role: "developer", orgName: "Acme", orgStatus: "active" },
    { tenantId: "o2", userId: "u1", role: "billing", orgName: "Beta", orgStatus: "active" },
  ],
} as unknown as ConsoleView;

describe("OrgSwitcher", () => {
  it("test_orgswitcher_listsorgs_currentselected_postswithcsrf", () => {
    const { container } = render(<OrgSwitcher view={view} />);
    const select = screen.getByLabelText("Organization");
    expect((select as HTMLSelectElement).value).toBe("o1");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Acme", "Beta"]);
    const forms = container.querySelectorAll("form");
    expect(forms).toHaveLength(2);
    for (const form of forms) {
      expect(form.method).toBe("post");
      expect((form.querySelector("input[name=csrf]") as HTMLInputElement).value).toBe(
        "csrf-token-value",
      );
    }
    expect(screen.getByText("Developer")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
  });
});

describe("SignInForm", () => {
  it("test_signinform_withlinktoken_hiddenfieldandcontinuebutton", () => {
    const { container } = render(<SignInForm token="yylt_abc" failed={false} />);
    expect(container.querySelector<HTMLInputElement>("input[name=token]")?.type).toBe("hidden");
    expect(screen.getByRole("button", { name: "Continue to the console" })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("test_signinform_notoken_showspasswordinputAndGenericError", () => {
    render(<SignInForm token={null} failed />);
    expect(screen.getByLabelText<HTMLInputElement>("One-time login token").type).toBe("password");
    expect(screen.getByRole("alert").textContent).toContain("not valid");
  });
});
