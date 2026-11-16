import { LegalPage } from "../../../components/marketing/LegalPage";

// Read LEGAL_DRAFT_BANNER on each request so the owner can turn the banner off without a rebuild.
export const dynamic = "force-dynamic";

export default function AcceptableUsePage() {
  return (
    <LegalPage
      title="site.nav.acceptableUse"
      intro="site.legal.aup.intro"
      headings={["site.legal.aup.h1", "site.legal.aup.h2", "site.legal.aup.h3"]}
    />
  );
}
