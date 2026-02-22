import type { ProviderCredentials } from '../types';
import type {
  AllegroCheckoutFormsResponse,
  AllegroDeviceCodeResponse,
  AllegroDeviceTokenError,
  AllegroOfferDetails,
  AllegroTokenResponse,
} from './types';
import { tracker } from '@/analytics';

const ALLEGRO_API_BASE = 'https://api.allegro.pl';
const ALLEGRO_AUTH_BASE = 'https://allegro.pl';

/**
 * Build the base URL — uses proxyUrl if provided (to bypass CORS)
 */
function getApiBase(credentials: ProviderCredentials): string {
  return credentials.proxyUrl
    ? `${credentials.proxyUrl}/api`
    : ALLEGRO_API_BASE;
}

function getAuthBase(credentials: ProviderCredentials): string {
  return credentials.proxyUrl
    ? credentials.proxyUrl.replace(/\/$/, '')
    : ALLEGRO_AUTH_BASE;
}

/**
 * Fetch user's purchase history (checkout forms)
 */
export async function fetchCheckoutForms(
  credentials: ProviderCredentials,
  options?: {
    offset?: number;
    limit?: number;
    boughtAtGte?: string;
    boughtAtLte?: string;
  },
): Promise<AllegroCheckoutFormsResponse> {
  const base = getApiBase(credentials);
  const params = new URLSearchParams();

  if (options?.offset !== undefined) params.set('offset', String(options.offset));
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  if (options?.boughtAtGte) params.set('lineItems.boughtAt.gte', options.boughtAtGte);
  if (options?.boughtAtLte) params.set('lineItems.boughtAt.lte', options.boughtAtLte);

  const url = `${base}/order/checkout-forms?${params.toString()}`;

  tracker.debug('[Allegro API] Fetching checkout forms', { url, options });

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      Accept: 'application/vnd.allegro.public.v1+json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    tracker.debug('[Allegro API] Error response', { status: response.status, errorText });
    throw new Error(`Allegro API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as AllegroCheckoutFormsResponse;
  tracker.debug('[Allegro API] Fetched checkout forms', {
    count: data.count,
    totalCount: data.totalCount,
  });

  return data;
}

/**
 * Fetch offer details (for image and category)
 */
export async function fetchOfferDetails(
  credentials: ProviderCredentials,
  offerId: string,
): Promise<AllegroOfferDetails> {
  const base = getApiBase(credentials);
  const url = `${base}/sale/offers/${offerId}`;

  tracker.debug('[Allegro API] Fetching offer details', { offerId });

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      Accept: 'application/vnd.allegro.public.v1+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Allegro API error fetching offer ${offerId}: ${response.status}`);
  }

  return response.json() as Promise<AllegroOfferDetails>;
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken(
  credentials: ProviderCredentials,
): Promise<AllegroTokenResponse> {
  const base = getAuthBase(credentials);
  const url = `${base}/auth/oauth/token`;

  const basicAuth = btoa(`${credentials.clientId}:${credentials.clientSecret}`);

  tracker.debug('[Allegro API] Refreshing access token');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: credentials.refreshToken!,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    tracker.debug('[Allegro API] Token refresh failed', { status: response.status, errorText });
    throw new Error(`Allegro token refresh failed: ${response.status}`);
  }

  const data = await response.json() as AllegroTokenResponse;
  tracker.debug('[Allegro API] Token refreshed successfully');

  return data;
}

/**
 * Build the Allegro OAuth2 authorization URL.
 * Redirects user to Allegro to grant access.
 * Supports PKCE (code_challenge + code_challenge_method=S256) and state parameter.
 */
export function buildAuthorizationUrl(
  credentials: ProviderCredentials,
  options?: {
    codeChallenge?: string;
    state?: string;
  },
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: credentials.clientId!,
    redirect_uri: credentials.redirectUri!,
  });

  if (options?.codeChallenge) {
    params.set('code_challenge', options.codeChallenge);
    params.set('code_challenge_method', 'S256');
  }

  if (options?.state) {
    params.set('state', options.state);
  }

  return `${ALLEGRO_AUTH_BASE}/auth/oauth/authorize?${params.toString()}`;
}

// ─── Device Flow ────────────────────────────────────────────

/**
 * Request a device code + user code from Allegro.
 * POST https://allegro.pl/auth/oauth/device?client_id={client_id}
 */
export async function requestDeviceCode(
  credentials: ProviderCredentials,
): Promise<AllegroDeviceCodeResponse> {
  const base = getAuthBase(credentials);
  const url = `${base}/auth/oauth/device?client_id=${encodeURIComponent(credentials.clientId!)}`;
  const basicAuth = btoa(`${credentials.clientId}:${credentials.clientSecret}`);

  tracker.debug('[Allegro Device] Requesting device code');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    tracker.debug('[Allegro Device] Device code request failed', { status: response.status, errorText });
    throw new Error(`Device code request failed: ${response.status} — ${errorText}`);
  }

  const data = await response.json() as AllegroDeviceCodeResponse;
  tracker.debug('[Allegro Device] Got device code', {
    userCode: data.user_code,
    expiresIn: data.expires_in,
    interval: data.interval,
  });

  return data;
}

/**
 * Poll the token endpoint for device flow.
 * Returns the token response on success, or throws with the error type.
 */
export async function pollDeviceToken(
  credentials: ProviderCredentials,
  deviceCode: string,
): Promise<{ ok: true; data: AllegroTokenResponse } | { ok: false; error: string }> {
  const base = getAuthBase(credentials);
  const url = `${base}/auth/oauth/token`;
  const basicAuth = btoa(`${credentials.clientId}:${credentials.clientSecret}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: deviceCode,
    }),
  });

  if (response.ok) {
    const data = await response.json() as AllegroTokenResponse;
    return { ok: true, data };
  }

  // Parse the error body
  const errorBody = await response.json().catch(() => ({ error: 'unknown' })) as AllegroDeviceTokenError;
  return { ok: false, error: errorBody.error };
}

// ─── Authorization Code Flow ────────────────────────────────

/**
 * Exchange an authorization code for access + refresh tokens.
 * When codeVerifier is provided (PKCE), sends client_id + code_verifier in body
 * instead of Basic auth header — avoids exposing client_secret in the browser.
 */
export async function exchangeAuthorizationCode(
  credentials: ProviderCredentials,
  code: string,
  codeVerifier?: string,
): Promise<AllegroTokenResponse> {
  const base = getAuthBase(credentials);
  const url = `${base}/auth/oauth/token`;

  tracker.debug('[Allegro API] Exchanging authorization code', { pkce: !!codeVerifier });

  const body: Record<string, string> = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: credentials.redirectUri!,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (codeVerifier) {
    // PKCE mode: send client_id + code_verifier, no Basic auth
    body.client_id = credentials.clientId!;
    body.code_verifier = codeVerifier;
  } else {
    // Legacy mode: Basic auth
    headers.Authorization = `Basic ${btoa(`${credentials.clientId}:${credentials.clientSecret}`)}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: new URLSearchParams(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    tracker.debug('[Allegro API] Code exchange failed', { status: response.status, errorText });
    throw new Error(`Allegro code exchange failed: ${response.status} — ${errorText}`);
  }

  const data = await response.json() as AllegroTokenResponse;
  tracker.debug('[Allegro API] Authorization code exchanged successfully');

  return data;
}
