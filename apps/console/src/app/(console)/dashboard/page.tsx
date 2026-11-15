import { t } from "../../../lib/messages";

export default function ConsoleHomePage() {
  return (
    <main id="main" className="mx-auto max-w-content p-4 lg:p-6">
      <h1 className="text-h1 font-medium">{t("placeholder.console.title")}</h1>
      <p className="mt-3 max-w-prose text-body text-text-1">{t("placeholder.console.body")}</p>
    </main>
  );
}
