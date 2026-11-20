import { OnboardingScreen } from "../../../../components/screens/OnboardingScreen";
import { loadScreen, openScreen, type ScreenPageProps } from "../../../../lib/data";

export default async function OnboardingPage(props: ScreenPageProps) {
  const { state, data } = await openScreen(props, "onboarding");
  const result = await loadScreen(state, data, (d) => d.onboarding.progress());
  return <OnboardingScreen result={result} />;
}
