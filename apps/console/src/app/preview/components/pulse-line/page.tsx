import type { Metadata } from "next";
import { t } from "../../../../lib/messages";
import { PulseLineDemo } from "./demo";

export const metadata: Metadata = { title: t("preview.pulse.title") };

export default function PulseLinePreviewPage() {
  return (
    <main id="main" className="mx-auto max-w-content px-4 py-8 lg:px-6 lg:py-9">
      <h1 className="text-h1 font-medium text-text-0">{t("preview.pulse.title")}</h1>
      <p className="mt-4 max-w-prose text-body text-text-1">{t("preview.pulse.lead")}</p>
      <section className="mt-6 max-w-prose rounded-panel border border-line bg-bg-1 p-4">
        <PulseLineDemo />
      </section>
    </main>
  );
}
