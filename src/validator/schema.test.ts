import { describe, it, expect } from "vitest";
import { validateResponse } from "./schema.js";
import { loadSpec } from "../parser/loader.js";
import path from "node:path";

const FIXTURE = path.resolve("test/fixtures/petstore.yaml");

describe("validateResponse", () => {
  it("validates a correct response", async () => {
    const spec = await loadSpec(FIXTURE);
    const data = [
      { id: 1, name: "Rex", tag: "dog", status: "available" },
      { id: 2, name: "Luna", status: "pending" },
    ];

    const result = validateResponse(data, "/pets", "GET", 200, spec);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.fieldsChecked).toBeGreaterThan(0);
  });

  it("detects type mismatch", async () => {
    const spec = await loadSpec(FIXTURE);
    const data = [
      { id: "not-a-number", name: "Rex" },
    ];

    const result = validateResponse(data, "/pets", "GET", 200, spec);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].path).toContain("id");
    expect(result.errors[0].expected).toBe("integer");
    expect(result.errors[0].got).toBe("string");
  });

  it("detects missing required fields", async () => {
    const spec = await loadSpec(FIXTURE);
    const data = [
      { id: 1 }, // missing required "name"
    ];

    const result = validateResponse(data, "/pets", "GET", 200, spec);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("name") && e.got === "missing")).toBe(true);
  });

  it("returns valid for unknown paths", async () => {
    const spec = await loadSpec(FIXTURE);
    const result = validateResponse({}, "/unknown", "GET", 200, spec);
    expect(result.valid).toBe(true);
    expect(result.fieldsChecked).toBe(0);
  });

  it("returns valid for responses without schema", async () => {
    const spec = await loadSpec(FIXTURE);
    // DELETE /pets/{petId} returns 204 with no schema
    const result = validateResponse(null, "/pets/{petId}", "DELETE", 204, spec);
    expect(result.valid).toBe(true);
  });

  it("validates enum values", async () => {
    const spec = await loadSpec(FIXTURE);
    const data = [
      { id: 1, name: "Rex", status: "invalid-status" },
    ];

    const result = validateResponse(data, "/pets", "GET", 200, spec);
    expect(result.errors.some((e) => e.path.includes("status") && e.expected.includes("enum"))).toBe(true);
  });
});
