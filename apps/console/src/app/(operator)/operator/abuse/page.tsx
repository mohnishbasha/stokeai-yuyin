import { AbuseScreen } from "../../../../components/screens/AbuseScreen";
import { loadScreen, openScreen, type ScreenPageProps } from "../../../../lib/data";

export default async function AbusePage(props: ScreenPageProps) {
  const { state, data } = await openScreen(props, "abuse");
  const result = await loadScreen(state, data, (d) => d.operator.abuse.cases());
  return <AbuseScreen result={result} />;
}
