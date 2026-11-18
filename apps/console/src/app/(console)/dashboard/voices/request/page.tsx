import { VoiceRequestScreen } from "../../../../../components/screens/VoiceRequestScreen";
import { loadScreen, openScreen, type ScreenPageProps } from "../../../../../lib/data";

export default async function VoiceRequestPage(props: ScreenPageProps) {
  const { state, data } = await openScreen(props, "voice-request");
  const result = await loadScreen(state, data, (d) => d.voices.draft());
  return <VoiceRequestScreen result={result} />;
}
