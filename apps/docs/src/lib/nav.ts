// The page manifest: one entry per docs page, in sidebar order. DESIGN 6.4 screens D1 to D6.
import { t } from "./messages";

export const SECTIONS: readonly string[] = [
  t("section.quickstart"),
  t("section.reference"),
  t("section.guides"),
  t("section.sdks"),
  t("section.selfhost"),
  t("section.changelog"),
];

interface PageBase {
  readonly href: string;
  readonly title: string;
  readonly section: string;
}

export type NavPage =
  | (PageBase & { readonly kind: "mdx"; readonly file: string })
  | (PageBase & { readonly kind: "reference" | "changelog" });

export const PAGES: readonly NavPage[] = [
  { href: "/", title: t("page.quickstart"), section: t("section.quickstart"), kind: "mdx", file: "index" },
  { href: "/reference", title: t("page.reference"), section: t("section.reference"), kind: "reference" },
  { href: "/guides", title: t("page.guides"), section: t("section.guides"), kind: "mdx", file: "guides/index" },
  {
    href: "/guides/normalisation",
    title: t("page.normalisation"),
    section: t("section.guides"),
    kind: "mdx",
    file: "guides/normalisation",
  },
  { href: "/sdks", title: t("page.sdks"), section: t("section.sdks"), kind: "mdx", file: "sdks" },
  {
    href: "/self-hosting",
    title: t("page.selfhost"),
    section: t("section.selfhost"),
    kind: "mdx",
    file: "self-hosting",
  },
  { href: "/changelog", title: t("page.changelog"), section: t("section.changelog"), kind: "changelog" },
];

export function pageForPath(path: string): NavPage | undefined {
  return PAGES.find((page) => page.href === path);
}

/** The pages before and after `href` in sidebar order. */
export function neighbours(href: string): { previous?: NavPage; next?: NavPage } {
  const index = PAGES.findIndex((page) => page.href === href);
  if (index < 0) return {};
  const previous = PAGES[index - 1];
  const next = PAGES[index + 1];
  return {
    ...(previous ? { previous } : {}),
    ...(next ? { next } : {}),
  };
}
