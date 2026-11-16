import { KeysScreen } from "../../../../components/screens/KeysScreen";
import { loadScreen, openScreen, type ScreenPageProps } from "../../../../lib/data";

export default async function KeysPage(props: ScreenPageProps) {
  const { state, data } = await openScreen(props, "keys");
  const result = await loadScreen(state, data, async (d) => ({
    keys: await d.keys.list(),
    viewer: await d.viewer.get(),
  }));
  return <KeysScreen result={result} />;
}
