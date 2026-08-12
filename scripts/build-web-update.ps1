[CmdletBinding()]
param(
  [string]$Version = (Get-Date -Format 'yyyyMMdd-HHmmss'),
  [string]$ReleaseNotes = 'بهبود رابط کاربری و رفع مشکلات گزارش‌شده',
  [int]$MinimumNativeVersionCode = 0
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$webRoot = Join-Path $projectRoot 'frontend/.output/public'
$updatesRoot = Join-Path $projectRoot '.release/android-updates'
$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
$buildNumber = [int][DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

foreach ($manifestName in @('web-latest.json', 'native-latest.json')) {
  $manifestPath = Join-Path $updatesRoot $manifestName
  if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { continue }
  try {
    $previousManifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
    $previousNumber = if ($manifestName -eq 'web-latest.json') {
      [int]$previousManifest.buildNumber
    } else {
      [int]$previousManifest.versionCode
    }
    $buildNumber = [Math]::Max($buildNumber, $previousNumber + 1)
  } catch {
    throw "Existing $manifestName is invalid. Fix or remove it before creating an update."
  }
}

function Assert-LastCommand([string]$description) {
  if ($LASTEXITCODE -ne 0) { throw "$description failed with exit code $LASTEXITCODE" }
}

foreach ($name in @('NUXT_PUBLIC_API_BASE', 'NUXT_PUBLIC_PUBLIC_API_BASE', 'NUXT_PUBLIC_WEB_BASE')) {
  $value = [Environment]::GetEnvironmentVariable($name)
  if (-not $value) { throw "Set $name before building a web update." }
  if (-not $value.StartsWith('https://')) { throw "$name must use HTTPS for a web update." }
}
if ($Version -notmatch '^[a-zA-Z0-9._-]+$') {
  throw 'Version may only contain letters, numbers, dots, underscores, and dashes.'
}

$env:CAPACITOR_ALLOW_MIXED_CONTENT = 'false'
$env:NUXT_PUBLIC_WEB_BUILD_NUMBER = [string]$buildNumber
Push-Location $projectRoot
try {
  pnpm.cmd --dir frontend mobile:generate
  Assert-LastCommand 'Mobile web bundle generation'
  if (-not (Test-Path -LiteralPath (Join-Path $webRoot 'index.html'))) {
    throw 'Generated web bundle has no index.html.'
  }

  New-Item -ItemType Directory -Path $updatesRoot -Force | Out-Null
  $fileName = "web-$buildNumber.zip"
  $zipPath = Join-Path $updatesRoot $fileName
  if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
  Compress-Archive -Path (Join-Path $webRoot '*') -DestinationPath $zipPath -CompressionLevel Optimal
  $sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $zipPath).Hash.ToLowerInvariant()
  $notes = @($ReleaseNotes.Split('|') | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  $manifest = [ordered]@{
    buildNumber = $buildNumber
    version = $Version
    fileName = $fileName
    sha256 = $sha256
    minimumNativeVersionCode = [Math]::Max(0, $MinimumNativeVersionCode)
    releaseNotes = $notes
    publishedAt = [DateTimeOffset]::UtcNow.ToString('o')
  }
  [System.IO.File]::WriteAllText(
    (Join-Path $updatesRoot 'web-latest.json'),
    ($manifest | ConvertTo-Json -Depth 4),
    $utf8WithoutBom
  )
  Write-Host "Web update is ready: $zipPath"
  Write-Host 'Upload web-latest.json and the ZIP file to the server android-updates directory.'
}
finally {
  Pop-Location
}
