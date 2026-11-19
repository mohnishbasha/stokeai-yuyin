import { AuditScreen } from "../../../../components/screens/AuditScreen";
import { loadScreen, openScreen, type ScreenPageProps } from "../../../../lib/data";

export default async function AuditPage(props: ScreenPageProps) {
  const { state, data } = await openScreen(props, "audit");
  const result = await loadScreen(state, data, (d) => d.operator.audit.entries());
  return <AuditScreen result={result} />;
}
