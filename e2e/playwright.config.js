import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const recordVideo = process.env.E2E_VIDEO !== 'off';

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.js',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 10 * 60 * 1000,
  expect: {
    timeout: 20 * 1000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  outputDir: 'test-results',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    viewport: { width: 1280, height: 720 },
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
    ignoreHTTPSErrors: true,
    video: recordVideo
      ? { mode: 'on', size: { width: 1280, height: 720 } }
      : 'off',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      slowMo: Number(process.env.E2E_SLOWMO ?? 450),
      args: ['--lang=ar-EG'],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
