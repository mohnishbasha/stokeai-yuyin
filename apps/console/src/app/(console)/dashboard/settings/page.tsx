import { SettingsScreen } from "../../../../components/screens/SettingsScreen";
import { loadScreen, openScreen, type ScreenPageProps } from "../../../../lib/data";

export default async function SettingsPage(props: ScreenPageProps) {
  const { state, data } = await openScreen(props, "settings");
  const result = await loadScreen(state, data, async (d) => ({
    settings: await d.settings.get(),
    voices: await d.voices.list(),
  }));
  return <SettingsScreen result={result} />;
}
