import { DemoPanel } from "../../components/marketing/DemoPanel";
import { LinkButton } from "../../components/marketing/LinkButton";
import { MarketingPage, Section } from "../../components/marketing/MarketingPage";
import { CodeBlock } from "../../components/ui/CodeBlock";
import { StaticTable } from "../../components/ui/StaticTable";
import { t, type MessageKey } from "../../lib/messages";
import { buildSpeechSnippets } from "../../lib/snippets";

const ROW_KEYS = [
  ["r1", "site.reads.r1.written", "site.reads.r1.hindi", "site.reads.r1.english"],
  ["r2", "site.reads.r2.written", "site.reads.r2.hindi", "site.reads.r2.english"],
  ["r3", "site.reads.r3.written", "site.reads.r3.hindi", "site.reads.r3.english"],
  ["r4", "site.reads.r4.written", "site.reads.r4.hindi", "site.reads.r4.english"],
] as const satisfies readonly (readonly [string, MessageKey, MessageKey, MessageKey])[];

export default function HomePage() {
  const rows = ROW_KEYS.map(([id, written, hindi, english]) => [
    { key: `${id}-written`, cell: t(written) },
    { key: `${id}-hindi`, cell: <span lang="hi">{t(hindi)}</span> },
    { key: `${id}-english`, cell: <span lang="en">{t(english)}</span> },
  ]);
  const columns = [
    { header: t("site.reads.written") },
    { header: t("site.reads.hindi") },
    { header: t("site.reads.english") },
  ];
  return (
    <MarketingPage title={t("site.home.title")} lead={t("site.home.lead")}>
      <p className="flex flex-wrap gap-3">
        <LinkButton href="/dashboard" variant="primary">
          {t("site.nav.getKey")}
        </LinkButton>
        <LinkButton href="/docs">{t("site.home.quickstart")}</LinkButton>
      </p>
      <DemoPanel />
      <Section id="reads" title={t("site.reads.title")}>
        <p className="text-body text-text-1">{t("site.reads.lead")}</p>
        <StaticTable caption={t("site.reads.caption")} columns={columns} rows={rows} />
      </Section>
      <Section id="code" title={t("site.code.title")}>
        <CodeBlock snippets={buildSpeechSnippets()} />
      </Section>
    </MarketingPage>
  );
}
