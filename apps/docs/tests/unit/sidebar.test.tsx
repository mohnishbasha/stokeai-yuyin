// @vitest-environment jsdom
// DC-05 unit_docs_sidebar_currentpage_markedandsectionsgrouped
// DC-07 unit_docs_pages_sixscreens_allexistandlisted
import { cleanup, render, screen } from "@testing-library/react";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { Sidebar } from "../../src/components/Sidebar";
import { PAGES, SECTIONS, pageForPath } from "../../src/lib/nav";

afterEach(cleanup);

describe("sidebar", () => {
  it("test_sidebar_render_everysectionlistedonceinorder", () => {
    render(<Sidebar currentPath="/" />);
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual([...SECTIONS]);
  });

  it("test_sidebar_render_onlycurrentpage_hasariacurrent", () => {
    render(<Sidebar currentPath="/guides/normalisation" />);
    const current = document.querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0]?.getAttribute("href")).toBe("/guides/normalisation");
  });

  it("test_sidebar_render_everypage_isalink", () => {
    render(<Sidebar currentPath="/" />);
    for (const page of PAGES) {
      expect(document.querySelector(`a[href="${page.href}"]`)).not.toBeNull();
    }
  });
});

describe("page manifest", () => {
  it("test_pages_sixscreens_allhaveroutesandsections", () => {
    const hrefs = PAGES.map((p) => p.href);
    for (const href of ["/", "/reference", "/guides", "/sdks", "/self-hosting", "/changelog"]) {
      expect(hrefs).toContain(href);
    }
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const page of PAGES) expect(SECTIONS).toContain(page.section);
  });

  it("test_pages_mdxkind_everyfileexists", () => {
    for (const page of PAGES) {
      if (page.kind === "mdx") {
        expect(existsSync(join(import.meta.dirname, "../../src/content", `${page.file}.mdx`))).toBe(
          true,
        );
      }
    }
  });

  it("test_pages_pageforpath_unknownreturnsundefined", () => {
    expect(pageForPath("/guides")?.title).toBeTruthy();
    expect(pageForPath("/nope")).toBeUndefined();
  });
});
