# Publish cyrene-dsh plugin to GitHub + npm (PowerShell).
# Requires: gh auth login (GitHub), npm login (npm official registry)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "=== 1. Verify auth ==="
gh auth status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "GitHub: run 'gh auth login' first"; exit 1 }
npm whoami --registry=https://registry.npmjs.org 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "npm: run 'npm login --registry=https://registry.npmjs.org' first"; exit 1 }

Write-Host "=== 2. Build merged plugin (if needed) ==="
node scripts/build-merge.js

Write-Host "=== 3. Publish to GitHub ==="
gh repo view under-the-ocean/cyrene-dsh-plugins 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  gh repo create cyrene-dsh-plugins --public --source . --push
} else {
  git push -u origin main
}

Write-Host "=== 4. Publish to npm ==="
Set-Location packages/dsh-cyrene
npm publish --registry=https://registry.npmjs.org

Write-Host "=== Done ==="
Write-Host "GitHub: https://github.com/under-the-ocean/cyrene-dsh-plugins"
Write-Host "npm:    https://www.npmjs.com/package/cyrene-dsh"
