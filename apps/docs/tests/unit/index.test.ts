import { describe, expect, it } from "vitest";
import { PACKAGE_NAME } from "../../src/index.js";

describe("scaffold", () => {
  it("test_scaffold_package_name_placeholder_matches_manifest", () => {
    expect(PACKAGE_NAME).toBe("@yuyin-tts/docs");
  });
});
