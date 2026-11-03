import { pathToFileURL } from 'node:url';

const localHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function assertLocalUrl(rawValue, label) {
  let url;

  try {
    url = new URL(rawValue);
  } catch {
    throw new Error(`${label} is not a valid URL: ${rawValue}`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${label} must use http or https: ${rawValue}`);
  }

  if (url.username || url.password) {
    throw new Error(`${label} must not contain credentials.`);
  }

  if (!localHosts.has(url.hostname)) {
    throw new Error(
      `${label} must target a local host (localhost, 127.0.0.1 or ::1). ` +
      `Received host: ${url.hostname}`,
    );
  }

  return url;
}

export function assertE2ERunAllowed(env = process.env) {
  if (env.E2E_ALLOW_RUN !== '1') {
    throw new Error(
      'E2E run blocked: set E2E_ALLOW_RUN=1 explicitly before running Playwright.',
    );
  }

  const baseURL = assertLocalUrl(
    env.E2E_BASE_URL || 'http://localhost:5173',
    'E2E_BASE_URL',
  );
  const apiBaseURL = assertLocalUrl(
    env.E2E_API_BASE_URL || 'https://localhost:7091',
    'E2E_API_BASE_URL',
  );

  return {
    baseURL: baseURL.toString(),
    apiBaseURL: apiBaseURL.toString(),
  };
}

const isMainModule =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  try {
    const target = assertE2ERunAllowed();
    console.log(
      `E2E preflight passed: base=${target.baseURL} api=${target.apiBaseURL}`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
