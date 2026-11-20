import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { SiteFooter } from "../../components/marketing/SiteFooter";
import { SiteHeader } from "../../components/marketing/SiteHeader";
import { THEME_COOKIE, parseTheme } from "../../lib/theme";

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <>
      <SiteHeader theme={theme} />
      {children}
      <SiteFooter />
    </>
  );
}
