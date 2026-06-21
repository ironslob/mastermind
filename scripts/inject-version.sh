#!/usr/bin/env bash
# Stamp cache-busting query strings onto static assets using the git commit hash.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${1:-$(git -C "$ROOT" rev-parse --short HEAD)}"

for file in index.html app.js; do
  target="$ROOT/$file"
  if [[ ! -f "$target" ]]; then
    echo "Missing $target" >&2
    exit 1
  fi

  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' -E "s/\\?v=[^\"']+/?v=${VERSION}/g" "$target"
  else
    sed -i -E "s/\\?v=[^\"']+/?v=${VERSION}/g" "$target"
  fi
done

printf '%s\n' "$VERSION" > "$ROOT/version.txt"
echo "Cache-bust version set to ${VERSION}"
