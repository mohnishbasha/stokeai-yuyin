// @vitest-environment jsdom
// DC-06 unit_docs_mdx_pages_renderheadingsandtables
import { evaluate } from "@mdx-js/mdx";
import { cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import { afterEach, describe, expect, it } from "vitest";
import { useMDXComponents } from "../../mdx-components";
import { PAGES } from "../../src/lib/nav";
import { slugify } from "../../src/lib/slug";

afterEach(cleanup);

async function renderMdx(source: string): Promise<void> {
  const mod = await evaluate(source, { ...runtime, useMDXComponents, remarkPlugins: [remarkGfm] });
  const Content = mod.default as () => ReactNode;
  render(<Content />);
}

describe("MDX rendering", () => {
  it("test_mdx_render_h2_getsstableid", async () => {
    await renderMdx("# Title\n\n## Get a key\n\nBody.\n");
    expect(document.querySelector("h1")?.textContent).toBe("Title");
    expect(document.querySelector("h2")?.id).toBe("get-a-key");
  });

  it("test_mdx_render_tableandcode_render", async () => {
    await renderMdx("| a | b |\n|---|---|\n| 1 | 2 |\n\n```sh\ncurl x\n```\n");
    expect(document.querySelector("table")).not.toBeNull();
    expect(document.querySelector("pre code")?.textContent).toContain("curl x");
  });

  it("test_mdx_render_everypage_hasoneh1matchingtitle", async () => {
    for (const page of PAGES) {
      if (page.kind !== "mdx") continue;
      const file = join(import.meta.dirname, "../../src/content", `${page.file}.mdx`);
      cleanup();
      await renderMdx(readFileSync(file, "utf8"));
      expect(document.querySelectorAll("h1")).toHaveLength(1);
      expect(document.querySelector("h1")?.textContent).toBe(page.title);
    }
  });
});

describe("slugify", () => {
  it("test_slugify_text_lowercaseshyphenated", () => {
    expect(slugify("Get a key!")).toBe("get-a-key");
    expect(slugify("Hindi reading")).toBe("hindi-reading");
  });
});
