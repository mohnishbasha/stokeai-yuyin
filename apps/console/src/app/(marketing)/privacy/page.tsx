import { LegalPage } from "../../../components/marketing/LegalPage";

// Read LEGAL_DRAFT_BANNER on each request so the owner can turn the banner off without a rebuild.
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="site.nav.privacy"
      intro="site.legal.privacy.intro"
      headings={["site.legal.privacy.h1", "site.legal.privacy.h2", "site.legal.privacy.h3"]}
    />
  );
}
