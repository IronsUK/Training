Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$pidFile = Join-Path $PSScriptRoot ".workout-app-server.pid"

if (-not (Test-Path $pidFile)) {
  Write-Host "No tracked workout app server is running."
  exit 0
}

try {
  $pid = [int](Get-Content $pidFile -Raw)
  $process = Get-Process -Id $pid -ErrorAction Stop
  Stop-Process -Id $process.Id -Force
  Write-Host "Stopped workout app server (PID $pid)."
} catch {
  Write-Host "Tracked workout app process is not running anymore."
}

Remove-Item $pidFile -ErrorAction SilentlyContinue