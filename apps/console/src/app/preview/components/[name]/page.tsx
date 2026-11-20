import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { previewEnabled } from "../../../../lib/preview";
import { t } from "../../../../lib/messages";
import { PREVIEWS } from "../../registry";

interface Params {
  readonly params: Promise<{ readonly name: string }>;
}

export function generateStaticParams() {
  return PREVIEWS.map((p) => ({ name: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { name } = await params;
  return { title: PREVIEWS.find((p) => p.slug === name)?.title ?? t("preview.title") };
}

export default async function ComponentPreviewPage({ params }: Params) {
  if (!previewEnabled(process.env)) notFound();
  const { name } = await params;
  const preview = PREVIEWS.find((p) => p.slug === name);
  if (preview === undefined) notFound();
  const Demo = preview.Demo;
  return (
    <main id="main" className="mx-auto max-w-content px-4 py-8 lg:px-6 lg:py-9">
      <p>
        <a href="/preview/components">{t("preview.back")}</a>
      </p>
      <h1 className="mt-4 text-h1 font-medium text-text-0">{preview.title}</h1>
      <h2 className="mt-6 text-h3 font-medium text-text-1">{t("preview.states")}</h2>
      <section className="mt-4 max-w-prose rounded-panel border border-line bg-bg-1 p-4">
        <Demo />
      </section>
    </main>
  );
}
