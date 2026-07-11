# Epasaley API — Contract Reference (v1)

Base URL: `{API_ORIGIN}/api/v1` · Envelope: `{ success, message, data, meta? }` (lists carry pagination in `meta: { page, limit, total, totalPages }`) · Errors: `{ success: false, message }` with 400/401/403/404/408/409/413/422/429/500/503 · Auth: `Authorization: Bearer <accessToken>`; refresh token is an httpOnly cookie scoped to `/api/v1/auth` (`COOKIE_SAMESITE` env: `lax` same-site / `none` cross-site).

## Auth
| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/auth/login` | — (rate-limited) | `{email, password}` | `data:{token, accessToken, admin:{id, adminId, name, email, role}}` + refresh cookie |
| POST | `/auth/register` | — (rate-limited) | `{name, email, phone?, password}` | 201 `data:{id, name, email}` (no token — log in after) |
| POST | `/auth/user/login` | — (rate-limited) | `{email, password}` | `data:{token, accessToken, user:{id, name, email}, needsOnboarding}` + refresh cookie |
| POST | `/auth/refresh` | refresh cookie (or `{refreshToken}`) | — | `data:{token, accessToken}` (rotates the refresh token) |
| POST | `/auth/logout` | refresh cookie | — | revokes refresh token, clears cookie |
| GET | `/auth/admin/me` | admin | — | admin profile |
| PUT | `/auth/admin/profile` | admin | `{name?, email?}` | updated profile |
| PUT | `/auth/admin/password` | admin | `{currentPassword, newPassword}` | — |

## Products
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/products` | public | Query: `page, limit(≤100), search, categoryId, hasOffer, minPrice, maxPrice, sortBy, order(asc/desc)`. Public sees **active products only**; admins may add `includeInactive=true`. Price range filters the *effective* price (discount price when an offer is active). |
| GET | `/products/offers` | public | active offers, paginated |
| GET | `/products/category/:categoryId` | public | paginated |
| GET | `/products/:id` | public | `id` is the custom string id (`prod_…`) |
| POST | `/products` | admin | multipart; image file in field `image`; body: `name, price, category_id, description?, stock?, discountPrice?, hasOffer?, saleStartDate?, saleEndDate?, imageUrl?, isActive?` |
| PUT | `/products/:id` | admin | same fields, all optional; echoing the existing `imageUrl` keeps the current image |
| DELETE | `/products/:id` | admin | also removes the Cloudinary image |

## Orders (COD only — no online payment gateway)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/orders/calculate-total` | public | `{cartItems:[{productId, quantity}], couponCode?, userId?, email?, phone?}` → full breakdown `{items, subtotal, couponDiscount, discountedSubtotal, vatRate(0.13), vatAmount, shipping(150 / free ≥5000), total, couponError}` |
| POST | `/orders` | public (optionalAuth) | `{name, first_name?, last_name?, email?, phone, district, city, address, description, items:[{productId, quantity}], couponCode?, totalAmount, paymentMethod:'cod'}`. Items are **server-priced**; `totalAmount` must match the server total within Rs. 1; stock is decremented atomically (rolled back on failure); `user_id` is taken **only from a verified JWT**. 201 → full order. |
| GET | `/orders/track/:id?phone=98…` | public | phone must match the order (digits compared); otherwise 404 |
| GET | `/orders/my/:id` | user | owner-checked single order |
| GET | `/user/orders` | user | own history, paginated (`data:{orders, pagination}`) |
| GET | `/orders` | admin | filters: `status, userId, startDate, endDate, page, limit, sortBy, order` |
| GET | `/orders/stats` | admin | counts by status + `totalRevenue` |
| GET | `/orders/status/:status`, `/orders/user/:userId`, `/orders/:id`, `/orders/:id/status` | admin | |
| PUT | `/orders/:id/status` | admin | `{status, note?, location?}`; transition → `cancelled` restores stock |

## Cart
Client-side (browser storage). Server sync for logged-in users:
`GET /user/cart` → `data: items[]` · `POST /user/cart/merge {items}` → replaces the saved cart.
The legacy `/cart/*` DB module is **deprecated and unmounted** (incompatible with the catalogue's string ids / no-variant model).

## Users
`GET/PUT /user/profile` · `POST /user/profile/avatar` (multipart `image`) · `PUT /user/profile/password` · `GET/POST /user/addresses` + `DELETE /user/addresses/:index` · `GET/POST/DELETE /user/favorites` (`{productId}`) · `GET /user/admin/wishlists` (admin).

## Catalogue extras
Categories: `GET /categories`, `/categories/active`, `/categories/slug/:slug`, `/categories/:id`; admin CRUD (multipart `image`).
Banners: `GET /banners`, `/banners/active`, `/banners/:id`; admin CRUD.
Brands: `GET /brands` (public, active), `GET /brands/all` (admin), `POST /brands` (multipart `image`, `{name?}`), `PUT /brands/:id`, `DELETE /brands/:id`.
Flash sales: `GET /flash-sales`, `/active`, `/product/:productId`, `/:id`, `/:id/is-active`; admin POST/PUT/DELETE, `POST /:id/increment-stock`, `POST /deactivate-expired`.
Sale categories: `GET /sale-categories/homepage`, `/active`, `/slug/:slug`; admin `GET /`, `GET/:id`, POST/PUT/DELETE, `PUT /:id/products`, `POST /:id/banner` (multipart), `POST /activate-season`, `POST /:id/products-by-category`.
Coupons: `POST /coupons/validate` (public+optionalAuth, rate-limited) → `{valid, code, discount_type, discount_value, discountAmount, …}`; admin `GET /coupons`, `GET/PUT/DELETE /coupons/:code`, `POST /coupons`, `GET /coupons/:code/analytics`.

## Environment variables
`NODE_ENV, PORT, MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET, JWT_ADMIN_SECRET, JWT_ADMIN_REFRESH_SECRET, JWT_ACCESS_EXPIRE, JWT_REFRESH_EXPIRE, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CORS_ORIGIN, COOKIE_SAMESITE` (see `.env.example`).

## Verification
`npm run build` (tsc) · `npm run verify:e2e` (in-memory MongoDB end-to-end smoke: auth, product visibility/filters, server-side pricing, stock atomicity, tracking phone-gate, owner checks, brands, refresh/logout, addresses).
