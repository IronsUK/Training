Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$outputRoot = Join-Path $workspaceRoot "dist\static-site"
$dataDir = Join-Path $outputRoot "data"

if (Test-Path $outputRoot) {
  Remove-Item $outputRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $dataDir -Force | Out-Null

Copy-Item (Join-Path $workspaceRoot "app\index.html") $outputRoot
Copy-Item (Join-Path $workspaceRoot "app\app.js") $outputRoot
Copy-Item (Join-Path $workspaceRoot "app\styles.css") $outputRoot
Copy-Item (Join-Path $workspaceRoot "state\current-state.json") (Join-Path $dataDir "current-state.json")

Write-Host "Published static site artifact to $outputRoot"
Write-Host "Entrypoint: $(Join-Path $outputRoot 'index.html')"
Write-Host "Embedded state snapshot: $(Join-Path $dataDir 'current-state.json')"