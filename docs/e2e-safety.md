# E2E Safety Gates

These gates exist because an early smoke run used `dotnet run`, which loaded
`Properties/launchSettings.json`, forced `Development`, and therefore ignored
`appsettings.E2E.json`. The API seeded the remote database from
`appsettings.Development.json`.

Do not use `dotnet run` for E2E. Use the built DLL or
`dotnet run --no-launch-profile`.

## Hard requirements

### E2E API seed

The API refuses to start in `E2E` unless **all** of these are true:

- `ASPNETCORE_ENVIRONMENT=E2E`
- `E2E_ALLOW_SEED=1` (exact value, read from the environment)
- the final connection string server is `localhost`, `127.0.0.1`, `::1`,
  `(localdb)`, `sqlserver`, or `mssql`
- the database name contains `E2E` (case-insensitive)

The check runs before services are resolved. It prints the server and database,
never the password, and fails before any database connection is opened. On a
successful start the first proof line is:

```text
[E2E SAFETY] PASS environment=E2E server=(localdb)\MSSQLLocalDB database=CenterManagement_E2E
```

`appsettings.E2E.json` is the only E2E database configuration. It uses
`(localdb)\MSSQLLocalDB` and `CenterManagement_E2E`. A remote value inherited
from another config source, environment variable, or user secret is rejected.
For local work the official runner additionally rejects anything except exactly
that LocalDB server and database.

### Development test-center seed

If `Seed:TestCentersEnabled=true`, the host also requires a local database
server. This prevents the original incident even when the environment is
`Development`. `Seed:TestCenterPassword` must be configured explicitly; there
is no password fallback in source.

### E2E Playwright run

Every Playwright entry point requires:

- `E2E_ALLOW_RUN=1`
- `E2E_BASE_URL` local (default `http://localhost:5173`)
- `E2E_API_BASE_URL` local (default `https://localhost:7091`)

The npm `pretest*` hooks and Playwright `globalSetup` both enforce this. A
direct `npx playwright test` is also blocked unless the flag is set.

## Official local runner

Use the official script. There is no second local E2E startup path.

```powershell
.\e2e\scripts\start-api.ps1
```

The script does all of the following before it starts the process:

- requires `appsettings.E2E.json`;
- reads its connection string and requires exactly
  `(localdb)\MSSQLLocalDB` / `CenterManagement_E2E`;
- builds Release and starts the DLL directly, never through a launch profile;
- sets `ASPNETCORE_ENVIRONMENT=E2E`, `E2E_ALLOW_SEED=1`,
  `ASPNETCORE_URLS=https://localhost:7091`, and `Seed__E2EReset=false`;
- refuses to start if port 7091 is already in use;
- waits for and prints the `[E2E SAFETY] PASS` proof line.

`-NoBuild` may be used only after a successful Release build. `-ResetDatabase`
is still restricted to the same LocalDB target, but it is destructive and should
not be used for Stage B recording.

Manual DLL fallback is allowed only with the same environment variables and
`appsettings.E2E.json`. Do not use `dotnet run` with a launch profile for E2E.

Start the frontend from `frontend/CenterManagement`:

```powershell
npm run dev -- --host localhost --port 5173 --strictPort
```

Run Playwright:

```powershell
$env:E2E_ALLOW_RUN = '1'
$env:E2E_BASE_URL = 'http://localhost:5173'
$env:E2E_API_BASE_URL = 'https://localhost:7091'

npm run test:smoke
```

Do not set `E2E_ALLOW_SEED=1` for a database that is not the local
`CenterManagement_E2E` database. The flag is an explicit acknowledgement, not
a credential.

## CI workflow

The CI E2E job is the only exception to the LocalDB rule. It starts an ephemeral
SQL Server service container inside the job, uses a password generated fresh for
that run, and overrides the connection string for the job only. The API safety
gate still requires the database name to contain `E2E`.

- No production secret, connection string, SMTP password, or JWT secret is
  copied into the workflow, video, or logs.
- The generated CI password is test-only and is not stored as a repository
  secret.
- The local official runner never uses the CI database host.
