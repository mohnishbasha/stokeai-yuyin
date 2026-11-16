import Link from "next/link";
import { LinkButton } from "../../../components/marketing/LinkButton";
import { MarketingPage, Prose, Section } from "../../../components/marketing/MarketingPage";
import { StaticTable } from "../../../components/ui/StaticTable";
import { countCodePoints } from "../../../lib/count";
import { t, tf } from "../../../lib/messages";
import { formatMicroUsd } from "../../../lib/money";
import { loadPricing, type Pricing } from "../../../lib/pricing";

function Card({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-panel border border-line bg-bg-1 p-4">
      <h2 className="text-h3 font-medium text-text-0">{title}</h2>
      {children}
    </div>
  );
}

function Cards({ pricing }: { readonly pricing: Pricing }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <Card title={t("site.pricing.payg")}>
        <ul className="flex flex-col gap-1">
          {Object.entries(pricing.rates).map(([format, rate]) => (
            <li key={format} className="text-body text-text-0">
              <span className="font-medium">{format.toUpperCase()}</span>{" "}
              <span className="font-mono text-mono tabular-nums">
                {tf("site.pricing.rate", {
                  rate: formatMicroUsd(rate, { exact: true }),
                  unit: pricing.unitCharacters,
                })}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-body text-text-1">
          {tf("site.pricing.minTopUp", { amount: formatMicroUsd(pricing.minTopUpMicroUsd) })}
        </p>
        <p className="text-body text-text-1">
          {tf("site.pricing.grant", {
            signups: pricing.launchGrant.verifiedSignups,
            characters: pricing.launchGrant.characters,
          })}
        </p>
        <p>
          <LinkButton href="/dashboard" variant="primary">
            {t("site.nav.getKey")}
          </LinkButton>
        </p>
      </Card>
      <Card title={t("site.pricing.selfhost")}>
        <p className="text-body text-text-1">{t("site.pricing.selfhostBody")}</p>
        <p>
          <LinkButton href="/contact">{t("site.pricing.contactUs")}</LinkButton>
        </p>
      </Card>
    </div>
  );
}

export default function PricingPage() {
  const pricing = loadPricing();
  const examples = [t("site.pricing.exampleHi"), t("site.pricing.exampleEn")].map((text) => [
    { key: `${text}-text`, cell: text },
    { key: `${text}-count`, cell: countCodePoints(text) },
  ]);
  const columns = [
    { header: t("site.pricing.exampleText") },
    { header: t("site.pricing.exampleCount"), numeric: true },
  ];
  return (
    <MarketingPage title={t("site.pricing.title")} lead={t("site.pricing.lead")}>
      {pricing === undefined ? (
        <Section id="unpublished" title={t("site.pricing.unpublished")}>
          <Prose>{t("site.pricing.unpublishedBody")}</Prose>
          <p>
            <LinkButton href="/contact">{t("site.pricing.contactUs")}</LinkButton>
          </p>
        </Section>
      ) : (
        <Cards pricing={pricing} />
      )}
      <Section id="counted" title={t("site.pricing.counted")}>
        <Prose>{t("site.pricing.countedBody")}</Prose>
        <StaticTable caption={t("site.pricing.exampleCaption")} columns={columns} rows={examples} />
      </Section>
      <p className="flex flex-wrap gap-4 text-body">
        <Link href="/refunds">{t("site.pricing.refunds")}</Link>
        <Link href="/faq">{t("site.pricing.faq")}</Link>
      </p>
    </MarketingPage>
  );
}
