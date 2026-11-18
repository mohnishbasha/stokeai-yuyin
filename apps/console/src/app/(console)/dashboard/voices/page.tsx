import { VoicesScreen } from "../../../../components/screens/VoicesScreen";
import { loadScreen, openScreen, type ScreenPageProps } from "../../../../lib/data";

export default async function VoicesPage(props: ScreenPageProps) {
  const { state, data } = await openScreen(props, "voices");
  const result = await loadScreen(state, data, async (d) => ({
    voices: await d.voices.list(),
    custom: await d.voices.custom(),
    sampleFails: state === "sample-error",
  }));
  return <VoicesScreen result={result} />;
}
