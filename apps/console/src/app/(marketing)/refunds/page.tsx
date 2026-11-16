import { LegalPage } from "../../../components/marketing/LegalPage";

// Read LEGAL_DRAFT_BANNER on each request so the owner can turn the banner off without a rebuild.
export const dynamic = "force-dynamic";

export default function RefundsPage() {
  return (
    <LegalPage
      title="site.nav.refunds"
      intro="site.legal.refunds.intro"
      headings={["site.legal.refunds.h1", "site.legal.refunds.h2", "site.legal.refunds.h3"]}
    />
  );
}
