import { PlaygroundScreen } from "../../../../components/screens/PlaygroundScreen";
import { loadScreen, openScreen, type ScreenPageProps } from "../../../../lib/data";

export default async function PlaygroundPage(props: ScreenPageProps) {
  const { state, data } = await openScreen(props, "playground");
  const result = await loadScreen(state, data, async (d) => ({
    context: await d.playground.context(),
    voices: await d.voices.list(),
  }));
  return <PlaygroundScreen result={result} />;
}
