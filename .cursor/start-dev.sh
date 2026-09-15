#!/usr/bin/env bash
# Long-running eve development server (HTTP API + agent runtime).
# Health check: GET http://127.0.0.1:${PORT:-3000}/eve/v1/health
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 24 >/dev/null

exec npx eve dev --no-ui --port "${PORT:-3000}"
