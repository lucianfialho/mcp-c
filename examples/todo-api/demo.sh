#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  MCP-C Demo: Todo API
#
#  This script starts a local Todo API and demonstrates
#  every mcp-c feature against it.
#
#  Usage: bash examples/todo-api/demo.sh
# ═══════════════════════════════════════════════════════════

set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MCPC="node $ROOT/dist/index.js"
SPEC="$ROOT/examples/todo-api/openapi.yaml"
TOKEN="test-token-123"

# Colors
C="\033[36m"  # cyan
G="\033[32m"  # green
Y="\033[33m"  # yellow
R="\033[0m"   # reset

step() { echo -e "\n${C}━━━ $1 ━━━${R}\n"; }
run() { echo -e "${Y}\$ $@${R}"; eval "$@"; echo ""; }

# ──────────────────────────────────────────────────────────
# Start server
# ──────────────────────────────────────────────────────────
step "Starting Todo API server..."
node "$ROOT/examples/todo-api/server.mjs" &
SERVER_PID=$!
sleep 1

cleanup() { kill $SERVER_PID 2>/dev/null; }
trap cleanup EXIT

echo -e "${G}Server running (PID $SERVER_PID)${R}"

# ──────────────────────────────────────────────────────────
# Discovery Protocol
# ──────────────────────────────────────────────────────────
step "Phase 1: Manifest (what can this API do?)"
run "$MCPC --spec $SPEC --discover | jq ."

step "Phase 2: Group detail (what commands does 'todos' have?)"
run "$MCPC --spec $SPEC --discover todos | jq ."

step "Phase 3: Command schema (how do I create a todo?)"
run "$MCPC --spec $SPEC --discover todos create | jq ."

# ──────────────────────────────────────────────────────────
# Read Operations
# ──────────────────────────────────────────────────────────
step "List all todos (JSON)"
run "$MCPC --spec $SPEC --output json todos list | jq ."

step "List all todos (table)"
run "$MCPC --spec $SPEC --output table todos list"

step "List pending todos only"
run "$MCPC --spec $SPEC --output table todos list --status pending"

step "List todos with envelope (AI-optimized, max 3 items)"
run "$MCPC --spec $SPEC --output envelope --max-items 3 todos list | jq ."

step "Get todo #1"
run "$MCPC --spec $SPEC --output json todos get --id 1 | jq ."

step "Get todo #3"
run "$MCPC --spec $SPEC --output envelope todos get --id 3 | jq ."

# ──────────────────────────────────────────────────────────
# Write Operations (require auth)
# ──────────────────────────────────────────────────────────
step "Create todo WITHOUT auth (should fail 401)"
run "$MCPC --spec $SPEC --output json todos create --title 'Test without auth' 2>&1 || true"

step "Create todo WITH auth"
run "$MCPC --spec $SPEC --output json --token $TOKEN todos create --title 'Deploy mcp-c to npm' --description 'Publish v0.1.0' --priority high --tags 'work,release' | jq ."

step "Update todo #1 to done"
run "$MCPC --spec $SPEC --output json --token $TOKEN todos update --id 1 --status done | jq ."

step "Delete todo #4"
run "$MCPC --spec $SPEC --output json --token $TOKEN todos delete --id 4 2>&1 || echo '(204 No Content — deleted successfully)'"

# ──────────────────────────────────────────────────────────
# Verify changes
# ──────────────────────────────────────────────────────────
step "Final state: all todos (table)"
run "$MCPC --spec $SPEC --output table todos list"

step "List done todos"
run "$MCPC --spec $SPEC --output table todos list --status done"

step "List all tags"
run "$MCPC --spec $SPEC --output json tags list | jq ."

# ──────────────────────────────────────────────────────────
# Help
# ──────────────────────────────────────────────────────────
step "Dynamic help: root"
run "$MCPC --spec $SPEC --help"

step "Dynamic help: todos group"
run "$MCPC --spec $SPEC todos --help"

step "Dynamic help: todos create"
run "$MCPC --spec $SPEC todos create --help"

# ──────────────────────────────────────────────────────────
# Verbose mode
# ──────────────────────────────────────────────────────────
step "Verbose mode (shows HTTP request/response)"
run "$MCPC --spec $SPEC --output json --verbose todos get --id 1 2>&1 | head -20"

# ──────────────────────────────────────────────────────────
echo ""
echo -e "${G}═══════════════════════════════════════════════════════════${R}"
echo -e "${G}  Demo complete! All features demonstrated.${R}"
echo -e "${G}═══════════════════════════════════════════════════════════${R}"
