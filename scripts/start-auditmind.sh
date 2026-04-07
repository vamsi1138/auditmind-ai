#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi

  if [[ -n "${ELIZA_PID:-}" ]]; then
    kill "$ELIZA_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "[auditmind] Starting AuditMind backend on port ${PORT:-3001}..."
node /app/dist/server.js &
BACKEND_PID=$!

echo "[auditmind] Starting Eliza server on port 3000..."
elizaos start &
ELIZA_PID=$!

wait -n "$BACKEND_PID" "$ELIZA_PID"
exit $?
