import { MarketingPage, Prose } from "../../../components/marketing/MarketingPage";
import { t, type MessageKey } from "../../../lib/messages";
import { CONTACT_EMAIL } from "../../../lib/site";

const TOPICS: readonly MessageKey[] = [
  "site.contact.sales",
  "site.contact.support",
  "site.contact.security",
  "site.contact.privacy",
];

export default function ContactPage() {
  return (
    <MarketingPage title={t("site.contact.title")} lead={t("site.contact.lead")}>
      <ul className="flex max-w-prose flex-col gap-3">
        {TOPICS.map((topic) => (
          <li key={topic} className="flex flex-col text-body">
            <span className="font-medium text-text-0">{t(topic)}</span>
            <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t(topic))}`}>
              {CONTACT_EMAIL}
            </a>
          </li>
        ))}
      </ul>
      <Prose>{t("site.contact.note")}</Prose>
    </MarketingPage>
  );
}
