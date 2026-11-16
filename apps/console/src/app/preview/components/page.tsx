import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { previewEnabled } from "../../../lib/preview";
import { t } from "../../../lib/messages";
import { PREVIEWS } from "../registry";

export const metadata: Metadata = { title: t("preview.title") };

export default function PreviewIndexPage() {
  if (!previewEnabled(process.env)) notFound();
  return (
    <main id="main" className="mx-auto max-w-content px-4 py-8 lg:px-6 lg:py-9">
      <h1 className="text-h1 font-medium text-text-0">{t("preview.title")}</h1>
      <p className="mt-4 max-w-prose text-body text-text-1">{t("preview.lead")}</p>
      <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ...PREVIEWS.map((p) => ({ slug: p.slug, title: p.title })),
          { slug: "pulse-line", title: "PulseLine" },
        ].map((item) => (
          <li key={item.slug}>
            <a href={`/preview/components/${item.slug}`}>{item.title}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
