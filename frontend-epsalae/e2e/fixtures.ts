import { APIRequestContext } from '@playwright/test';

export const API_URL = process.env.E2E_API_URL || 'http://localhost:4000/api/v1';

// A password meeting the backend's complexity rules (12+ chars, upper/lower/
// number/special) without containing the substring "password", which the
// app's own complexity check rejects.
export const TEST_PASSWORD = 'E2eSecret@2024!';

/**
 * Registers a test user directly against the backend API rather than
 * through the UI -- registration always requires a real hCaptcha challenge
 * (network call to hcaptcha.com), which isn't something a browser e2e test
 * should depend on. The `x-captcha-bypass` header lets this call skip real
 * verification (see backend-epasal/src/services/captcha.service.ts);
 * requires CAPTCHA_BYPASS_KEY to be set in the environment running these
 * tests, matching the value in backend-epasal/.env.
 */
export async function registerTestUser(request: APIRequestContext, overrides: { email?: string; name?: string } = {}) {
  const email = overrides.email || `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const name = overrides.name || 'E2E Test User';
  const bypassKey = process.env.CAPTCHA_BYPASS_KEY;

  const res = await request.post(`${API_URL}/auth/register`, {
    headers: bypassKey ? { 'x-captcha-bypass': bypassKey } : {},
    data: { name, email, password: TEST_PASSWORD },
  });

  if (!res.ok()) {
    throw new Error(
      `Test user registration failed (${res.status()}): ${await res.text()}. ` +
      'Is the backend running, and is CAPTCHA_BYPASS_KEY set to match backend-epasal/.env?'
    );
  }

  return { email, password: TEST_PASSWORD, name };
}
