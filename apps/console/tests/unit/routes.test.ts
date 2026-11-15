// CN-40 unit_console_routes_groups_allthreeexist, CN-42 e2e_console_healthz_get_returns200 (handler)
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GET } from "../../src/app/healthz/route";

const APP = join(import.meta.dirname, "../../src/app");

describe("route groups", () => {
  it.each(["(marketing)", "(console)", "(operator)"])(
    "test_routes_group_%s_hasalayout",
    (group) => {
      expect(existsSync(join(APP, group, "layout.tsx"))).toBe(true);
    },
  );

  it.each(["(marketing)/page.tsx", "(console)/dashboard/page.tsx", "(operator)/operator/page.tsx"])(
    "test_routes_placeholder_%s_exists",
    (page) => {
      expect(existsSync(join(APP, page))).toBe(true);
    },
  );

  it("test_routes_root_layout_exists", () => {
    expect(existsSync(join(APP, "layout.tsx"))).toBe(true);
  });
});

describe("healthz", () => {
  it("test_healthz_get_returns200ok", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
