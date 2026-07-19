import { test, expect } from '@playwright/test';
import { registerTestUser } from './fixtures';

test.describe('Forgot password', () => {
  test('shows the same generic message for a registered and an unregistered email', async ({ page, request }) => {
    const user = await registerTestUser(request);

    await page.goto('/forgot-password');
    await page.getByLabel('Email address').fill(user.email);
    await page.getByRole('button', { name: /send reset link/i }).click();
    const registeredMessage = await page.getByRole('status').textContent();

    await page.goto('/forgot-password');
    await page.getByLabel('Email address').fill('definitely-not-registered@example.com');
    await page.getByRole('button', { name: /send reset link/i }).click();
    const unregisteredMessage = await page.getByRole('status').textContent();

    expect(registeredMessage).toBe(unregisteredMessage);
  });
});
