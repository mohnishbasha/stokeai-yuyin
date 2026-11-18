import Link from "next/link";
import { Banner } from "../../../components/ui/Banner";
import { t } from "../../../lib/messages";
import { CONSOLE_SCREENS } from "../../../lib/screens";

/** The console overview: one link per screen, and a note that the data is sample data. */
export default function ConsoleHomePage() {
  return (
    <main id="main" className="mx-auto flex max-w-content flex-col gap-5 p-4 lg:p-6">
      <h1 className="text-h1 font-medium text-text-0">{t("screen.home.title")}</h1>
      <Banner status="info">{t("screen.home.mockNotice")}</Banner>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CONSOLE_SCREENS.map((def) => (
          <li key={def.id} className="rounded-panel border border-line bg-bg-1 p-4">
            <Link href={def.href} className="text-body font-medium text-text-0 underline">
              {t(def.titleKey)}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
