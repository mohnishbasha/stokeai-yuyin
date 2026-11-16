// @vitest-environment jsdom
// DC-03 e2e_docs_search_knownterm_returnsresult (integration over the built index and the component)
// DC-04 unit_docs_search_unknownterm_showsnoresults
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Search } from "../../src/components/Search";
import { buildSearchIndex } from "../../src/lib/search-index";
import { search } from "../../src/lib/search";

const index = buildSearchIndex();

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(index) })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("search index and ranking", () => {
  it("test_search_index_coversmdxpagesandreference", () => {
    const hrefs = index.map((e) => e.href);
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/guides/normalisation");
    expect(hrefs.some((h) => h.startsWith("/reference#"))).toBe(true);
  });

  it("test_search_knownterm_endpointfromopenapi_isfound", () => {
    const results = search(index, "createSpeech");
    expect(results[0]?.href.startsWith("/reference#")).toBe(true);
  });

  it("test_search_knownterm_titlematchranksfirst", () => {
    expect(search(index, "normalisation")[0]?.href).toBe("/guides/normalisation");
  });

  it("test_search_unknownterm_returnsempty", () => {
    expect(search(index, "zzzqqqxxx")).toEqual([]);
    expect(search(index, "   ")).toEqual([]);
  });

  it("test_search_multiword_requiresalltokens", () => {
    expect(search(index, "api key").length).toBeGreaterThan(0);
    expect(search(index, "api zzzqqqxxx")).toEqual([]);
  });
});

describe("search component", () => {
  it("test_search_component_knownterm_listsresultlink", async () => {
    render(<Search />);
    const box = screen.getByRole("searchbox");
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: "normalisation" } });
    const links = await screen.findAllByRole("link", { name: /normalisation/i });
    expect(links[0]?.getAttribute("href")).toBe("/guides/normalisation");
  });

  it("test_search_component_unknownterm_showsnoresults", async () => {
    render(<Search />);
    const box = screen.getByRole("searchbox");
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: "zzzqqqxxx" } });
    await waitFor(() => {
      expect(screen.getByText("No results for zzzqqqxxx")).toBeTruthy();
    });
  });

  it("test_search_component_slashkey_focusesfield", () => {
    render(<Search />);
    fireEvent.keyDown(document, { key: "/" });
    expect(document.activeElement).toBe(screen.getByRole("searchbox"));
  });
});
