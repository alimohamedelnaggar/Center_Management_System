import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './marketing/scenes',
  globalSetup: './marketing/global-setup.js',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: Number(process.env.MARKETING_TIMEOUT_MS || 12 * 60 * 1000),
  expect: {
    timeout: 25 * 1000,
  },
  reporter: [['list']],
  outputDir: './artifacts/marketing/test-results',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    viewport: { width: 1920, height: 1080 },
    screen: { width: 1920, height: 1080 },
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
    colorScheme: 'light',
    ignoreHTTPSErrors: true,
    deviceScaleFactor: 1,
    video: {
      mode: 'on',
      size: { width: 1920, height: 1080 },
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      slowMo: Number(process.env.MARKETING_SLOWMO ?? 250),
      args: [
        '--lang=ar-EG',
        '--force-device-scale-factor=1',
        '--hide-scrollbars',
        '--disable-features=CalculateNativeWinOcclusion',
      ],
    },
  },
  projects: [
    {
      name: 'marketing-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
