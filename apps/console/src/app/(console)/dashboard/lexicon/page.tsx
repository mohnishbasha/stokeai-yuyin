import { LexiconScreen } from "../../../../components/screens/LexiconScreen";
import { loadScreen, openScreen, type ScreenPageProps } from "../../../../lib/data";

export default async function LexiconPage(props: ScreenPageProps) {
  const { state, data } = await openScreen(props, "lexicon");
  const result = await loadScreen(state, data, async (d) => ({
    overview: await d.lexicon.overview(),
    viewer: await d.viewer.get(),
  }));
  return <LexiconScreen result={result} />;
}
