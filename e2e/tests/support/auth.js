import { expect } from '@playwright/test';
import { accounts } from './accounts.js';

/**
 * Signs in through the real login form.
 * No tokens are injected, no storage is pre-seeded.
 */
export async function loginAs(page, role, options = {}) {
  const account = accounts[role];

  if (!account) {
    throw new Error(`Unknown role "${role}"`);
  }

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#login-phone')).toBeVisible();
  await expect(page.locator('#login-password')).toBeVisible();

  await page.locator('#login-phone').fill(account.phone);
  await page.locator('#login-password').fill(account.password);

  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), {
      timeout: options.timeout ?? 45_000,
    }),
    page.locator('button[type="submit"]').click(),
  ]);

  // Wait until the router paints a real page instead of the login screen.
  await page.locator('body').waitFor({ state: 'visible' });
  await page.waitForLoadState('domcontentloaded');
}

export async function logout(page) {
  // Sidebar layouts expose the title, the parent/student headers rely on the
  // visible label. Accessible name covers both.
  const logoutButton = page
    .getByRole('button', { name: 'تسجيل خروج' })
    .first();
  await expect(logoutButton).toBeVisible({ timeout: 15_000 });
  await logoutButton.click();
  await page.waitForURL('**/login', { timeout: 30_000 });
}

export async function waitForLanding(page, account) {
  await page.waitForURL(
    (url) => url.pathname === account.path,
    { timeout: 45_000 },
  );
  expect(new URL(page.url()).pathname).toBe(account.path);
}

export async function expectLanding(page, account) {
  await waitForLanding(page, account);

  const heading = page.getByRole('heading', { name: account.heading }).first();
  await expect(heading).toBeVisible({ timeout: 45_000 });

  if (account.brand) {
    await expect(
      page.getByText(account.brand, { exact: false }).first(),
    ).toBeVisible({ timeout: 20_000 });
  }
}
