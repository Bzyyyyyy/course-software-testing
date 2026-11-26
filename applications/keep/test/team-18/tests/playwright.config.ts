import { defineConfig } from '@playwright/test';

/**
 * Team 18 (Keep) fault-revealing tests.
 *
 * Start the application first (applications/keep):
 *   sh start.sh            # or: node backend/server.cjs
 * and note the actual URL printed by the launcher (port is auto-selected in 3000-3999).
 *
 * Then from this directory:
 *   npm install
 *   npx playwright install chromium
 *   APP_URL=http://127.0.0.1:<printed-port> npx playwright test
 */
export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  expect: { timeout: 4_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.APP_URL || 'http://127.0.0.1:3000',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
});
