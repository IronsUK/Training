Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$port = 8787
$url = "http://localhost:$port/app/index.html"
$pidFile = Join-Path $PSScriptRoot ".workout-app-server.pid"

function Get-LanIPv4 {
  try {
    $defaultRoute = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction Stop |
      Sort-Object RouteMetric |
      Select-Object -First 1

    if (-not $defaultRoute) {
      return $null
    }

    $ip = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $defaultRoute.InterfaceIndex -ErrorAction Stop |
      Where-Object {
        $_.IPAddress -ne "127.0.0.1" -and
        -not $_.IPAddress.StartsWith("169.254.")
      } |
      Select-Object -First 1 -ExpandProperty IPAddress

    return $ip
  } catch {
    return $null
  }
}

function Show-PhoneAccessInfo {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PhoneUrl
  )

  $encoded = [Uri]::EscapeDataString($PhoneUrl)
  $qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=$encoded"

  Write-Host ""
  Write-Host "Phone access URL: $PhoneUrl"
  Write-Host "QR code image URL: $qrUrl"
  Write-Host "Tip: your phone must be on the same Wi-Fi network."

  try {
    Start-Process $qrUrl
    Write-Host "Opened QR code image in your browser."
  } catch {
    Write-Warning "Could not auto-open the QR code image. Copy the QR code image URL above into a browser."
  }
}

if (Test-Path $pidFile) {
  try {
    $existingPid = [int](Get-Content $pidFile -Raw)
    $existingProcess = Get-Process -Id $existingPid -ErrorAction Stop
    Write-Host "Workout app server already running (PID $($existingProcess.Id))."
    Start-Process $url
    Write-Host "Opened $url"

    $lanIp = Get-LanIPv4
    if ($lanIp) {
      $phoneUrl = "http://${lanIp}:$port/app/index.html"
      Show-PhoneAccessInfo -PhoneUrl $phoneUrl
    } else {
      Write-Warning "Could not determine LAN IP for phone access."
    }

    exit 0
  } catch {
    Remove-Item $pidFile -ErrorAction SilentlyContinue
  }
}

$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
  Write-Warning "Python was not found in PATH. Opening app directly as a file instead."
  $filePath = Join-Path $workspaceRoot "app\index.html"
  Start-Process $filePath
  Write-Host "Opened $filePath"
  Write-Host "Tip: install Python to enable auto-load of state/current-state.json via local server."
  exit 0
}

$server = Start-Process -FilePath $pythonCmd.Source `
  -ArgumentList "-m", "http.server", "$port", "--directory", "$workspaceRoot" `
  -PassThru

$server.Id | Set-Content $pidFile

# Give the server a short moment to bind the port.
Start-Sleep -Milliseconds 500

Start-Process $url
Write-Host "Started workout app server (PID $($server.Id))."
Write-Host "Opened $url"
Write-Host "Run scripts/stop-workout-app.ps1 when finished."

$lanIp = Get-LanIPv4
if ($lanIp) {
  $phoneUrl = "http://${lanIp}:$port/app/index.html"
  Show-PhoneAccessInfo -PhoneUrl $phoneUrl
} else {
  Write-Warning "Could not determine LAN IP for phone access."
}