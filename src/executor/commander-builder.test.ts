import { describe, it, expect, vi, beforeEach } from "vitest";
import { Command } from "commander";
import { loadSpec } from "../parser/loader.js";
import { extractOperations } from "../parser/extractor.js";
import { buildCommands } from "./commander-builder.js";
import type { RuntimeConfig } from "./types.js";
import type { Operation } from "../parser/types.js";
import path from "node:path";

const FIXTURE = path.resolve("test/fixtures/petstore.yaml");

const config: RuntimeConfig = {
  specPath: FIXTURE,
  baseUrl: "https://petstore.example.com/v1",
  auth: { type: "none", value: "" },
  output: "json",
  verbose: false,
  quiet: false,
  dryRun: false,
  validate: false,
};

describe("buildCommands", () => {
  it("creates command groups matching spec tags", async () => {
    const spec = await loadSpec(FIXTURE);
    const groups = extractOperations(spec);
    const program = new Command();
    program.exitOverride();
    buildCommands(program, groups, config, spec);

    const commandNames = program.commands.map((c) => c.name());
    expect(commandNames).toContain("pets");
    expect(commandNames).toContain("store");
  });

  it("creates subcommands matching operations", async () => {
    const spec = await loadSpec(FIXTURE);
    const groups = extractOperations(spec);
    const program = new Command();
    program.exitOverride();
    buildCommands(program, groups, config, spec);

    const petsCmd = program.commands.find((c) => c.name() === "pets")!;
    const subNames = petsCmd.commands.map((c) => c.name());
    expect(subNames).toContain("list");
    expect(subNames).toContain("create");
    expect(subNames).toContain("get");
    expect(subNames).toContain("update");
    expect(subNames).toContain("delete");
  });

  it("creates subcommands for store group", async () => {
    const spec = await loadSpec(FIXTURE);
    const groups = extractOperations(spec);
    const program = new Command();
    program.exitOverride();
    buildCommands(program, groups, config, spec);

    const storeCmd = program.commands.find((c) => c.name() === "store")!;
    const subNames = storeCmd.commands.map((c) => c.name());
    expect(subNames).toContain("getinventory");
    expect(subNames).toContain("placeorder");
    expect(subNames).toContain("getorder");
  });

  it("adds options to commands from spec params", async () => {
    const spec = await loadSpec(FIXTURE);
    const groups = extractOperations(spec);
    const program = new Command();
    program.exitOverride();
    buildCommands(program, groups, config, spec);

    const petsCmd = program.commands.find((c) => c.name() === "pets")!;
    const listCmd = petsCmd.commands.find((c) => c.name() === "list")!;

    const optionNames = listCmd.options.map((o) => o.long);
    expect(optionNames).toContain("--limit");
    expect(optionNames).toContain("--status");
  });

  it("adds required options from spec", async () => {
    const spec = await loadSpec(FIXTURE);
    const groups = extractOperations(spec);
    const program = new Command();
    program.exitOverride();
    buildCommands(program, groups, config, spec);

    const petsCmd = program.commands.find((c) => c.name() === "pets")!;
    const createCmd = petsCmd.commands.find((c) => c.name() === "create")!;

    const nameOpt = createCmd.options.find((o) => o.long === "--name");
    expect(nameOpt).toBeDefined();
    expect(nameOpt!.required).toBe(true);
  });

  it("shows help for subcommands", async () => {
    const spec = await loadSpec(FIXTURE);
    const groups = extractOperations(spec);
    const program = new Command();
    program.exitOverride();
    program.configureOutput({ writeOut: () => {}, writeErr: () => {} });
    buildCommands(program, groups, config, spec);

    const petsCmd = program.commands.find((c) => c.name() === "pets")!;
    const listCmd = petsCmd.commands.find((c) => c.name() === "list")!;
    expect(listCmd.description()).toBe("List all pets");
  });
});

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

    await program.parseAsync(["node", "test", "Videos", "create", "--name", "Test", "--content", '{"text":"hello"}']);

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

    await program.parseAsync(["node", "test", "Items", "create", "--tags", '["a","b"]']);

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

    await program.parseAsync(["node", "test", "Things", "create", "--data", "not-json"]);

    expect(capturedBody).toEqual({ data: "not-json" });

    vi.unstubAllGlobals();
  });
});
