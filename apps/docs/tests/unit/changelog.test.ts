// DC-10 unit_docs_changelog_parse_groupsversionsandsections
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseChangelog } from "../../src/lib/changelog";

const SAMPLE = [
  "# Changelog",
  "",
  "## [Unreleased]",
  "",
  "### Added",
  "- One thing.",
  "- Another thing.",
  "",
  "### Fixed",
  "- A fix.",
  "",
  "## [0.1.0] - 2026-01-02",
  "",
  "### Changed",
  "- Something.",
].join("\n");

describe("changelog parser", () => {
  it("test_changelog_parse_groupsversionsandsections", () => {
    const releases = parseChangelog(SAMPLE);
    expect(releases.map((r) => r.version)).toEqual(["Unreleased", "0.1.0"]);
    expect(releases[0]?.date).toBeUndefined();
    expect(releases[1]?.date).toBe("2026-01-02");
    expect(releases[0]?.sections.map((s) => s.name)).toEqual(["Added", "Fixed"]);
    expect(releases[0]?.sections[0]?.entries).toEqual(["One thing.", "Another thing."]);
  });

  it("test_changelog_parse_empty_givesnoreleases", () => {
    expect(parseChangelog("# Changelog\n")).toEqual([]);
  });

  it("test_changelog_parse_realfile_hasunreleased", () => {
    const text = readFileSync(join(import.meta.dirname, "../../../../CHANGELOG.md"), "utf8");
    expect(parseChangelog(text)[0]?.version).toBe("Unreleased");
  });
});
