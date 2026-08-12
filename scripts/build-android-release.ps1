[CmdletBinding()]
param(
  [string]$VersionName = (Get-Date -Format 'yyyy.MM.dd.HHmm'),
  [string]$ReleaseNotes = 'بهبود بخش‌های نیتیو برنامه',
  [switch]$Mandatory,
  [string]$BazaarUrl = $env:ANDROID_BAZAAR_URL,
  [string]$MyketUrl = $env:ANDROID_MYKET_URL,
  [string]$GooglePlayUrl = $env:ANDROID_GOOGLE_PLAY_URL
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $projectRoot 'frontend/android'
$apkPath = Join-Path $androidRoot 'app/build/outputs/apk/release/app-release.apk'
$updatesRoot = Join-Path $projectRoot '.release/android-updates'
$nativeOutputRoot = Join-Path $projectRoot '.release/android-native'
$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)

function Assert-LastCommand([string]$description) {
  if ($LASTEXITCODE -ne 0) { throw "$description failed with exit code $LASTEXITCODE" }
}

foreach ($name in @(
  'ANDROID_KEYSTORE_PATH',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_ALIAS',
  'ANDROID_KEY_PASSWORD',
  'NUXT_PUBLIC_API_BASE',
  'NUXT_PUBLIC_PUBLIC_API_BASE',
  'NUXT_PUBLIC_WEB_BASE'
)) {
  if (-not [Environment]::GetEnvironmentVariable($name)) {
    throw "Set $name before building the Android native release."
  }
}
if (-not (Test-Path -LiteralPath $env:ANDROID_KEYSTORE_PATH -PathType Leaf)) {
  throw "Android release keystore was not found: $env:ANDROID_KEYSTORE_PATH"
}
if (-not $env:NUXT_PUBLIC_API_BASE.StartsWith('https://')) {
  throw 'NUXT_PUBLIC_API_BASE must use HTTPS for a native release.'
}
$storeUrls = @($BazaarUrl, $MyketUrl, $GooglePlayUrl) | Where-Object { $_ }
if (-not $storeUrls.Count) {
  throw 'Set at least one store URL with -BazaarUrl, -MyketUrl, or -GooglePlayUrl.'
}
if ($storeUrls | Where-Object { -not $_.StartsWith('https://') }) {
  throw 'All store URLs must use HTTPS.'
}

$versionCode = [int][DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
foreach ($manifestName in @('native-latest.json', 'web-latest.json')) {
  $manifestPath = Join-Path $updatesRoot $manifestName
  if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { continue }
  try {
    $previousManifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
    $previousNumber = if ($manifestName -eq 'native-latest.json') {
      [int]$previousManifest.versionCode
    } else {
      [int]$previousManifest.buildNumber
    }
    $versionCode = [Math]::Max($versionCode, $previousNumber + 1)
  } catch {
    throw "Existing $manifestName is invalid. Fix or remove it before creating a native release."
  }
}
$env:ANDROID_VERSION_CODE = [string]$versionCode
$env:ANDROID_VERSION_NAME = $VersionName
$env:CAPACITOR_ALLOW_MIXED_CONTENT = 'false'
$env:NUXT_PUBLIC_WEB_BUILD_NUMBER = [string]$versionCode

Push-Location $projectRoot
try {
  Write-Host "Building native Android release $VersionName ($versionCode)"
  pnpm.cmd --dir frontend mobile:assemble:release
  Assert-LastCommand 'Android native release build'
  if (-not (Test-Path -LiteralPath $apkPath)) { throw "Signed APK was not found: $apkPath" }

  New-Item -ItemType Directory -Path $updatesRoot -Force | Out-Null
  New-Item -ItemType Directory -Path $nativeOutputRoot -Force | Out-Null
  $safeVersionName = $VersionName -replace '[^a-zA-Z0-9._-]', '-'
  $apkFileName = "roghanyar-$safeVersionName-$versionCode.apk"
  Copy-Item -LiteralPath $apkPath -Destination (Join-Path $nativeOutputRoot $apkFileName) -Force

  $stores = [ordered]@{}
  if ($BazaarUrl) { $stores.bazaar = $BazaarUrl }
  if ($MyketUrl) { $stores.myket = $MyketUrl }
  if ($GooglePlayUrl) { $stores.googlePlay = $GooglePlayUrl }
  $notes = @($ReleaseNotes.Split('|') | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  $manifest = [ordered]@{
    versionCode = $versionCode
    versionName = $VersionName
    mandatory = [bool]$Mandatory
    releaseNotes = $notes
    stores = $stores
    publishedAt = [DateTimeOffset]::UtcNow.ToString('o')
  }
  [System.IO.File]::WriteAllText(
    (Join-Path $updatesRoot 'native-latest.json'),
    ($manifest | ConvertTo-Json -Depth 5),
    $utf8WithoutBom
  )

  Write-Host "Native APK for store upload: $(Join-Path $nativeOutputRoot $apkFileName)"
  Write-Host "Native update manifest: $(Join-Path $updatesRoot 'native-latest.json')"
  Write-Host 'Upload the APK to the selected stores, then publish native-latest.json on the server.'
}
finally {
  Pop-Location
}
