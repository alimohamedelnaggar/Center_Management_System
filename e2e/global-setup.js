import { assertE2ERunAllowed } from './scripts/preflight.mjs';

export default async function globalSetup() {
  // Runs even when Playwright is invoked directly (npx playwright test),
  // bypassing the npm pretest script.
  assertE2ERunAllowed();
}
