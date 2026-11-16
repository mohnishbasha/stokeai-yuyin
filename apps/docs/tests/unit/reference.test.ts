// DC-01 contract_docs_reference_buildfromopenapi_succeeds
// DC-02 contract_docs_reference_invalidopenapi_failsbuild
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildReference, loadOpenApi, parseOpenApi } from "../../src/lib/openapi";

const SPEC = join(import.meta.dirname, "../../../../api/openapi.yaml");
const METHODS = ["get", "post", "put", "patch", "delete"];

describe("API reference from api/openapi.yaml", () => {
  it("test_reference_build_realspec_succeeds", () => {
    const reference = buildReference(loadOpenApi(SPEC));
    expect(reference.title).toBe("Yuyin API");
    expect(reference.endpoints.length).toBeGreaterThan(0);
  });

  it("test_reference_build_everypathandmethod_islisted", () => {
    const spec = loadOpenApi(SPEC);
    const reference = buildReference(spec);
    const listed = reference.endpoints.map((e) => `${e.method} ${e.path}`).sort();
    const paths = spec["paths"] as Record<string, Record<string, unknown>>;
    const expected = Object.entries(paths)
      .flatMap(([path, item]) =>
        Object.keys(item)
          .filter((m) => METHODS.includes(m))
          .map((m) => `${m.toUpperCase()} ${path}`),
      )
      .sort();
    expect(listed).toEqual(expected);
  });

  it("test_reference_build_errorresponses_listedwithretryrule", () => {
    const speech = buildReference(loadOpenApi(SPEC)).endpoints.find(
      (e) => e.operationId === "createSpeech",
    );
    const codes = speech?.responses.map((r) => r.code) ?? [];
    for (const code of ["200", "400", "401", "402", "403", "413", "422", "429", "503"]) {
      expect(codes).toContain(code);
    }
    const rate = speech?.responses.find((r) => r.code === "429");
    expect(rate?.retry).toMatch(/Retry-After/);
    const bad = speech?.responses.find((r) => r.code === "400");
    expect(bad?.retry).toMatch(/Do not retry/);
  });

  it("test_reference_build_requestbody_resolvesrefsintofields", () => {
    const speech = buildReference(loadOpenApi(SPEC)).endpoints.find(
      (e) => e.operationId === "createSpeech",
    );
    const text = speech?.requestFields.find((f) => f.name === "text");
    expect(text?.required).toBe(true);
    expect(speech?.requestFields.map((f) => f.name)).toContain("pace");
  });

  it("test_reference_build_missingpaths_throws", () => {
    expect(() =>
      buildReference(parseOpenApi("openapi: 3.1.0\ninfo: {title: t, version: '1'}\n")),
    ).toThrow(/paths/);
  });

  it("test_reference_build_unresolvedref_throws", () => {
    const yaml = [
      "openapi: 3.1.0",
      "info: {title: t, version: '1'}",
      "paths:",
      "  /x:",
      "    get:",
      "      responses:",
      '        "200":',
      '          $ref: "#/components/responses/Missing"',
    ].join("\n");
    expect(() => buildReference(parseOpenApi(yaml))).toThrow(/Missing/);
  });

  it("test_reference_parse_notopenapi31_throws", () => {
    expect(() => parseOpenApi("openapi: 2.0\npaths: {}\n")).toThrow(/3\.1/);
  });
});
