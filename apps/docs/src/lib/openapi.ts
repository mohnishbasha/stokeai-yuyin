// API reference model, generated from api/openapi.yaml (FR-024, DESIGN 6.4 D2). Runs at build
// time only. Any problem with the file throws OpenApiError, which fails the docs build.
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { t } from "./messages";
import { openApiPath } from "./paths";
import { slugify } from "./slug";

export type Json = Record<string, unknown>;

export class OpenApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenApiError";
  }
}

export interface Field {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly description: string;
  /** Parameter location (query, path, header); empty for body fields. */
  readonly in: string;
}

export interface ResponseRow {
  readonly code: string;
  readonly description: string;
  readonly contentTypes: readonly string[];
  /** Retry rule for error codes (400 and above); empty otherwise. */
  readonly retry: string;
}

export interface Endpoint {
  readonly id: string;
  readonly method: string;
  readonly path: string;
  readonly operationId: string;
  readonly tag: string;
  readonly summary: string;
  readonly description: string;
  readonly deprecated: boolean;
  readonly parameters: readonly Field[];
  readonly requestFields: readonly Field[];
  readonly requestContentTypes: readonly string[];
  readonly responses: readonly ResponseRow[];
  readonly example: string;
}

export interface Reference {
  readonly title: string;
  readonly version: string;
  readonly summary: string;
  readonly servers: readonly { readonly url: string; readonly description: string }[];
  readonly endpoints: readonly Endpoint[];
}

const METHODS = ["get", "put", "post", "delete", "options", "head", "patch"] as const;
const MAX_REF_DEPTH = 32;
const MAX_FIELD_DEPTH = 6;
const ERROR_STATUS_FLOOR = 400;
const STATUS_PAYMENT_REQUIRED = 402;
const RETRY_AFTER_STATUSES = [429, 503];

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Parses and sanity-checks an OpenAPI 3.1 document. */
export function parseOpenApi(text: string): Json {
  const doc: unknown = parse(text);
  if (!isRecord(doc)) throw new OpenApiError("OpenAPI file is not a YAML mapping");
  const version = doc["openapi"];
  if (typeof version !== "string" || !version.startsWith("3.1")) {
    throw new OpenApiError(`expected OpenAPI 3.1, found ${String(version)}`);
  }
  return doc;
}

export function loadOpenApi(file: string = openApiPath()): Json {
  return parseOpenApi(readFileSync(file, "utf8"));
}

/** Follows `$ref` chains within the document. Throws when a reference does not resolve. */
function deref(root: Json, node: unknown, depth = 0): unknown {
  if (!isRecord(node) || typeof node["$ref"] !== "string") return node;
  const ref = node["$ref"];
  if (depth > MAX_REF_DEPTH) throw new OpenApiError(`$ref chain too deep at ${ref}`);
  if (!ref.startsWith("#/")) throw new OpenApiError(`unsupported $ref ${ref}`);
  let current: unknown = root;
  for (const part of ref.slice(2).split("/")) {
    const key = part.replaceAll("~1", "/").replaceAll("~0", "~");
    if (!isRecord(current) || !(key in current)) {
      throw new OpenApiError(`unresolved $ref ${ref}`);
    }
    current = current[key];
  }
  return deref(root, current, depth + 1);
}

function typeLabel(root: Json, schema: Json): string {
  const type = schema["type"];
  const base = Array.isArray(type) ? type.map(String).join(" or ") : str(type);
  if (base === "array") {
    const items = deref(root, schema["items"]);
    return `${isRecord(items) ? typeLabel(root, items) : "any"}[]`;
  }
  const format = str(schema["format"]);
  const label = base === "" ? "object" : base;
  return format === "" ? label : `${label} (${format})`;
}

function notes(schema: Json): string {
  const parts: string[] = [];
  const description = str(schema["description"]).trim();
  if (description !== "") parts.push(description);
  const values = schema["enum"];
  if (Array.isArray(values)) parts.push(`One of: ${values.map(String).join(", ")}.`);
  if ("default" in schema) parts.push(`Default: ${String(schema["default"])}.`);
  const min = schema["minimum"];
  const max = schema["maximum"];
  if (typeof min === "number" && typeof max === "number") parts.push(`Range: ${String(min)} to ${String(max)}.`);
  const minLength = schema["minLength"];
  const maxLength = schema["maxLength"];
  if (typeof minLength === "number" && typeof maxLength === "number") {
    parts.push(`Length: ${String(minLength)} to ${String(maxLength)}.`);
  }
  return parts.join(" ");
}

/** Flattens an object schema into rows, with dotted names for nested objects. */
function fieldsOf(root: Json, node: unknown, prefix = "", depth = 0): Field[] {
  const schema = deref(root, node);
  if (!isRecord(schema) || depth > MAX_FIELD_DEPTH) return [];
  const properties = deref(root, schema["properties"]);
  if (!isRecord(properties)) return [];
  const required = Array.isArray(schema["required"]) ? schema["required"].map(String) : [];
  return Object.entries(properties).flatMap(([name, raw]) => {
    const property = deref(root, raw);
    if (!isRecord(property)) return [];
    const row: Field = {
      name: `${prefix}${name}`,
      type: typeLabel(root, property),
      required: required.includes(name),
      description: notes(property),
      in: "",
    };
    const items = deref(root, property["items"]);
    const nested = isRecord(items) && isRecord(items["properties"]) ? `${prefix}${name}[].` : `${prefix}${name}.`;
    const target = isRecord(items) && isRecord(items["properties"]) ? items : property;
    return [row, ...fieldsOf(root, target, nested, depth + 1)];
  });
}

function jsonSchema(root: Json, content: unknown): unknown {
  const body = deref(root, content);
  if (!isRecord(body)) return undefined;
  const json = deref(root, body["application/json"]);
  return isRecord(json) ? json["schema"] : undefined;
}

function retryRule(code: string): string {
  const status = Number(code);
  if (!Number.isInteger(status) || status < ERROR_STATUS_FLOOR) return "";
  if (status === STATUS_PAYMENT_REQUIRED) return t("reference.retry.credit");
  if (RETRY_AFTER_STATUSES.includes(status)) return t("reference.retry.after");
  return t("reference.retry.none");
}

function parametersOf(root: Json, ...lists: unknown[]): Field[] {
  return lists.flatMap((list) => {
    if (!Array.isArray(list)) return [];
    return list.flatMap((raw: unknown) => {
      const parameter = deref(root, raw);
      if (!isRecord(parameter)) return [];
      const schema = deref(root, parameter["schema"]);
      const detail = isRecord(schema) ? schema : {};
      const description = [str(parameter["description"]).trim(), notes({ ...detail, description: "" })]
        .filter((part) => part !== "")
        .join(" ");
      return [
        {
          name: str(parameter["name"]),
          type: typeLabel(root, detail),
          required: parameter["required"] === true,
          description,
          in: str(parameter["in"]),
        },
      ];
    });
  });
}

function exampleFor(method: string, path: string, serverUrl: string, hasBody: boolean): string {
  const auth = `  -H "Authorization: Bearer $YUYIN_API_KEY"`;
  const head = `curl -X ${method} "${serverUrl}${path}" \\`;
  if (!hasBody) return [head, auth].join("\n");
  return [head, `${auth} \\`, `  -H "Content-Type: application/json" \\`, "  -d @request.json"].join("\n");
}

function endpointOf(root: Json, path: string, method: string, item: Json, operation: Json, serverUrl: string): Endpoint {
  const operationId = str(operation["operationId"]);
  const body = deref(root, operation["requestBody"]);
  const bodyContent = isRecord(body) ? deref(root, body["content"]) : undefined;
  const responses = deref(root, operation["responses"]);
  const tags = operation["tags"];
  const rows: ResponseRow[] = isRecord(responses)
    ? Object.entries(responses)
        .map(([code, raw]) => {
          const response = deref(root, raw);
          const detail = isRecord(response) ? response : {};
          const content = deref(root, detail["content"]);
          return {
            code,
            description: str(detail["description"]).trim(),
            contentTypes: isRecord(content) ? Object.keys(content) : [],
            retry: retryRule(code),
          };
        })
        .sort((a, b) => a.code.localeCompare(b.code))
    : [];
  const upper = method.toUpperCase();
  return {
    id: slugify(operationId === "" ? `${method}-${path}` : operationId),
    method: upper,
    path,
    operationId,
    tag: Array.isArray(tags) ? str(tags[0]) : "",
    summary: str(operation["summary"]).trim(),
    description: str(operation["description"]).trim(),
    deprecated: operation["deprecated"] === true,
    parameters: parametersOf(root, item["parameters"], operation["parameters"]),
    requestFields: fieldsOf(root, jsonSchema(root, bodyContent)),
    requestContentTypes: isRecord(bodyContent) ? Object.keys(bodyContent) : [],
    responses: rows,
    example: exampleFor(upper, path, serverUrl, isRecord(bodyContent)),
  };
}

/** Builds the reference model. Throws OpenApiError when the document cannot be documented. */
export function buildReference(root: Json): Reference {
  const paths = root["paths"];
  if (!isRecord(paths) || Object.keys(paths).length === 0) {
    throw new OpenApiError("OpenAPI file has no paths");
  }
  const info = isRecord(root["info"]) ? root["info"] : {};
  const servers = Array.isArray(root["servers"])
    ? root["servers"].filter(isRecord).map((s) => ({ url: str(s["url"]), description: str(s["description"]) }))
    : [];
  const serverUrl = servers[0]?.url ?? "";
  const endpoints = Object.entries(paths).flatMap(([path, rawItem]) => {
    const item = deref(root, rawItem);
    if (!isRecord(item)) throw new OpenApiError(`path ${path} is not a mapping`);
    return METHODS.flatMap((method) => {
      const operation = item[method];
      if (!isRecord(operation)) return [];
      return [endpointOf(root, path, method, item, operation, serverUrl)];
    });
  });
  if (endpoints.length === 0) throw new OpenApiError("OpenAPI file has no operations");
  return {
    title: str(info["title"]),
    version: str(info["version"]),
    summary: str(info["summary"]),
    servers,
    endpoints,
  };
}
