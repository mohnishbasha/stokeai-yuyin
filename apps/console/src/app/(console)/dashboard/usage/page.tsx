import { UsageScreen } from "../../../../components/screens/UsageScreen";
import { loadScreen, openScreen, type ScreenPageProps } from "../../../../lib/data";

export default async function UsagePage(props: ScreenPageProps) {
  const { state, data } = await openScreen(props, "usage");
  const result = await loadScreen(state, data, (d) => d.usage.summary());
  return <UsageScreen result={result} />;
}
