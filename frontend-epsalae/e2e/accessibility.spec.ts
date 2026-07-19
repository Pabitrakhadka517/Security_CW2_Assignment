import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import { registerTestUser } from './fixtures';

const REPORT_DIR = 'e2e/.a11y-reports';
fs.mkdirSync(REPORT_DIR, { recursive: true });

// One file per page (not one shared file) -- Playwright runs specs in
// parallel workers, so a single shared file would race.
function recordViolations(pageLabel: string, violations: any[]) {
  const seriousOrWorse = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  const filename = `${REPORT_DIR}/${pageLabel.replace(/[^a-z0-9]+/gi, '_')}.json`;
  fs.writeFileSync(filename, JSON.stringify(
    seriousOrWorse.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      targets: v.nodes.map((n: any) => n.target),
    })),
    null, 2
  ));
  return seriousOrWorse;
}

// Automated accessibility scan (axe-core) across the key public pages and
// the new pages added this session (forgot/reset/verify email, MFA setup).
// Flags WCAG 2.x A/AA violations — contrast, missing labels/landmarks,
// ARIA misuse, etc. Doesn't replace manual keyboard/screen-reader testing,
// but catches the most common, mechanically-detectable issues.
const PUBLIC_PAGES = ['/', '/login', '/register', '/forgot-password', '/products'];

for (const path of PUBLIC_PAGES) {
  test(`accessibility: ${path} has no critical/serious violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const seriousOrWorse = recordViolations(path, results.violations);
    expect(seriousOrWorse).toEqual([]);
  });
}

test('accessibility: /reset-password (with a token, showing the full form)', async ({ page }) => {
  await page.goto('/reset-password?token=dummy-token-for-render');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const seriousOrWorse = recordViolations('reset-password', results.violations);
  expect(seriousOrWorse).toEqual([]);
});

test('accessibility: /account (authenticated) and /account/security', async ({ page, request }) => {
  const user = await registerTestUser(request);
  await page.goto('/login');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/account/);

  const accountResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const accountViolations = recordViolations('account', accountResults.violations);
  expect(accountViolations).toEqual([]);

  await page.goto('/account/security');
  const securityResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const securityViolations = recordViolations('account_security', securityResults.violations);
  expect(securityViolations).toEqual([]);
});
