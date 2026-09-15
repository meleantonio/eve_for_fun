#!/usr/bin/env bash
# Idempotent repository bootstrap for the Econ AI Scout eve agent.
# Runs after the repo is checked out. Safe to re-run against cached state.
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# eve requires Node >= 24; the base image ships Node 22. Pin 24 as the default.
nvm install 24
nvm alias default 24
nvm use 24

echo "node: $(node -v)  npm: $(npm -v)"

# `npm run test:gold` invokes the bare `python` command; the base image only
# provides `python3`. Provide a `python` shim when it is missing.
if ! command -v python >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq python-is-python3
fi
echo "python: $(python --version 2>&1)"

# Deterministic dependency install from the committed lockfile.
npm ci
