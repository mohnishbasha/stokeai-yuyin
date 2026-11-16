import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { fontVariables } from "./fonts";
import { t } from "../lib/messages";
import { THEME_COOKIE, parseTheme } from "../lib/theme";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: { default: t("brand.name"), template: `%s | ${t("brand.name")}` },
  description: t("home.title"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // The stored choice is rendered on the server so there is no flash and no inline script.
  // With no choice, data-theme is omitted and tokens.css follows the OS preference.
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="en" data-theme={theme} className={fontVariables}>
      <body>
        <a
          href="#main"
          className="absolute -top-9 left-4 z-10 rounded-control bg-accent px-3 py-2 text-accent-ink focus:top-2"
        >
          {t("nav.skip")}
        </a>
        {children}
      </body>
    </html>
  );
}
