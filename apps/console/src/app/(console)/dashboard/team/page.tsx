import { TeamScreen } from "../../../../components/screens/TeamScreen";
import { loadScreen, openScreen, type ScreenPageProps } from "../../../../lib/data";

export default async function TeamPage(props: ScreenPageProps) {
  const { state, data } = await openScreen(props, "team");
  const result = await loadScreen(state, data, async (d) => ({
    members: await d.team.list(),
    viewer: await d.viewer.get(),
  }));
  return <TeamScreen result={result} />;
}
