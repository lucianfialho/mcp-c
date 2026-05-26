import { describe, it, expect, vi, beforeEach } from "vitest";
import { Command } from "commander";
import { loadSpec } from "../parser/loader.js";
import { buildCommands } from "./commander-builder.js";
import type { RuntimeConfig } from "./types.js";
import path from "node:path";

const FIXTURE = path.resolve("test/fixtures/petstore.yaml");

const config: RuntimeConfig = {
  specPath: FIXTURE,
  baseUrl: "https://example.com",
  auth: { type: "none", value: "" },
  output: "json",
  verbose: false,
  quiet: false,
  dryRun: false,
  validate: false,
};

describe("collectParams JSON parsing", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses object params from JSON strings", async () => {
    const op: Operation = {
      id: "createVideos",
      method: "POST",
      path: "/videos",
      summary: "Create video",
      description: "",
      params: [
        { name: "name", in: "body", type: "string", required: true, description: "" },
        { name: "content", in: "body", type: "object", required: true, description: "" },
      ],
      bodyRequired: true,
      security: [],
    };

    let capturedBody: unknown;
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      capturedBody = JSON.parse(init.body as string);
      return Promise.resolve({
        status: 200,
        statusText: "OK",
        headers: new Map([["content-type", "application/json"]]),
        text: () => Promise.resolve("{}"),
      });
    }));

    const spec = await loadSpec(FIXTURE);
    const program = new Command();
    program.exitOverride();
    buildCommands(program, [{ tag: "Videos", description: "", operations: [op] }], config, spec);

    await program.parseAsync(["node", "test", "videos", "create", "--name", "Test", "--content", '{"text":"hello"}']);

    expect(capturedBody).toEqual({ name: "Test", content: { text: "hello" } });

    vi.unstubAllGlobals();
  });

  it("parses array params from JSON strings", async () => {
    const op: Operation = {
      id: "createItem",
      method: "POST",
      path: "/items",
      summary: "Create items",
      description: "",
      params: [
        { name: "tags", in: "body", type: "array", required: true, description: "" },
      ],
      bodyRequired: true,
      security: [],
    };

    let capturedBody: unknown;
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      capturedBody = JSON.parse(init.body as string);
      return Promise.resolve({
        status: 200,
        statusText: "OK",
        headers: new Map([["content-type", "application/json"]]),
        text: () => Promise.resolve("{}"),
      });
    }));

    const spec = await loadSpec(FIXTURE);
    const program = new Command();
    program.exitOverride();
    buildCommands(program, [{ tag: "Items", description: "", operations: [op] }], config, spec);

    await program.parseAsync(["node", "test", "items", "create", "--tags", '["a","b"]']);

    expect(capturedBody).toEqual({ tags: ["a", "b"] });

    vi.unstubAllGlobals();
  });

  it("falls back to string when JSON parse fails", async () => {
    const op: Operation = {
      id: "createThings",
      method: "POST",
      path: "/things",
      summary: "Create thing",
      description: "",
      params: [
        { name: "data", in: "body", type: "object", required: true, description: "" },
      ],
      bodyRequired: true,
      security: [],
    };

    let capturedBody: unknown;
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      capturedBody = JSON.parse(init.body as string);
      return Promise.resolve({
        status: 200,
        statusText: "OK",
        headers: new Map([["content-type", "application/json"]]),
        text: () => Promise.resolve("{}"),
      });
    }));

    const spec = await loadSpec(FIXTURE);
    const program = new Command();
    program.exitOverride();
    buildCommands(program, [{ tag: "Things", description: "", operations: [op] }], config, spec);

    await program.parseAsync(["node", "test", "things", "create", "--data", "not-json"]);

    expect(capturedBody).toEqual({ data: "not-json" });

    vi.unstubAllGlobals();
  });
});
