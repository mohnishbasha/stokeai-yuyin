// Builds the static search index at build time from the MDX pages, the generated API
// reference, and the changelog. Written to public/search-index.json by
// scripts/build-search-index.ts; no search service is involved.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseChangelog } from "./changelog";
import { parseMdx, plainText } from "./headings";
import { t } from "./messages";
import { PAGES } from "./nav";
import { buildReference, loadOpenApi } from "./openapi";
import { changelogPath, contentDir } from "./paths";
import type { SearchEntry } from "./search";

function mdxEntries(href: string, file: string): SearchEntry[] {
  const page = parseMdx(readFileSync(join(contentDir(), `${file}.mdx`), "utf8"));
  return [
    { href, title: page.title, context: page.title, text: page.intro },
    ...page.headings.map((h) => ({
      href: `${href === "/" ? "" : href}#${h.id}`,
      title: h.text,
      context: page.title,
      text: h.body,
    })),
  ];
}

function referenceEntries(): SearchEntry[] {
  return buildReference(loadOpenApi()).endpoints.map((e) => ({
    href: `/reference#${e.id}`,
    title: `${e.method} ${e.path}`,
    context: t("page.reference"),
    text: [
      e.operationId,
      e.summary,
      e.description,
      ...e.parameters.map((p) => p.name),
      ...e.requestFields.map((f) => f.name),
      ...e.responses.map((r) => `${r.code} ${r.description}`),
    ].join(" "),
  }));
}

function changelogEntries(): SearchEntry[] {
  const releases = parseChangelog(readFileSync(changelogPath(), "utf8"));
  const text = releases
    .flatMap((r) => [r.version, ...r.sections.flatMap((s) => [s.name, ...s.entries])])
    .join(" ");
  return [
    {
      href: "/changelog",
      title: t("page.changelog"),
      context: t("page.changelog"),
      text: plainText(text),
    },
  ];
}

export function buildSearchIndex(): SearchEntry[] {
  return PAGES.flatMap((page) => {
    switch (page.kind) {
      case "mdx":
        return mdxEntries(page.href, page.file);
      case "reference":
        return [
          { href: page.href, title: page.title, context: page.title, text: t("reference.intro") },
          ...referenceEntries(),
        ];
      case "changelog":
        return changelogEntries();
    }
  });
}
