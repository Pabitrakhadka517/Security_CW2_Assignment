import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests exercise the real app in a browser, which means they need the
 * ACTUAL backend + MongoDB running (same as your normal `npm run dev`
 * workflow in backend-epasal) -- unlike the backend's own Jest suite, which
 * uses an in-memory Mongo and is fully self-contained. Start the backend
 * yourself before running `npm run test:e2e`; this config only auto-starts
 * the frontend dev server.
 *
 * Registration always requires a real hCaptcha challenge (network call to
 * hcaptcha.com), which isn't reliable to automate in a browser test. Test
 * users are therefore created directly via the backend API (see
 * e2e/fixtures.ts) using the `x-captcha-bypass` header -- set
 * CAPTCHA_BYPASS_KEY in your shell to the same value configured in
 * backend-epasal/.env before running these tests.
 */
const FRONTEND_URL = process.env.E2E_FRONTEND_URL || 'http://localhost:5174';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: FRONTEND_URL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
