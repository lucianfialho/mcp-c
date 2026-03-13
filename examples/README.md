# MCP-C Examples

## `todo-api/` — Does the runtime work?

A local Todo API server + demo script that exercises every mcp-c feature: 3-phase discovery, CRUD operations, auth, output formats (json, table, envelope), verbose mode, dynamic help.

```bash
bash examples/todo-api/demo.sh
```

**This proves:** the code works. Parser reads specs, discovery outputs JSON, executor makes HTTP calls, auth flows, output formats.

**This does NOT prove:** that mcp-c is better than MCP for AI agents.

---

## `agent-test/` — Does the protocol actually help AI agents?

This is the test that matters. It gives a real AI agent (Claude) the same task via 3 approaches and measures real token consumption and cost.

```bash
node examples/todo-api/server.mjs &
bash examples/agent-test/run.sh
```

**The task:** "List pending todos, find the highest priority one, mark it as done."

**Three approaches:**

| Approach | Discovery | Execution |
|---|---|---|
| MCP-style | All 6 tool schemas in system prompt | `curl` |
| CLI raw | No schema, explore via `curl` | `curl` |
| MCP-C | Progressive: `--discover` → `--discover group` → `--discover command` | `mcp-c ... todos list` |

### First real results (2026-03-13)

| Metric | MCP-style | CLI raw | MCP-C |
|---|---|---|---|
| Total input tokens | 86,837 | 108,294 | 155,969 |
| Cache create | 22,168 | 12,737 | 13,531 |
| Cache read | 64,663 | 95,550 | 142,429 |
| Output tokens | 531 | 626 | 1,107 |
| Turns | 4 | 5 | 7 |
| Cost | $0.184 | $0.143 | $0.184 |
| Correct? | Yes | Yes | Yes |

### What we learned

**MCP-C was NOT cheaper in this test.** It was the most expensive approach by total input tokens.

Why: progressive discovery requires more turns (7 vs 4). Each turn re-reads the full conversation from cache. Even though each individual mcp-c payload is small (~200-500 tokens), the accumulated cost of re-reading the growing conversation on every turn outweighs the savings.

**The real cost breakdown:**

- **MCP-style**: Pays upfront (22K cache_create for all schemas) but needs fewer turns. The schemas are cached and re-read cheaply.
- **CLI raw**: Smallest system prompt, but needs trial-and-error exploration. Middle ground.
- **MCP-C**: Small system prompt, but 3 discovery calls + execution = 7 turns. Each turn re-reads everything that came before.

### When MCP-C WOULD win

The Todo API has only 6 endpoints. This is a small API where loading everything upfront is cheap. MCP-C's progressive discovery is designed for **large APIs** (50-100+ endpoints) where:

1. Loading all schemas upfront would be 20K-50K tokens (vs our 500-token toy schema)
2. The agent only needs 2-3 tools out of 82
3. The upfront cost dwarfs the roundtrip cost

The GitHub MCP server (82 tools, 24K tokens) would be a fairer test. The benchmark (`npm run test:bench`) measures this theoretically — the agent test should be run against a larger API to validate in practice.

### What this means for the project

1. **Progressive discovery has a floor cost** — each phase is a roundtrip, and roundtrips aren't free
2. **For small APIs (< 20 endpoints), MCP-style wins** — just load everything
3. **MCP-C should auto-detect API size** — small API? dump all schemas. Large API? progressive discovery
4. **Combining phases would help** — `--discover` could return manifest + first group in one call
5. **The envelope format still saves output tokens** — but we didn't test that here (all approaches used raw JSON)

### How to run

```bash
# Start the server
node examples/todo-api/server.mjs &

# Run the test (takes ~2 min, costs ~$0.50 total)
bash examples/agent-test/run.sh

# Inspect raw results
cat examples/agent-test/results/mcp-style.json | jq '{cost: .total_cost_usd, turns: .num_turns, result: .result}'
cat examples/agent-test/results/cli-raw.json | jq '{cost: .total_cost_usd, turns: .num_turns, result: .result}'
cat examples/agent-test/results/mcp-c.json | jq '{cost: .total_cost_usd, turns: .num_turns, result: .result}'

# Stop the server
kill %1
```
