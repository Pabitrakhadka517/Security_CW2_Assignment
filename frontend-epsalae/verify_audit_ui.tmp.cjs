// Drives the running vite dev server (5174) against the running backend (4000)
// to verify /account/activity and /admin/security actually render real data.
const { chromium } = require('playwright');

const BASE = 'http://localhost:5174';
const USER_EMAIL = process.env.AUDIT_USER_EMAIL;
const USER_PASSWORD = process.env.AUDIT_USER_PASSWORD;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

(async () => {
  const browser = await chromium.launch();
  const results = {};

  // ---- Customer: Account Activity ----
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });

    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', USER_EMAIL);
    await page.fill('input[type="password"]', USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'C:/Users/ACER/AppData/Local/Temp/claude/d--Security-CW-2/c511075b-f743-41eb-b105-ab814d87d6d8/scratchpad/debug_after_user_login.png', fullPage: true });
    console.log('USER LOGIN URL:', page.url());
    console.log('USER LOGIN ERRORS SO FAR:', JSON.stringify(errors));

    await page.goto(`${BASE}/account/activity`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Account Activity', { timeout: 10000 });
    await page.waitForTimeout(1500); // let the activity fetch resolve and render
    await page.screenshot({ path: 'C:/Users/ACER/AppData/Local/Temp/claude/d--Security-CW-2/c511075b-f743-41eb-b105-ab814d87d6d8/scratchpad/account_activity.png', fullPage: true });

    const bodyText = await page.textContent('body');
    results.accountActivity = {
      hasTimelineText: /Signed in successfully|Password changed|Address added|No activity recorded yet/.test(bodyText),
      errors,
    };
    await context.close();
  }

  // ---- Admin: Security Dashboard ----
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });

    await page.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/, { timeout: 15000 });

    await page.goto(`${BASE}/admin/security`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Security Dashboard', { timeout: 10000 });
    await page.waitForTimeout(2000); // let summary + live-feed fetches resolve
    await page.screenshot({ path: 'C:/Users/ACER/AppData/Local/Temp/claude/d--Security-CW-2/c511075b-f743-41eb-b105-ab814d87d6d8/scratchpad/security_dashboard.png', fullPage: true });

    const bodyText = await page.textContent('body');
    results.securityDashboard = {
      hasSummaryText: /Total Login Attempts|Failed Logins|Blocked Accounts|Suspicious IPs/.test(bodyText),
      hasRiskTable: /High-Risk|SUSPICIOUS_ACTIVITY|No high-risk events/.test(bodyText),
      errors,
    };
    await context.close();
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
