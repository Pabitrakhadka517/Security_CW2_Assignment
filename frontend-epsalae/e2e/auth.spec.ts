import { test, expect } from '@playwright/test';
import { registerTestUser } from './fixtures';

test.describe('Authentication', () => {
  test('login with correct credentials succeeds and reaches the account area', async ({ page, request }) => {
    const user = await registerTestUser(request);

    await page.goto('/login');
    await page.getByLabel('Email address').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/account/);
  });

  test('login with the wrong password is rejected with an error, not silently accepted', async ({ page, request }) => {
    const user = await registerTestUser(request);

    await page.goto('/login');
    await page.getByLabel('Email address').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill('DefinitelyWrong@2024!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('alert').first()).toBeVisible();
  });

  test('logout ends the session and account pages redirect back to login', async ({ page, request }) => {
    const user = await registerTestUser(request);

    await page.goto('/login');
    await page.getByLabel('Email address').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/account/);

    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('button', { name: 'Logout' }).first().click();

    await page.goto('/account');
    await expect(page).toHaveURL(/\/login/);
  });
});
