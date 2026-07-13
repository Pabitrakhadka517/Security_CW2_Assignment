// Minimal client-side JWT payload reader. This NEVER verifies the
// signature — it only reads claims already carried in a token issued by our
// own backend, purely to drive UI decisions (which nav to show, which route
// guard to redirect through). Every actual authorization decision is
// re-checked server-side against the verified token, so a tampered payload
// here can make the UI show the wrong thing but can't grant real access.
export function decodeJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const payload = decodeJwt(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 <= Date.now();
}

export function getRoleFromToken(token) {
  return decodeJwt(token)?.role ?? null;
}
