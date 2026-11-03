param(
    [switch]$ResetDatabase,
    [switch]$NoBuild
)

# Marketing video runner: same guard rails as start-api.ps1, but it points the
# API at a dedicated database (CenterManagement_E2E_Marketing) and opts into the
# marketing seeder. The Stage C database is never opened by this script.
$ErrorActionPreference = 'Stop'

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$apiProjectDir = Join-Path $repoRoot 'API\CenterManagementCleanArchitecture\CenterManagement.Api'
$apiProject = Join-Path $apiProjectDir 'CenterManagement.Api.csproj'
$configPath = Join-Path $apiProjectDir 'appsettings.E2E.json'
$logDir = Join-Path $repoRoot 'e2e\artifacts'
$buildDir = Join-Path $logDir 'api-marketing-build'
$logPath = Join-Path $logDir 'api-marketing.log'
$errorLogPath = Join-Path $logDir 'api-marketing.err.log'
$pidPath = Join-Path $logDir 'api-marketing.pid'
$apiUrl = 'https://localhost:7091'
$requiredDatabase = 'CenterManagement_E2E_Marketing'
$requiredServer = '(localdb)\MSSQLLocalDB'

if (-not (Test-Path $configPath)) {
    throw "Missing appsettings.E2E.json. The E2E runner will not start without it."
}

$config = Get-Content $configPath -Raw | ConvertFrom-Json
$connectionString = $config.ConnectionStrings.DefaultConnection

if ([string]::IsNullOrWhiteSpace($connectionString)) {
    throw 'appsettings.E2E.json has no DefaultConnection.'
}

# Keep the configured server and options, swap only the database name.
$marketingConnection = $connectionString
if ($connectionString -notmatch '(?i)Database\s*=') {
    throw 'Configured E2E connection string has no Database entry.'
}
$marketingConnection = [regex]::Replace(
    $connectionString,
    '(?i)Database\s*=\s*[^;]+',
    "Database=$requiredDatabase")

$settings = @{}
foreach ($part in $marketingConnection.Split(';')) {
    if ([string]::IsNullOrWhiteSpace($part)) { continue }
    $pair = $part.Split('=', 2)
    if ($pair.Count -eq 2) {
        $settings[$pair[0].Trim().ToLowerInvariant()] = $pair[1].Trim()
    }
}

$server = if ($settings.ContainsKey('server')) { $settings['server'] } else { $settings['data source'] }
$database = if ($settings.ContainsKey('database')) { $settings['database'] } else { $settings['initial catalog'] }

if ($server -ne $requiredServer) {
    throw "Marketing runner only permits Server=$requiredServer. Configured: $server"
}

if ($database -ne $requiredDatabase) {
    throw "Marketing runner only permits Database=$requiredDatabase. Configured: $database"
}

$listener = Get-NetTCPConnection -LocalPort 7091 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    throw "Port 7091 is already in use by PID $($listener.OwningProcess). Stop that process before starting the marketing API."
}

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

if (-not $NoBuild) {
    Write-Host "Building API in Release to $buildDir ..."
    & dotnet build $apiProject -c Release -o $buildDir --nologo
    if ($LASTEXITCODE -ne 0) {
        throw 'API build failed.'
    }
}

$dllPath = Join-Path $buildDir 'CenterManagement.Api.dll'
if (-not (Test-Path $dllPath)) {
    throw "Built DLL not found at $dllPath"
}

$env:ASPNETCORE_ENVIRONMENT = 'E2E'
$env:E2E_ALLOW_SEED = '1'
$env:E2E_MARKETING_SEED = '1'
$env:Seed__E2EReset = if ($ResetDatabase) { 'true' } else { 'false' }
$env:ASPNETCORE_URLS = $apiUrl
$env:ConnectionStrings__DefaultConnection = $marketingConnection

Remove-Item $logPath, $errorLogPath -Force -ErrorAction SilentlyContinue

$arguments = "`"$dllPath`" --urls $apiUrl"
$process = Start-Process `
    -FilePath 'dotnet' `
    -ArgumentList $arguments `
    -WorkingDirectory $buildDir `
    -PassThru `
    -RedirectStandardOutput $logPath `
    -RedirectStandardError $errorLogPath

$process.Id | Set-Content -Path $pidPath

Write-Host "Marketing API started with PID $($process.Id)"
Write-Host "Mode: DLL directly, no launch profile"
Write-Host "Environment: E2E"
Write-Host "Marketing seed: 1"
Write-Host "Seed reset: $($env:Seed__E2EReset)"
Write-Host "Expected database: $requiredServer / $requiredDatabase"
Write-Host "Log: $logPath"

$deadline = (Get-Date).AddSeconds(120)
$proof = $null

while ((Get-Date) -lt $deadline) {
    if ($process.HasExited) {
        $stdout = if (Test-Path $logPath) { Get-Content $logPath -Raw } else { '' }
        $stderr = if (Test-Path $errorLogPath) { Get-Content $errorLogPath -Raw } else { '' }
        throw "Marketing API exited with code $($process.ExitCode).`n$stdout`n$stderr"
    }

    if (Test-Path $logPath) {
        $proof = Select-String -Path $logPath -Pattern '^\[E2E SAFETY\] PASS ' | Select-Object -First 1
        if ($proof) { break }
    }

    Start-Sleep -Milliseconds 500
}

if (-not $proof) {
    throw "Marketing API started but did not emit the E2E safety proof line within 120 seconds. See $logPath"
}

Write-Host $proof.Line
Write-Host "PID file: $pidPath"
