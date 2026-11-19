import { OrganizationsScreen } from "../../../../components/screens/OrganizationsScreen";
import { loadScreen, openScreen, type ScreenPageProps } from "../../../../lib/data";

export default async function OrganizationsPage(props: ScreenPageProps) {
  const { state, data } = await openScreen(props, "organizations");
  const result = await loadScreen(state, data, (d) => d.operator.orgs.list());
  return <OrganizationsScreen result={result} />;
}
