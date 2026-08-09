#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env.agent ]]; then
  printf '%s\n' \
    "Missing .env.agent. Create it locally with:" \
    "  cp .env.agent.example .env.agent" \
    "Then replace placeholders locally. The file is ignored and must never be committed."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  printf '%s\n' \
    "Docker is not available to this user." \
    "Configure rootless Docker or rootless Podman on the host, then rerun this script."
  exit 1
fi

if ! docker version >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  printf '%s\n' \
    "Docker is installed but unavailable to the current user without elevation." \
    "Configure rootless Docker or rootless Podman on the host, then rerun this validation." \
    "This script never requests or invokes sudo."
  exit 1
fi

exec docker compose -f compose.agent.yml run --rm --service-ports agent
