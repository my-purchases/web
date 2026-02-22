/**
 * PKCE (Proof Key for Code Exchange) helper functions.
 * Used to secure the OAuth2 Authorization Code flow for browser-based apps.
 *
 * Flow:
 * 1. Generate a random `code_verifier` (43-128 chars)
 * 2. Compute `code_challenge = BASE64URL(SHA256(code_verifier))`
 * 3. Include `code_challenge` + `code_challenge_method=S256` in the authorize URL
 * 4. When exchanging the code for a token, send `code_verifier` + `client_id` (no Basic auth)
 *
 * @see https://developer.allegro.pl/tutorials/uwierzytelnianie-i-autoryzacja-zlq9e75GdIR
 * @see https://tools.ietf.org/html/rfc7636
 */

const STORAGE_KEY_VERIFIER = 'allegro_pkce_code_verifier';
const STORAGE_KEY_STATE = 'allegro_oauth_state';

/**
 * Generate a cryptographically random string of given length.
 */
function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => charset[v % charset.length]).join('');
}

/**
 * Compute SHA-256 hash and return as ArrayBuffer.
 */
async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(plain));
}

/**
 * Base64url-encode a buffer (no padding, URL-safe).
 */
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generate a PKCE code_verifier and code_challenge pair.
 * code_challenge = BASE64URL(SHA256(code_verifier))
 */
export async function generatePkce(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const codeVerifier = generateRandomString(64); // 43-128 chars
  const hash = await sha256(codeVerifier);
  const codeChallenge = base64UrlEncode(hash);
  return { codeVerifier, codeChallenge };
}

/**
 * Generate a random state parameter for CSRF protection.
 */
export function generateState(): string {
  return generateRandomString(32);
}

// ─── SessionStorage persistence ─────────────────────────────

export function saveCodeVerifier(verifier: string): void {
  sessionStorage.setItem(STORAGE_KEY_VERIFIER, verifier);
}

export function loadCodeVerifier(): string | null {
  return sessionStorage.getItem(STORAGE_KEY_VERIFIER);
}

export function clearCodeVerifier(): void {
  sessionStorage.removeItem(STORAGE_KEY_VERIFIER);
}

export function saveState(state: string): void {
  sessionStorage.setItem(STORAGE_KEY_STATE, state);
}

export function loadState(): string | null {
  return sessionStorage.getItem(STORAGE_KEY_STATE);
}

export function clearState(): void {
  sessionStorage.removeItem(STORAGE_KEY_STATE);
}
