# Project Report: Epasaley E-Commerce Platform

## 1. Overview

**Epasaley** is a full-stack e-commerce web application consisting of an independent REST API backend and a React single-page-application frontend. The platform supports a customer-facing storefront (browsing, cart, checkout, order tracking, account management) and a separate admin dashboard for managing catalogue, promotions, and orders.

The project is organized as two sibling folders with no shared root package or monorepo tooling:

| Folder | Role |
|---|---|
| `backend-epasal/` | REST API — Node.js, Express, TypeScript, MongoDB |
| `frontend-epsalae/` | SPA client — React 19, Vite, Tailwind CSS |

The working directory is not currently a git repository (no `.git` found), though `backend-epasal/README.md` still contains unresolved merge-conflict markers (`<<<<<<< HEAD` / `>>>>>>>`), suggesting the project was extracted from a prior git history without cleanup.

---

## 2. Backend (`backend-epasal/`)

### 2.1 Stack
- **Runtime**: Node.js, TypeScript (compiled to `dist/` via `tsc`)
- **Framework**: Express 4
- **Database**: MongoDB via Mongoose 8
- **Auth**: JWT (`jsonwebtoken`), password hashing with `bcryptjs`
- **File storage**: Cloudinary (product/banner/avatar images), `multer` for multipart uploads
- **Docs**: OpenAPI/Swagger, served at `/api-docs` and `/api/v1/docs`, generated from Joi schemas via `joi-to-swagger`
- **Testing**: Jest + Supertest + `mongodb-memory-server` (in-memory Mongo for integration tests)
- **Deployment**: Render (`render.yaml`, `Procfile`)

### 2.2 Architecture

Clean layered, service-oriented structure:

```
routes/  → controllers/  → services/  → repositories/ (partial) → models/
                                validations/ (Joi request schemas)
                                middlewares/ (cross-cutting concerns)
```

- **Routes** (`src/routes/`): `auth`, `product`, `order`, `category`, `banner`, `coupon`, `user`, `saleCategory`, `bulk`. All mounted under `/api/v1`.
- **Models** (`src/models/`): `User`, `Admin`, `Product`, `Category`, `SaleCategory`, `Banner`, `Coupon`, `CouponUsage`, `Order`, `Cart`, `Counter`, `RefreshToken`.
- **Notable design choices**:
  - Products use a hybrid legacy/variant schema — top-level `price`/`stock` fields are retained for backward compatibility while an optional `variants[]` array supports SKU-level pricing/stock; the service layer keeps the two in sync.
  - The cart is intentionally **client-side** (browser storage) rather than server-backed; a legacy DB-backed cart module (`cart.routes.ts`/`CartRepository.ts`) exists in the codebase but is **deliberately unmounted** because it used an incompatible ObjectId/variant model and lacked ownership checks. Logged-in users instead sync their cart via `/user/cart`.
  - Orders store a full item snapshot (name/price/image) rather than references, and are always server-priced — the client-submitted `totalAmount` is validated against a server-computed total (within a Rs. 1 tolerance) to prevent price tampering.
  - Only Cash-on-Delivery (`cod`) is actually processed; `khalti`/`esewa`/`card`/`bank_transfer` exist as schema enum values but there's no integrated payment gateway per `API.md`.

### 2.3 Authentication & Authorization

- Separate JWT secrets/tokens for **admin** and **user** roles (`JWT_SECRET`/`JWT_ADMIN_SECRET`), each with its own refresh secret, preventing a stolen user token from being replayed against admin routes.
- Access tokens are short-lived and passed via `Authorization: Bearer <token>`; refresh tokens are delivered as an **httpOnly** cookie scoped to `/api/v1/auth` (configurable `SameSite` via `COOKIE_SAMESITE`).
- `authMiddleware.ts` exposes `requireAuth`, `requireAdmin`, and `optionalAuth` (the latter tries the user secret, then falls back to the admin secret, so admin callers are still recognized on public/optional routes).
- Passwords are hashed with bcrypt (`genSalt(10)`) in a Mongoose `pre('save')` hook on both `User` and `Admin` models; the `password` field is `select: false` by default so it's excluded from normal queries.
- A separate lightweight `sessionMiddleware` issues an httpOnly, `SameSite=strict` `sessionId` cookie for **guest cart tracking** (distinct from the auth/refresh cookie).
- Order tracking by non-authenticated users (`GET /orders/track/:id`) is gated by requiring the order's phone number to match, rather than requiring login.

### 2.4 Security Middleware (`src/app.ts`)

Applied in a deliberate order (CORS first):

1. **CORS** — origin allow-list; in development, any `localhost`/`127.0.0.1` origin is auto-allowed; in production, restricted to `CORS_ORIGIN` env list. Credentials are enabled, and disallowed origins get a `200` with no CORS headers (so the browser reports a CORS failure rather than the server leaking a 500).
2. **`trust proxy`** enabled for correct client IPs behind Render's proxy.
3. **Helmet** — default security headers, with CSP explicitly disabled and `crossOriginResourcePolicy: cross-origin` (needed for cross-origin image/API access from the separately hosted frontend).
4. **Body size limits** — JSON/urlencoded capped at 10 MB.
5. A hand-rolled minimal cookie parser (avoids pulling in `cookie-parser` as a dependency).
6. **Compression** (gzip).
7. **`express-mongo-sanitize`** — strips `$`/`.` from request bodies/queries to block MongoDB operator-injection.
8. **`hpp`** — collapses duplicate query params (HTTP Parameter Pollution protection), with a whitelist for legitimately repeatable params (`sort`, `fields`, `page`, `limit`, `category`, `status`).
9. Structured request logging (`x-request-id`, method/path/status/duration/IP/UA) via a custom logger.
10. Per-request 30s timeout (`requestTimeout`) and a `dbReady` gate that short-circuits with `503` if MongoDB isn't connected, so requests don't hang on the driver's internal queue.
11. Centralized `errorHandler` / `notFoundHandler` as the last middleware.

**Observation**: `express-rate-limit` is listed as a dependency and appears in `package.json`, but is **explicitly commented out / disabled** in `app.ts` ("intentionally disabled for now (per request)"). `API.md` still describes `/auth/login`, `/auth/register`, and `/coupons/validate` as "rate-limited," so there is a discrepancy between the documented contract and the current runtime behavior — worth flagging if brute-force protection on auth endpoints is a coursework/security requirement.

### 2.5 API Surface (from `API.md`)

- **Auth**: admin login, user register/login, refresh (rotates refresh token), logout (revokes it), admin profile/password management.
- **Products**: public listing with pagination/search/price-range/offer filtering (effective/discounted price aware), admin CRUD with image upload.
- **Orders**: total calculation (server-side, coupon-aware), order creation (stock decremented atomically with rollback on failure), phone-gated public tracking, owner-checked user history, full admin management incl. stats and status transitions (cancelling restores stock).
- **Cart**: client-side with `/user/cart` sync endpoints only.
- **Users**: profile, avatar upload, password change, saved addresses, favorites/wishlist, admin wishlist view.
- **Catalogue extras**: categories, banners, brands, flash sales, seasonal "sale categories" (with homepage curation and season activation), coupons (validation + admin analytics).

### 2.6 Testing & Tooling

- `tests/unit/` — price calculator, validation, identity logic.
- `tests/integration/endpoints.spec.ts` — full HTTP-level tests against an in-memory MongoDB instance.
- Operational scripts: `scripts/diagnose*.ts`, `scripts/reset-db.ts`, seed scripts for demo/fashion product data, admin token generation, and smoke tests.

---

## 3. Frontend (`frontend-epsalae/`)

### 3.1 Stack

- **Framework**: React 19 + Vite 7
- **Styling**: Tailwind CSS 4 (via `@tailwindcss/vite`), `shadcn-ui` primitives, `class-variance-authority`/`clsx`/`tailwind-merge`
- **Routing**: React Router 7
- **State management**: Zustand (cart, favorites, auth, banners, categories, orders, products, promo codes — split between `src/store/` and `src/components/store/`)
- **Server state**: TanStack React Query, with hooks per resource (`hooks/`, `components/hooks/`)
- **Forms**: `react-hook-form` + `zod` resolvers
- **UX**: Framer Motion, Embla Carousel, `react-hot-toast`/`react-toastify`/`sonner` for notifications, `react-lazy-load-image-component`
- **Testing**: Playwright (devDependency, for e2e)
- **Deployment**: multi-target — Vercel (`vercel.json`), Netlify (`netlify.toml`), and Hostinger (`HOSTINGER-DEPLOY.md`, `public/.htaccess`)

### 3.2 Application Structure

- **`components/homepage/`** — storefront building blocks: navbar, search bar, hero banner, category grid, featured carousel, sale section, seasonal badges, trust/footer sections, and the product card (`product.jsx`).
- **`components/product-details/`** — single product page component.
- **`components/admin/`** — full admin console: layout/sidebar/header/footer plus CRUD screens for products, categories, banners, sales, sale-products, coupons ("promocode"), orders, bulk upload, and wishlist review.
- **`components/api/`** — thin Axios wrapper modules per resource (`productapi`, `orderapi`, `categoryai`, `bannerapi`, `bulkapi`, `promocode`, `userapi`, `publicapi`, `base`).
- **`components/auth/AuthModal.jsx`** — shared login/register modal.
- **`components/store/`** — Zustand stores for auth, categories, banners, orders, products, promo codes.
- **`pages/`** — routed pages: account dashboard/orders/addresses/security/wishlist, cart, checkout, order success/invoice, order tracking, sale hub/page, product listing, admin login/dashboard, login/register, profile setup, 404.
- **Route guards**: `ProtectedRoute` (admin-only, wraps `/admin/*`) and `UserProtectedRoute` (logged-in customer, wraps checkout, profile setup, and `/account/*`).
- **Routing layout split**: admin routes render without the public header/footer; public routes share a `PublicLayout` with `Navbar` + `SearchBar` + `Footer`; a catch-all `:slug` route redirects bare slugs (e.g. `/wintersale`) to `/sale/:slug` for admin-authored promotional links.

### 3.3 Notable Patterns

- API base client (`components/api/base.jsx`) centralizes Axios config, presumably including the bearer token attachment and refresh handling (consistent with the backend's access/refresh token model).
- Environment-specific config (`.env.development`, `.env.production`, `src/config/index.js`) to point at different API origins per deployment target.
- Utility modules for price/currency formatting (`utils/price.js`, `utils/priceCalculator.js`) mirror the backend's server-side pricing logic for consistent display.

---

## 4. Cross-Cutting Security Notes

Strengths observed:
- Role-segregated JWT secrets (admin vs. user) prevent cross-role token replay.
- httpOnly, `SameSite`-scoped cookies for refresh tokens and guest sessions (not accessible to JS, mitigating XSS token theft).
- Server-side price/stock authority on order creation (prevents client-side total tampering and overselling via atomic stock decrement with rollback).
- NoSQL injection mitigation (`express-mongo-sanitize`) and HPP protection.
- Passwords never returned by default (`select: false`) and always bcrypt-hashed.
- Order tracking for guests requires phone-number confirmation rather than exposing orders by ID alone.

Potential gaps worth investigating further (useful given this appears to be a security-focused coursework project):
- **Rate limiting is disabled** in `app.ts` despite being documented as active in `API.md` and present as a dependency — auth and coupon-validation endpoints currently have no brute-force throttling at the app level.
- **CSP is disabled** in the Helmet config (`contentSecurityPolicy: false`), which removes a layer of XSS mitigation on any HTML the API might serve (e.g., Swagger UI, error pages).
- Multiple `.env*` files exist in the backend root (`.env`, `.env.dev`, `.env.prod`, `.env.example`) — worth confirming the non-example files are excluded from version control and don't contain committed secrets.
- The backend README's leftover merge-conflict markers suggest incomplete conflict resolution; worth double-checking no other files have similar artifacts.

---

## 5. Summary

Epasaley is a reasonably mature, security-conscious e-commerce reference application: a modular TypeScript/Express/MongoDB API with layered architecture, dual-role JWT auth, server-authoritative pricing, and standard hardening middleware (Helmet, mongo-sanitize, HPP), paired with a modern React 19/Vite/Tailwind SPA offering both a customer storefront and a full admin back-office. The most actionable finding for a security review is the gap between the documented "rate-limited" auth/coupon endpoints and the fact that rate limiting is currently disabled in code.
