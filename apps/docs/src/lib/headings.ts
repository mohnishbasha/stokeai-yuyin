import { slugify } from "./slug";

export interface Heading {
  readonly level: 2 | 3;
  readonly id: string;
  readonly text: string;
  /** Plain text under the heading, up to the next heading. */
  readonly body: string;
}

/** Removes the Markdown syntax that is noise in a search index. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[`*_>|]/g, " ")
    .replace(/^[-:\s]+$/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The title (first h1) and the h2 and h3 headings of an MDX page, with the text under each. */
export function parseMdx(source: string): { title: string; intro: string; headings: Heading[] } {
  let title = "";
  let inFence = false;
  const intro: string[] = [];
  const headings: { level: 2 | 3; text: string; lines: string[] }[] = [];
  for (const line of source.split("\n")) {
    if (line.startsWith("```")) {
      inFence = !inFence;
    }
    const match = inFence ? null : /^(#{1,3})\s+(.+?)\s*$/.exec(line);
    if (match?.[1] !== undefined && match[2] !== undefined) {
      const depth = match[1].length;
      if (depth === 1) {
        if (title === "") title = match[2];
        continue;
      }
      headings.push({ level: depth === 2 ? 2 : 3, text: match[2], lines: [] });
      continue;
    }
    (headings.at(-1)?.lines ?? intro).push(line);
  }
  return {
    title,
    intro: plainText(intro.join("\n")),
    headings: headings.map((h) => ({
      level: h.level,
      id: slugify(h.text),
      text: h.text,
      body: plainText(h.lines.join("\n")),
    })),
  };
}
