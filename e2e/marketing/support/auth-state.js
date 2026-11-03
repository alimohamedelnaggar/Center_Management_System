import fs from 'node:fs';
import path from 'node:path';
import { accountFor, apiBase, ensureDir } from './env.js';

/**
 * Builds a real session (refresh cookie) through the product's own SignIn
 * endpoint, then saves it as a Playwright storage state. The recording context
 * starts from that state, so the video never shows a login form, while the
 * session itself is still a genuine product session that the app restores with
 * POST /Authentication/RefreshToken on boot.
 */
export async function createStorageState(browser, role, targetPath) {
  const account = accountFor(role);
  ensureDir(path.dirname(targetPath));

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
  });

  try {
    const response = await context.request.post(
      `${apiBase}/api/V1/Authentication/SignIn`,
      {
        data: {
          phoneNumber: account.phone,
          password: account.password,
        },
        headers: { 'Content-Type': 'application/json' },
      },
    );

    if (!response.ok()) {
      throw new Error(
        `Sign-in for ${role} failed with HTTP ${response.status()}: ` +
        `${(await response.text()).slice(0, 400)}`,
      );
    }

    const body = await response.json();
    if (!body?.accessToken) {
      throw new Error(`Sign-in for ${role} returned no accessToken.`);
    }

    await context.storageState({ path: targetPath });

    const state = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    if (!state.cookies?.length) {
      throw new Error(
        `Sign-in for ${role} produced no cookie, so the recording context ` +
        'could not restore the session without showing the login form.',
      );
    }

    return { path: targetPath, account, body };
  } finally {
    await context.close();
  }
}
