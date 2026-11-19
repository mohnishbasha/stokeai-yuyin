import { LedgerAdjustmentsScreen } from "../../../../components/screens/LedgerAdjustmentsScreen";
import { loadScreen, openScreen, type ScreenPageProps } from "../../../../lib/data";

export default async function LedgerAdjustmentsPage(props: ScreenPageProps) {
  const { state, data } = await openScreen(props, "ledger-adjustments");
  const result = await loadScreen(state, data, (d) => d.operator.ledger.overview());
  return <LedgerAdjustmentsScreen result={result} />;
}
