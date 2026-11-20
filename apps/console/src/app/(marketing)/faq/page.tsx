import { FaqList, type FaqItem } from "../../../components/marketing/FaqList";
import { MarketingPage } from "../../../components/marketing/MarketingPage";
import { t } from "../../../lib/messages";

const ITEMS: readonly FaqItem[] = [
  { question: "site.faq.q1", answer: "site.faq.a1" },
  { question: "site.faq.q2", answer: "site.faq.a2" },
  { question: "site.faq.q3", answer: "site.faq.a3" },
  { question: "site.faq.q4", answer: "site.faq.a4" },
  { question: "site.faq.q5", answer: "site.faq.a5" },
  { question: "site.faq.q6", answer: "site.faq.a6" },
];

export default function FaqPage() {
  return (
    <MarketingPage title={t("site.faq.title")}>
      <FaqList items={ITEMS} />
    </MarketingPage>
  );
}
