/**
 * OLX OAuth2 state helpers.
 * OLX does not support PKCE — it requires client_secret for token exchange.
 * We use the `state` parameter for CSRF protection.
 */

const STORAGE_KEY_STATE = 'olx_oauth_state';

/**
 * Generate a cryptographically random string of given length.
 */
function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => charset[v % charset.length]).join('');
}

/**
 * Generate a random state parameter for CSRF protection.
 */
export function generateState(): string {
  return generateRandomString(32);
}

// ─── SessionStorage persistence ─────────────────────────────

export function saveState(state: string): void {
  sessionStorage.setItem(STORAGE_KEY_STATE, state);
}

export function loadState(): string | null {
  return sessionStorage.getItem(STORAGE_KEY_STATE);
}

export function clearState(): void {
  sessionStorage.removeItem(STORAGE_KEY_STATE);
}
