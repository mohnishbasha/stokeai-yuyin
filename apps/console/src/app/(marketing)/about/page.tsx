import Link from "next/link";
import { MarketingPage, Prose } from "../../../components/marketing/MarketingPage";
import { t } from "../../../lib/messages";

export default function AboutPage() {
  return (
    <MarketingPage title={t("site.about.title")} lead={t("site.about.lead")}>
      <Prose>{t("site.about.what")}</Prose>
      <Prose>{t("site.about.why")}</Prose>
      <Prose>{t("site.about.name")}</Prose>
      <Prose>{t("site.about.company")}</Prose>
      <p className="flex flex-wrap gap-4 text-body">
        <Link href="/contact">{t("site.nav.contact")}</Link>
        <Link href="/status">{t("site.nav.status")}</Link>
      </p>
    </MarketingPage>
  );
}
