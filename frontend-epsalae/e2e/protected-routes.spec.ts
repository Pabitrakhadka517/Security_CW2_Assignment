import { test, expect } from '@playwright/test';
import { registerTestUser } from './fixtures';

test.describe('Route protection (authorization)', () => {
  test('visiting /account while logged out redirects to /login', async ({ page }) => {
    await page.goto('/account');
    await expect(page).toHaveURL(/\/login/);
  });

  test('a logged-in user can reach /account', async ({ page, request }) => {
    const user = await registerTestUser(request);

    await page.goto('/login');
    await page.getByLabel('Email address').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/account/);
  });

  test('visiting /admin while logged out redirects to admin login, not the account area', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
