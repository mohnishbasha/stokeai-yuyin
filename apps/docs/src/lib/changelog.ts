// Parses CHANGELOG.md (Keep a Changelog) at build time for the changelog page (DESIGN 6.4 D6).

export interface ChangelogSection {
  readonly name: string;
  readonly entries: readonly string[];
}

export interface Release {
  readonly version: string;
  readonly date?: string;
  readonly sections: readonly ChangelogSection[];
}

const RELEASE_HEADING = /^##\s+\[([^\]]+)\](?:\s*-\s*(\d{4}-\d{2}-\d{2}))?/;
const SECTION_HEADING = /^###\s+(.+?)\s*$/;
const ENTRY = /^-\s+(.*)$/;
const CONTINUATION = /^\s{2,}(\S.*)$/;

export function parseChangelog(text: string): Release[] {
  const releases: { version: string; date?: string; sections: { name: string; entries: string[] }[] }[] = [];
  for (const line of text.split("\n")) {
    const release = RELEASE_HEADING.exec(line);
    if (release?.[1] !== undefined) {
      releases.push({
        version: release[1],
        ...(release[2] === undefined ? {} : { date: release[2] }),
        sections: [],
      });
      continue;
    }
    const current = releases.at(-1);
    if (current === undefined) continue;
    const section = SECTION_HEADING.exec(line);
    if (section?.[1] !== undefined) {
      current.sections.push({ name: section[1], entries: [] });
      continue;
    }
    const entries = current.sections.at(-1)?.entries;
    if (entries === undefined) continue;
    const entry = ENTRY.exec(line);
    if (entry?.[1] !== undefined) {
      entries.push(entry[1]);
      continue;
    }
    const more = CONTINUATION.exec(line);
    const last = entries.pop();
    if (last !== undefined) {
      entries.push(more?.[1] === undefined ? last : `${last} ${more[1]}`);
    }
  }
  return releases;
}
