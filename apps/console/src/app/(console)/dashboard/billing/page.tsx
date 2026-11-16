import { BillingScreen } from "../../../../components/screens/BillingScreen";
import { loadScreen, openScreen, type ScreenPageProps } from "../../../../lib/data";

export default async function BillingPage(props: ScreenPageProps) {
  const { state, data } = await openScreen(props, "billing");
  const result = await loadScreen(state, data, async (d) => ({
    overview: await d.billing.overview(),
    viewer: await d.viewer.get(),
  }));
  return <BillingScreen result={result} />;
}
