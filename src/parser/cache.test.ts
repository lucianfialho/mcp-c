import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getCachedSpec, cacheSpec } from "./cache.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("spec cache", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "spec2cli-cache-"));
    vi.stubEnv("XDG_CACHE_HOME", tmpDir);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns null for uncached URL", async () => {
    const result = await getCachedSpec("https://example.com/openapi.json");
    expect(result).toBeNull();
  });

  it("caches and retrieves spec content", async () => {
    const url = "https://example.com/openapi.json";
    const content = '{"openapi":"3.0.3","info":{"title":"Test"}}';

    await cacheSpec(url, content);
    const cached = await getCachedSpec(url);

    expect(cached).toBe(content);
  });

  it("different URLs get different cache entries", async () => {
    await cacheSpec("https://a.com/spec.json", "spec-a");
    await cacheSpec("https://b.com/spec.json", "spec-b");

    expect(await getCachedSpec("https://a.com/spec.json")).toBe("spec-a");
    expect(await getCachedSpec("https://b.com/spec.json")).toBe("spec-b");
  });
});
