param(
    [switch]$ResetDatabase,
    [switch]$NoBuild
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$apiProjectDir = Join-Path $repoRoot 'API\CenterManagementCleanArchitecture\CenterManagement.Api'
$apiProject = Join-Path $apiProjectDir 'CenterManagement.Api.csproj'
$configPath = Join-Path $apiProjectDir 'appsettings.E2E.json'
$logDir = Join-Path $repoRoot 'e2e\artifacts'
$logPath = Join-Path $logDir 'api-e2e.log'
$errorLogPath = Join-Path $logDir 'api-e2e.err.log'
$pidPath = Join-Path $logDir 'api-e2e.pid'
$apiUrl = 'https://localhost:7091'
$requiredDatabase = 'CenterManagement_E2E'
$requiredServer = '(localdb)\MSSQLLocalDB'

if (-not (Test-Path $configPath)) {
    throw "Missing appsettings.E2E.json. The official E2E runner will not start without it."
}

$config = Get-Content $configPath -Raw | ConvertFrom-Json
$connectionString = $config.ConnectionStrings.DefaultConnection

if ([string]::IsNullOrWhiteSpace($connectionString)) {
    throw 'appsettings.E2E.json has no DefaultConnection.'
}

$settings = @{}
foreach ($part in $connectionString.Split(';')) {
    if ([string]::IsNullOrWhiteSpace($part)) { continue }
    $pair = $part.Split('=', 2)
    if ($pair.Count -eq 2) {
        $settings[$pair[0].Trim().ToLowerInvariant()] = $pair[1].Trim()
    }
}

$server = if ($settings.ContainsKey('server')) { $settings['server'] } else { $settings['data source'] }
$database = if ($settings.ContainsKey('database')) { $settings['database'] } else { $settings['initial catalog'] }

if ($server -ne $requiredServer) {
    throw "Official local E2E runner only permits Server=$requiredServer. Configured: $server"
}

if ($database -ne $requiredDatabase) {
    throw "Official local E2E runner only permits Database=$requiredDatabase. Configured: $database"
}

$listener = Get-NetTCPConnection -LocalPort 7091 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    throw "Port 7091 is already in use by PID $($listener.OwningProcess). Stop that process before starting the official E2E API."
}

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

if (-not $NoBuild) {
    Write-Host 'Building API in Release...'
    & dotnet build $apiProject -c Release --nologo
    if ($LASTEXITCODE -ne 0) {
        throw 'API build failed.'
    }
}

$dllPath = Join-Path $apiProjectDir 'bin\Release\net10.0\CenterManagement.Api.dll'
if (-not (Test-Path $dllPath)) {
    throw "Built DLL not found at $dllPath"
}

$env:ASPNETCORE_ENVIRONMENT = 'E2E'
$env:E2E_ALLOW_SEED = '1'
$env:Seed__E2EReset = if ($ResetDatabase) { 'true' } else { 'false' }
$env:ASPNETCORE_URLS = $apiUrl

Remove-Item $logPath, $errorLogPath -Force -ErrorAction SilentlyContinue

$arguments = "`"$dllPath`" --urls $apiUrl"
$process = Start-Process `
    -FilePath 'dotnet' `
    -ArgumentList $arguments `
    -WorkingDirectory $apiProjectDir `
    -PassThru `
    -RedirectStandardOutput $logPath `
    -RedirectStandardError $errorLogPath

$process.Id | Set-Content -Path $pidPath

Write-Host "API started with PID $($process.Id)"
Write-Host "Mode: DLL directly, no launch profile"
Write-Host "Environment: E2E"
Write-Host "Seed reset: $($env:Seed__E2EReset)"
Write-Host "Expected database: $requiredServer / $requiredDatabase"
Write-Host "Log: $logPath"

$deadline = (Get-Date).AddSeconds(75)
$proof = $null

while ((Get-Date) -lt $deadline) {
    if ($process.HasExited) {
        $stdout = if (Test-Path $logPath) { Get-Content $logPath -Raw } else { '' }
        $stderr = if (Test-Path $errorLogPath) { Get-Content $errorLogPath -Raw } else { '' }
        throw "API exited with code $($process.ExitCode).`n$stdout`n$stderr"
    }

    if (Test-Path $logPath) {
        $proof = Select-String -Path $logPath -Pattern '^\[E2E SAFETY\] PASS ' | Select-Object -First 1
        if ($proof) { break }
    }

    Start-Sleep -Milliseconds 500
}

if (-not $proof) {
    throw "API started but did not emit the E2E safety proof line within 75 seconds. See $logPath"
}

Write-Host $proof.Line
Write-Host "PID file: $pidPath"
