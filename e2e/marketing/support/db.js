import { execFileSync } from 'node:child_process';

/**
 * Narrow LocalDB access used only to keep the recording timeline coherent.
 *
 * The marketing fixture is seeded around October 2026, but the machine clock is
 * already in November. Every row the product creates live (a notification, for
 * example) is therefore stamped with the current month, which would leak a
 * November date into a scene that is deliberately pinned to October. These
 * helpers never touch the *content* of a row; they only align the notification
 * timestamps of the dedicated marketing database with the dated absence that is
 * being recorded, and remove notifications produced by preparation runs.
 *
 * Guard rails: the server and database are hard-coded to the marketing pair, and
 * every query is plain ASCII (ids and dates only) so nothing can be mangled by
 * the PowerShell console encoding.
 */
const SERVER = '(localdb)\\MSSQLLocalDB';
const DATABASE = 'CenterManagement_E2E_Marketing';

function runSql(query) {
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "$q = @'",
    query,
    "'@",
    `Invoke-Sqlcmd -ServerInstance '${SERVER}' -Database '${DATABASE}' -Query $q | Out-Null`,
  ].join('\n');

  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
}

const idList = (ids) => ids.map((id) => `'${id}'`).join(',');

/** Removes exactly the notification rows whose ids are given. */
export function deleteNotifications(ids) {
  const clean = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(String(id)));
  if (clean.length === 0) return;
  runSql(`DELETE FROM Notifications WHERE Id IN (${idList(clean)});`);
}

/**
 * Moves every notification stamped on/after 2026-11-01 to 2026-10-30 (keeping
 * its time of day), so a run that happens in November renders on the Friday of
 * the recorded absence and of every other number on screen.
 */
export function alignNotificationsToOctober() {
  runSql(
    "UPDATE Notifications SET CreatedAt = DATEADD(day, " +
      "DATEDIFF(day, CAST(CreatedAt AS date), CAST('2026-10-30' AS date)), CreatedAt) " +
      "WHERE CAST(CreatedAt AS date) >= '2026-11-01';",
  );
}
