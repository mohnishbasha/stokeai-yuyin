import type { Metadata } from "next";
import { SignInForm } from "../../../components/SignInForm";
import { t } from "../../../lib/messages";

export const metadata: Metadata = { title: t("auth.signin.title"), robots: { index: false } };

type Params = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  return v !== undefined && v.length > 0 ? v : null;
}

export default async function SignInPage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  return (
    <main id="main" className="mx-auto max-w-content p-4 lg:p-6">
      <h1 className="text-h1 font-medium">{t("auth.signin.title")}</h1>
      <p className="mt-3 max-w-prose text-body text-text-1">{t("auth.signin.lead")}</p>
      <SignInForm token={first(params.token)} failed={first(params.error) !== null} />
      <p className="mt-5 max-w-prose text-small text-text-2">{t("auth.signin.noAccount")}</p>
    </main>
  );
}
