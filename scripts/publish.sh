#!/usr/bin/env bash
# Publish cyrene-dsh plugin to GitHub + npm.
# Requires: gh auth login (GitHub), npm login (npm official registry)
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== 1. Verify auth ==="
gh auth status >/dev/null 2>&1 || { echo "GitHub: run 'gh auth login' first"; exit 1; }
npm whoami --registry=https://registry.npmjs.org >/dev/null 2>&1 || { echo "npm: run 'npm login --registry=https://registry.npmjs.org' first"; exit 1; }

echo "=== 2. Build merged plugin (if needed) ==="
node scripts/build-merge.js

echo "=== 3. Publish to GitHub ==="
# Create repo if it doesn't exist, then push
if ! gh repo view under-the-ocean/cyrene-dsh-plugins >/dev/null 2>&1; then
  gh repo create cyrene-dsh-plugins --public --source . --push
else
  git push -u origin main
fi

echo "=== 4. Publish to npm ==="
cd packages/dsh-cyrene
npm publish --registry=https://registry.npmjs.org

echo "=== Done ==="
echo "GitHub: https://github.com/under-the-ocean/cyrene-dsh-plugins"
echo "npm:    https://www.npmjs.com/package/cyrene-dsh"
