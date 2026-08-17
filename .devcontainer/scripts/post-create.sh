#!/usr/bin/env bash
# -----------------------------------------------------------
# post-create.sh
#
# Runs once after the dev container is created.
# Called from devcontainer.json postCreateCommand.
# -----------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "==> [1/1] Install pre-commit hooks"
pre-commit install --install-hooks

echo "==> post-create complete"
