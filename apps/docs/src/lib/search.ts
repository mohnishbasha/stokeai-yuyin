// Client-side search over the static index built at build time. No external service (NFR-025).
import { SEARCH_RESULT_LIMIT } from "./site";

export interface SearchEntry {
  readonly href: string;
  readonly title: string;
  /** The page or section the entry belongs to, shown under the title. */
  readonly context: string;
  readonly text: string;
}

const TITLE_WEIGHT = 5;
const CONTEXT_WEIGHT = 2;
const TEXT_WEIGHT = 1;
const PAGE_BONUS = 1;

export function isSearchIndex(value: unknown): value is SearchEntry[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry: unknown) =>
        typeof entry === "object" &&
        entry !== null &&
        "href" in entry &&
        typeof entry.href === "string" &&
        "title" in entry &&
        typeof entry.title === "string" &&
        "context" in entry &&
        typeof entry.context === "string" &&
        "text" in entry &&
        typeof entry.text === "string",
    )
  );
}

/** Entries that contain every word of the query, best match first. */
export function search(
  index: readonly SearchEntry[],
  query: string,
  limit: number = SEARCH_RESULT_LIMIT,
): SearchEntry[] {
  const tokens = query.toLowerCase().split(/\s+/).filter((token) => token !== "");
  if (tokens.length === 0) return [];
  const scored: { entry: SearchEntry; score: number }[] = [];
  for (const entry of index) {
    const title = entry.title.toLowerCase();
    const context = entry.context.toLowerCase();
    const text = entry.text.toLowerCase();
    let score = entry.href.includes("#") ? 0 : PAGE_BONUS;
    let matched = true;
    for (const token of tokens) {
      const inTitle = title.includes(token);
      const inContext = context.includes(token);
      const inText = text.includes(token);
      if (!inTitle && !inContext && !inText) {
        matched = false;
        break;
      }
      score +=
        (inTitle ? TITLE_WEIGHT : 0) + (inContext ? CONTEXT_WEIGHT : 0) + (inText ? TEXT_WEIGHT : 0);
    }
    if (matched) scored.push({ entry, score });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.entry);
}
