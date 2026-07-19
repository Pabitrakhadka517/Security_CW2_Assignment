// Reads the csrfToken cookie set by the backend alongside the refresh-token
// cookie (double-submit CSRF pattern — see backend middlewares/csrf.middleware.ts).
// Not httpOnly, so it's readable here; echoed back as the X-CSRF-Token header
// on /auth/refresh and /auth/logout.
export function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
