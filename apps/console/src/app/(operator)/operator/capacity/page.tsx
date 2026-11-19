import { CapacityScreen } from "../../../../components/screens/CapacityScreen";
import { loadScreen, openScreen, type ScreenPageProps } from "../../../../lib/data";

export default async function CapacityPage(props: ScreenPageProps) {
  const { state, data } = await openScreen(props, "capacity");
  const result = await loadScreen(state, data, (d) => d.operator.fleet.capacity());
  return <CapacityScreen result={result} />;
}
