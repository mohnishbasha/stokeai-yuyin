import { CustomVoiceQueueScreen } from "../../../../components/screens/CustomVoiceQueueScreen";
import { loadScreen, openScreen, type ScreenPageProps } from "../../../../lib/data";

export default async function CustomVoiceQueuePage(props: ScreenPageProps) {
  const { state, data } = await openScreen(props, "custom-voices");
  const result = await loadScreen(state, data, (d) => d.operator.customVoices.queue());
  return <CustomVoiceQueueScreen result={result} />;
}
