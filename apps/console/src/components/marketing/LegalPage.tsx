import { legalDraftBannerOn } from "../../lib/site";
import { t, type MessageKey } from "../../lib/messages";
import { Banner } from "../ui/Banner";
import { MarketingPage, Prose, Section } from "./MarketingPage";

export interface LegalPageProps {
  readonly title: MessageKey;
  readonly intro: MessageKey;
  readonly headings: readonly [MessageKey, MessageKey, MessageKey];
}

/** A legal stub (DESIGN M8 to M11). The draft banner stays on until the owner sets `off`. */
export function LegalPage({ title, intro, headings }: LegalPageProps) {
  return (
    <MarketingPage title={t(title)} lead={t(intro)}>
      {legalDraftBannerOn() ? <Banner status="warn">{t("site.legal.draft")}</Banner> : null}
      <Prose>{t("site.legal.status")}</Prose>
      {headings.map((heading, index) => (
        <Section key={heading} id={`section-${String(index + 1)}`} title={t(heading)}>
          <Prose>{t("site.legal.stub")}</Prose>
        </Section>
      ))}
    </MarketingPage>
  );
}
