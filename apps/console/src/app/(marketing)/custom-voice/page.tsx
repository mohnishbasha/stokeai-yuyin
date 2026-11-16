import { LinkButton } from "../../../components/marketing/LinkButton";
import { MarketingPage, Prose, Section } from "../../../components/marketing/MarketingPage";
import { t } from "../../../lib/messages";

export default function CustomVoicePage() {
  return (
    <MarketingPage title={t("site.voicepage.title")} lead={t("site.voicepage.lead")}>
      <Section id="steps" title={t("site.voicepage.steps")}>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-body text-text-1">
          <li>{t("site.voicepage.s1")}</li>
          <li>{t("site.voicepage.s2")}</li>
          <li>{t("site.voicepage.s3")}</li>
          <li>{t("site.voicepage.s4")}</li>
          <li>{t("site.voicepage.s5")}</li>
        </ol>
      </Section>
      <Section id="requirements" title={t("site.voicepage.requirements")}>
        <Prose>{t("site.voicepage.requirementsBody")}</Prose>
      </Section>
      <Section id="not-accepted" title={t("site.voicepage.notAccepted")}>
        <Prose>{t("site.voicepage.notAcceptedBody")}</Prose>
      </Section>
      <Prose>{t("site.voicepage.price")}</Prose>
      <p>
        <LinkButton href="/dashboard" variant="primary">
          {t("site.voicepage.cta")}
        </LinkButton>
      </p>
    </MarketingPage>
  );
}
