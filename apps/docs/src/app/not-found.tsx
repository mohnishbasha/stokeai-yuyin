import Link from "next/link";
import { t } from "../lib/messages";
import { PAGES } from "../lib/nav";

export default function NotFound() {
  return (
    <>
      <h1 className="mb-4 text-h1 font-semibold text-text-0">{t("notfound.title")}</h1>
      <p className="mb-4 text-text-1">{t("notfound.body")}</p>
      <ul className="list-disc pl-5">
        {PAGES.map((page) => (
          <li key={page.href}>
            <Link href={page.href}>{page.title}</Link>
          </li>
        ))}
      </ul>
    </>
  );
}
