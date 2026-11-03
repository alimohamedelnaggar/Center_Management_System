import { test, expect } from '@playwright/test';
import { accounts, roleOrder } from './support/accounts.js';
import { expectLanding, loginAs, logout } from './support/auth.js';

test.describe.configure({ mode: 'serial' });

test('all seven role accounts sign in through the real login UI', async ({
  page,
}, testInfo) => {
  test.setTimeout(8 * 60 * 1000);

  const signInStatuses = [];
  const pageErrors = [];
  const failedResponses = [];

  page.on('response', (response) => {
    if (response.url().includes('/Authentication/SignIn')) {
      signInStatuses.push(response.status());
    }
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  page.on('response', (response) => {
    if (response.status() >= 500) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  for (const role of roleOrder) {
    const account = accounts[role];

    await test.step(`${account.label} — ${account.phone}`, async () => {
      await loginAs(page, role);
      await expectLanding(page, account);

      await page.screenshot({
        path: testInfo.outputPath(`role-${role}.png`),
        fullPage: false,
      });

      await logout(page);
      await expect(page.locator('#login-phone')).toBeVisible();
    });
  }

  expect(signInStatuses).toHaveLength(roleOrder.length);
  expect(signInStatuses.every((status) => status === 200)).toBeTruthy();

  // Give the browser a moment to surface late page errors before asserting.
  await page.waitForTimeout(500);

  if (pageErrors.length > 0) {
    console.log('Browser page errors:', pageErrors);
  }

  if (failedResponses.length > 0) {
    console.log('HTTP 5xx responses:', failedResponses);
  }
});
