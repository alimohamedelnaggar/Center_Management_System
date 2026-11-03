import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const supportDir = path.dirname(fileURLToPath(import.meta.url));
export const marketingRoot = path.resolve(supportDir, '..');
export const repoRoot = path.resolve(marketingRoot, '..', '..');
export const e2eRoot = path.join(repoRoot, 'e2e');
export const artifactsRoot = path.join(e2eRoot, 'artifacts', 'marketing');
export const scenesRoot = path.join(artifactsRoot, 'scenes');
export const rawRoot = path.join(artifactsRoot, 'raw');
export const overlayRoot = path.join(artifactsRoot, 'overlays');
export const accountsPath = path.join(marketingRoot, 'accounts.local.json');
export const marketingLogPath = path.join(e2eRoot, 'artifacts', 'api-marketing.log');

export const frontendBase = process.env.E2E_BASE_URL || 'http://localhost:5173';
export const apiBase = process.env.E2E_API_URL || 'https://localhost:7091';

export const viewport = { width: 1920, height: 1080 };

export function loadAccounts() {
  if (!fs.existsSync(accountsPath)) {
    throw new Error(`Missing marketing accounts file: ${accountsPath}`);
  }
  return JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
}

export function accountFor(role) {
  const file = loadAccounts();
  const account = file.accounts[role];
  if (!account) {
    throw new Error(`Unknown marketing role: ${role}`);
  }
  return {
    ...account,
    password: account.password || file.password,
  };
}

/**
 * Refuses to record unless the API that is currently running proved, in its own
 * log, that it is bound to the dedicated marketing database. This is a guard,
 * not a convenience: the recording mutates data (adds a student, imports a
 * file), so it must never point at the Stage C database.
 */
export function assertMarketingDatabase() {
  if (!fs.existsSync(marketingLogPath)) {
    throw new Error(
      `Marketing API log not found: ${marketingLogPath}. Start the marketing API first.`,
    );
  }

  const log = fs.readFileSync(marketingLogPath, 'utf8');
  const lines = log.split(/\r?\n/);
  const pass = lines.find((line) =>
    line.includes('[E2E SAFETY] PASS') &&
    line.includes('database=CenterManagement_E2E_Marketing'),
  );

  if (!pass) {
    throw new Error(
      'Marketing recording blocked: api-marketing.log has no [E2E SAFETY] PASS ' +
      'line for database=CenterManagement_E2E_Marketing.',
    );
  }

  if (
    !lines.some((line) => line.includes('Marketing seed complete.')) &&
    !lines.some((line) => line.includes('Marketing E2E seed already present'))
  ) {
    throw new Error(
      'Marketing recording blocked: the marketing seed has not completed in api-marketing.log.',
    );
  }

  if (/database=CenterManagement_E2E(\s|$)/.test(log)) {
    throw new Error(
      'Marketing recording blocked: api-marketing.log mentions the Stage C database.',
    );
  }

  return pass.trim();
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}
