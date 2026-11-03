import { assertE2ERunAllowed } from '../scripts/preflight.mjs';
import { assertMarketingDatabase } from './support/env.js';

export default async function globalSetup() {
  // Two independent guards: the shared E2E guard, and the marketing-specific
  // proof that the running API is bound to CenterManagement_E2E_Marketing.
  assertE2ERunAllowed();
  const pass = assertMarketingDatabase();
  // eslint-disable-next-line no-console
  console.log(`Marketing database guard: ${pass}`);
}
