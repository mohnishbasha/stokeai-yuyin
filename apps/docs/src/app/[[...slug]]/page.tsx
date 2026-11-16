import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageFrame } from "../../components/PageFrame";
import { parseMdx } from "../../lib/headings";
import { PAGES, pageForPath } from "../../lib/nav";
import { contentDir } from "../../lib/paths";
import { MDX_LOADERS } from "../../lib/pages";

interface Params {
  slug?: string[];
}

const hrefOf = (slug: string[] | undefined): string => `/${(slug ?? []).join("/")}`;

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return PAGES.filter((page) => page.kind === "mdx").map((page) => ({
    slug: page.href === "/" ? [] : page.href.slice(1).split("/"),
  }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const page = pageForPath(hrefOf((await params).slug));
  return page ? { title: page.title } : {};
}

export default async function DocPage({ params }: { params: Promise<Params> }) {
  const href = hrefOf((await params).slug);
  const page = pageForPath(href);
  const load = page?.kind === "mdx" ? MDX_LOADERS[page.file] : undefined;
  if (page?.kind !== "mdx" || load === undefined) notFound();
  const { default: Content } = await load();
  const source = readFileSync(join(contentDir(), `${page.file}.mdx`), "utf8");
  const toc = parseMdx(source)
    .headings.filter((h) => h.level === 2)
    .map((h) => ({ id: h.id, text: h.text }));
  return (
    <PageFrame href={href} toc={toc}>
      <Content />
    </PageFrame>
  );
}
