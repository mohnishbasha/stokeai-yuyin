import Link from "next/link";
import { Banner } from "../../../components/ui/Banner";
import { MarketingPage, Prose } from "../../../components/marketing/MarketingPage";
import { t } from "../../../lib/messages";

/** A placeholder: no benchmark result exists yet (FR-023 AC-2), so no figure is shown. */
export default function BenchmarksPage() {
  return (
    <MarketingPage title={t("site.bench.title")} lead={t("site.bench.lead")}>
      <Prose>{t("site.bench.published")}</Prose>
      <Banner status="info">{t("site.bench.none")}</Banner>
      <Prose>
        {t("site.bench.faq")} <Link href="/faq">{t("site.nav.faq")}</Link>
      </Prose>
    </MarketingPage>
  );
}
