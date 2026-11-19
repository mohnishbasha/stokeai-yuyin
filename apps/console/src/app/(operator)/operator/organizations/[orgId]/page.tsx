import { OrganizationScreen } from "../../../../../components/screens/OrganizationScreen";
import { loadScreen, openScreen, type ScreenPageProps } from "../../../../../lib/data";

interface OrganizationPageProps extends ScreenPageProps {
  readonly params: Promise<{ readonly orgId: string }>;
}

export default async function OrganizationPage(props: OrganizationPageProps) {
  const { orgId } = await props.params;
  const { state, data } = await openScreen(props, "organization");
  const result = await loadScreen(state, data, (d) => d.operator.orgs.get(orgId));
  return <OrganizationScreen result={result} />;
}
