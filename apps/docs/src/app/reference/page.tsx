import type { Metadata } from "next";
import { PageFrame } from "../../components/PageFrame";
import { ReferenceView } from "../../components/ReferenceView";
import { t } from "../../lib/messages";
import { buildReference, loadOpenApi } from "../../lib/openapi";

export const metadata: Metadata = { title: t("page.reference") };

/** Built from api/openapi.yaml. A file that cannot be documented fails the build (DESIGN 6.4 D2). */
export default function ReferencePage() {
  const reference = buildReference(loadOpenApi());
  return (
    <PageFrame
      href="/reference"
      toc={reference.endpoints.map((e) => ({ id: e.id, text: `${e.method} ${e.path}` }))}
    >
      <h1 className="mb-4 text-h1 font-semibold text-text-0">{t("page.reference")}</h1>
      <ReferenceView reference={reference} />
    </PageFrame>
  );
}
