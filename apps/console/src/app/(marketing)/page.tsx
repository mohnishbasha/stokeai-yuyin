import Link from "next/link";
import { t } from "../../lib/messages";

export default function HomePage() {
  return (
    <main id="main" className="mx-auto max-w-content px-4 py-8 lg:px-6 lg:py-9">
      <h1 className="max-w-prose text-h1 font-medium text-text-0 lg:text-display">
        {t("home.title")}
      </h1>
      <p className="mt-4 max-w-prose text-body text-text-1">{t("home.lead")}</p>
      <section
        aria-labelledby="sample-heading"
        className="mt-7 max-w-prose rounded-panel border border-line bg-bg-1 p-4"
      >
        <h2 id="sample-heading" className="text-small font-medium text-text-1">
          {t("home.sampleLabel")}
        </h2>
        <p lang="hi" className="mt-2 text-h3 text-text-0">
          {t("home.sampleHi")}
        </p>
        <p lang="en" className="mt-2 text-h3 text-text-0">
          {t("home.sampleEn")}
        </p>
      </section>
      <p className="mt-6">
        <Link
          href="/dashboard"
          className="inline-flex min-h-(--control-height) items-center rounded-control bg-accent px-4 text-body font-medium text-accent-ink no-underline"
        >
          {t("home.cta")}
        </Link>
      </p>
    </main>
  );
}
