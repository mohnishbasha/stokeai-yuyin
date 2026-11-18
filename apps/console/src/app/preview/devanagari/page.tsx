import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEVANAGARI_FIXTURE } from "../../../lib/devanagari-fixture";
import { t } from "../../../lib/messages";
import { previewEnabled } from "../../../lib/preview";

export const metadata: Metadata = { title: t("preview.devanagari.title") };

// Rendering fixture for the Devanagari snapshot (S2-T08, DESIGN 9.5). Gated like the other
// preview routes: on in development, off in a production build unless YUYIN_PREVIEW_ROUTES=1.
export default function DevanagariFixturePage() {
  if (!previewEnabled(process.env)) notFound();
  return (
    <main id="main" className="mx-auto max-w-content px-4 py-8 lg:px-6 lg:py-9">
      <p>
        <a href="/preview/components">{t("preview.back")}</a>
      </p>
      <h1 className="mt-4 text-h1 font-medium text-text-0">{t("preview.devanagari.title")}</h1>
      <p className="mt-4 max-w-prose text-body text-text-1">{t("preview.devanagari.lead")}</p>
      <ol
        aria-label={t("preview.devanagari.title")}
        data-testid="devanagari-fixture"
        className="mt-6 grid gap-2 sm:grid-cols-2"
      >
        {DEVANAGARI_FIXTURE.map((text) => (
          <li
            key={text}
            lang="hi"
            className="rounded-control border border-line bg-bg-1 px-3 py-2 text-body text-text-0"
          >
            {text}
          </li>
        ))}
      </ol>
    </main>
  );
}
