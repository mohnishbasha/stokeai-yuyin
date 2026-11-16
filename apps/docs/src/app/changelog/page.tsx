import { readFileSync } from "node:fs";
import type { Metadata } from "next";
import { PageFrame } from "../../components/PageFrame";
import { parseChangelog } from "../../lib/changelog";
import { t } from "../../lib/messages";
import { changelogPath } from "../../lib/paths";
import { slugify } from "../../lib/slug";

export const metadata: Metadata = { title: t("page.changelog") };

/** Built from CHANGELOG.md (DESIGN 6.4 D6). */
export default function ChangelogPage() {
  const releases = parseChangelog(readFileSync(changelogPath(), "utf8"));
  return (
    <PageFrame
      href="/changelog"
      toc={releases.map((r) => ({ id: slugify(r.version), text: r.version }))}
    >
      <h1 className="mb-4 text-h1 font-semibold text-text-0">{t("page.changelog")}</h1>
      <p className="mb-4 max-w-prose text-text-1">{t("changelog.intro")}</p>
      {releases.length === 0 && <p className="text-text-1">{t("changelog.empty")}</p>}
      {releases.map((release) => (
        <section key={release.version} id={slugify(release.version)} className="mb-6 scroll-mt-5">
          <h2 className="mb-2 text-h2 font-semibold text-text-0">
            {release.version === "Unreleased" ? t("changelog.unreleased") : `v${release.version}`}
            {release.date !== undefined && (
              <time dateTime={release.date} className="ml-3 text-small font-normal text-text-2">
                {release.date}
              </time>
            )}
          </h2>
          {release.sections.map((section) => (
            <div key={section.name}>
              <h3 className="mb-2 text-h3 font-semibold text-text-0">{section.name}</h3>
              <ul className="mb-4 max-w-prose list-disc pl-5 text-text-1">
                {section.entries.map((entry) => (
                  <li key={entry} className="mb-1">
                    {entry}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </PageFrame>
  );
}
