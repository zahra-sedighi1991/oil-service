[CmdletBinding()]
param(
  [string]$Version = (Get-Date -Format 'yyyyMMdd-HHmmss'),
  [string]$NpmRegistry = 'https://registry.npmjs.org/',
  [switch]$IncludeInfrastructureImages
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$releaseRoot = Join-Path $projectRoot '.release'
$bundlePath = Join-Path $releaseRoot $Version
$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
$releaseSucceeded = $false
$bundleCreatedByThisRun = $false

function Assert-LastCommand([string]$description) {
  if ($LASTEXITCODE -ne 0) {
    throw "$description failed with exit code $LASTEXITCODE"
  }
}

Push-Location $projectRoot
try {
  docker version *> $null
  Assert-LastCommand 'Docker availability check'

  if (Test-Path -LiteralPath $bundlePath) {
    throw "Release directory already exists: $bundlePath"
  }

  New-Item -ItemType Directory -Path $bundlePath -Force | Out-Null
  $bundleCreatedByThisRun = $true

  $apiImage = "oil-service-api:$Version"
  $webImage = "oil-service-web:$Version"

  Write-Host "Building $apiImage"
  docker build --build-arg "NPM_REGISTRY=$NpmRegistry" --file Dockerfile.api --tag $apiImage .
  Assert-LastCommand 'API image build'

  Write-Host "Building $webImage"
  docker build --build-arg "NPM_REGISTRY=$NpmRegistry" --file frontend/Dockerfile --tag $webImage frontend
  Assert-LastCommand 'Web image build'

  $images = @($apiImage, $webImage)
  if ($IncludeInfrastructureImages) {
    docker pull postgres:17-alpine
    Assert-LastCommand 'PostgreSQL image pull'
    docker pull caddy:2-alpine
    Assert-LastCommand 'Caddy image pull'
    $images += @('postgres:17-alpine', 'caddy:2-alpine')
  }

  $imageArchive = Join-Path $bundlePath 'oil-service-images.tar'
  docker image save --output $imageArchive $images
  Assert-LastCommand 'Docker image export'

  Copy-Item -LiteralPath (Join-Path $projectRoot 'deploy/compose.production.yml') -Destination $bundlePath
  Copy-Item -LiteralPath (Join-Path $projectRoot 'deploy/Caddyfile') -Destination $bundlePath
  Copy-Item -LiteralPath (Join-Path $projectRoot 'deploy/server-start.sh') -Destination $bundlePath
  Copy-Item -LiteralPath (Join-Path $projectRoot 'deploy/backup-db.sh') -Destination $bundlePath

  $androidUpdatesPath = Join-Path $releaseRoot 'android-updates'
  $hasAndroidFiles = (Test-Path -LiteralPath $androidUpdatesPath -PathType Container) `
    -and [bool](Get-ChildItem -LiteralPath $androidUpdatesPath -File -ErrorAction SilentlyContinue | Select-Object -First 1)
  if ($hasAndroidFiles) {
    Copy-Item -LiteralPath $androidUpdatesPath -Destination (Join-Path $bundlePath 'android-updates') -Recurse
    Write-Host 'Android download and update files were included in the server release.'
  } else {
    New-Item -ItemType Directory -Path (Join-Path $bundlePath 'android-updates') -Force | Out-Null
    Write-Host 'No Android update package exists yet; an empty android-updates directory was included.'
  }

  $environmentTemplate = Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'deploy/.env.production.example')
  $environmentTemplate = $environmentTemplate -replace 'APP_VERSION=latest', "APP_VERSION=$Version"
  [System.IO.File]::WriteAllText(
    (Join-Path $bundlePath '.env.production.example'),
    $environmentTemplate,
    $utf8WithoutBom
  )

  foreach ($shellScript in @('server-start.sh', 'backup-db.sh')) {
    $shellScriptPath = Join-Path $bundlePath $shellScript
    $shellScriptContent = [System.IO.File]::ReadAllText($shellScriptPath).Replace("`r`n", "`n")
    [System.IO.File]::WriteAllText($shellScriptPath, $shellScriptContent, $utf8WithoutBom)
  }

  $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $imageArchive).Hash.ToLowerInvariant()
  Set-Content -LiteralPath (Join-Path $bundlePath 'oil-service-images.tar.sha256') `
    -Value "$hash  oil-service-images.tar" -Encoding ascii

  $releaseSucceeded = $true
  Write-Host "Release is ready: $bundlePath"
  Write-Host 'Upload this directory to the server, configure .env.production, then run: sh server-start.sh'
}
finally {
  if (-not $releaseSucceeded -and $bundleCreatedByThisRun -and (Test-Path -LiteralPath $bundlePath)) {
    Remove-Item -LiteralPath $bundlePath -Recurse -Force
  }
  Pop-Location
}
