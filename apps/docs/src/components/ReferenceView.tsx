import type { ReactNode } from "react";
import { t } from "../lib/messages";
import type { Endpoint, Field, Reference } from "../lib/openapi";

const TH = "border-b border-line-strong px-3 py-2 font-medium text-text-0";
const TD = "border-b border-line px-3 py-2 align-top text-text-1";

function Table({ children }: { readonly children: ReactNode }) {
  return (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full border-collapse text-left text-small">{children}</table>
    </div>
  );
}

function yesNo(value: boolean): string {
  return value ? t("reference.yes") : t("reference.no");
}

function FieldTable({ fields, withLocation }: { readonly fields: readonly Field[]; readonly withLocation: boolean }) {
  return (
    <Table>
      <thead>
        <tr>
          <th className={TH}>{t("reference.col.name")}</th>
          {withLocation && <th className={TH}>{t("reference.col.in")}</th>}
          <th className={TH}>{t("reference.col.type")}</th>
          <th className={TH}>{t("reference.col.required")}</th>
          <th className={TH}>{t("reference.col.description")}</th>
        </tr>
      </thead>
      <tbody>
        {fields.map((field) => (
          <tr key={`${field.in}:${field.name}`}>
            <td className={TD}>
              <code>{field.name}</code>
            </td>
            {withLocation && <td className={TD}>{field.in}</td>}
            <td className={TD}>{field.type}</td>
            <td className={TD}>{yesNo(field.required)}</td>
            <td className={TD}>{field.description}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function EndpointView({ endpoint }: { readonly endpoint: Endpoint }) {
  return (
    <section id={endpoint.id} aria-labelledby={`${endpoint.id}-title`} className="mb-8 scroll-mt-5">
      <h2 id={`${endpoint.id}-title`} className="mb-2 text-h2 font-semibold text-text-0">
        <code>
          {endpoint.method} {endpoint.path}
        </code>
        {endpoint.deprecated && (
          <span className="ml-3 rounded-control border border-warn px-2 text-small text-warn">
            {t("reference.deprecated")}
          </span>
        )}
      </h2>
      <p className="mb-2 max-w-prose text-text-0">{endpoint.summary}</p>
      {endpoint.description !== "" && (
        <p className="mb-4 max-w-prose whitespace-pre-line text-text-1">{endpoint.description}</p>
      )}
      {endpoint.parameters.length > 0 && (
        <>
          <h3 className="mb-2 text-h3 font-semibold text-text-0">{t("reference.parameters")}</h3>
          <FieldTable fields={endpoint.parameters} withLocation />
        </>
      )}
      {endpoint.requestFields.length > 0 && (
        <>
          <h3 className="mb-2 text-h3 font-semibold text-text-0">{t("reference.requestBody")}</h3>
          <details className="mb-4">
            <summary className="cursor-pointer text-small text-accent">
              {t("reference.requestBodyExpand")}
            </summary>
            <FieldTable fields={endpoint.requestFields} withLocation={false} />
          </details>
        </>
      )}
      <h3 className="mb-2 text-h3 font-semibold text-text-0">{t("reference.responses")}</h3>
      <Table>
        <thead>
          <tr>
            <th className={TH}>{t("reference.col.code")}</th>
            <th className={TH}>{t("reference.col.meaning")}</th>
            <th className={TH}>{t("reference.col.retry")}</th>
          </tr>
        </thead>
        <tbody>
          {endpoint.responses.map((response) => (
            <tr key={response.code}>
              <td className={TD}>
                <code>{response.code}</code>
              </td>
              <td className={TD}>{response.description}</td>
              <td className={TD}>{response.retry === "" ? t("reference.retry.ok") : response.retry}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <h3 className="mb-2 text-h3 font-semibold text-text-0">{t("reference.example")}</h3>
      <pre
        tabIndex={0}
        className="mb-4 overflow-x-auto rounded-panel border border-line bg-bg-1 p-4 text-text-0"
      >
        <code>{endpoint.example}</code>
      </pre>
    </section>
  );
}

export function ReferenceView({ reference }: { readonly reference: Reference }) {
  return (
    <>
      <p className="mb-4 max-w-prose text-text-1">{t("reference.intro")}</p>
      <h2 className="mb-2 text-h3 font-semibold text-text-0">{t("reference.servers")}</h2>
      <ul className="mb-7 list-disc pl-5 text-text-1">
        {reference.servers.map((server) => (
          <li key={server.url}>
            <code>{server.url}</code> {server.description}
          </li>
        ))}
      </ul>
      {reference.endpoints.map((endpoint) => (
        <EndpointView key={endpoint.id} endpoint={endpoint} />
      ))}
    </>
  );
}
