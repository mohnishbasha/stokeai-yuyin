import { LegalPage } from "../../../components/marketing/LegalPage";

// Read LEGAL_DRAFT_BANNER on each request so the owner can turn the banner off without a rebuild.
export const dynamic = "force-dynamic";

export default function TermsPage() {
  return (
    <LegalPage
      title="site.nav.terms"
      intro="site.legal.terms.intro"
      headings={["site.legal.terms.h1", "site.legal.terms.h2", "site.legal.terms.h3"]}
    />
  );
}
