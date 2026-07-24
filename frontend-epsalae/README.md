# Epasaley — Storefront & Admin Frontend

React SPA for the Epasaley e-commerce platform: a customer-facing storefront (browsing,
cart, checkout, order tracking, account/security settings) and a separate `/admin`
dashboard for managing the catalogue, promotions, and orders. Talks to the
[`backend-epasal`](../backend-epasal) REST API.

## Stack

* React 19 + Vite
* Tailwind CSS
* Zustand (client state), TanStack Query (server state)
* React Hook Form + Zod (form validation)
* Playwright (end-to-end tests) + `@axe-core/playwright` (accessibility scans)

## Getting started

```bash
npm install
cp .env.example .env   # set VITE_API_BASE_URL to point at your running backend
npm run dev
```

| Script | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright end-to-end + accessibility suite (needs the backend running) |

## Environment variables

See `.env.example` for the full list. The important ones:

* `VITE_API_BASE_URL` — backend origin (no trailing slash); every API call reads from
  `src/config/index.js`, which reads this variable.
* `VITE_GOOGLE_CLIENT_ID` — must match the backend's `GOOGLE_CLIENT_ID` for Google Sign-In.
* `VITE_HCAPTCHA_SITE_KEY` — public hCaptcha site key (the secret key stays backend-only).

## Security-relevant frontend behavior

* Two independent auth stores (`useAdminAuth` / `useUserAuth`) so an admin session and a
  customer session never grant each other's access, even in the same browser.
* Route guards (`ProtectedRoute`, `UserProtectedRoute`, `RBACGuard`) gate both admin and
  account pages client-side, in addition to the backend's own authorization checks.
* CSRF token is read from its cookie and echoed back as `X-CSRF-Token` on refresh/logout
  (see `src/utils/csrf.js`).
* MFA (authenticator app or emailed code), forgot/reset password, and email verification
  all have dedicated pages under `src/pages/`.

Deployment notes are in `DEPLOYMENT.md`.
