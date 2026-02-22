import type { ProviderCredentials } from '../types';
import type { OlxTokenResponse, OlxAdvertsResponse } from './types';
import { tracker } from '@/analytics';

const OLX_AUTH_BASE = 'https://www.olx.pl';
const OLX_API_BASE = 'https://www.olx.pl/api';

/**
 * Build API base URL — uses proxyUrl if provided (to bypass CORS)
 */
function getApiBase(credentials: ProviderCredentials): string {
  return credentials.proxyUrl
    ? `${credentials.proxyUrl.replace(/\/$/, '')}/api`
    : OLX_API_BASE;
}

/**
 * Build the OLX OAuth2 authorization URL.
 * Redirects user to OLX to grant access.
 *
 * OLX does NOT support PKCE — only state parameter for CSRF protection.
 *
 * @see https://developer.olx.pl/api/doc#section/Authentication/Grant-type:-authorization_code
 */
export function buildAuthorizationUrl(
  credentials: ProviderCredentials,
  options?: {
    state?: string;
  },
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: credentials.clientId!,
    scope: 'read write v2',
  });

  if (credentials.redirectUri) {
    params.set('redirect_uri', credentials.redirectUri);
  }

  if (options?.state) {
    params.set('state', options.state);
  }

  return `${OLX_AUTH_BASE}/oauth/authorize/?${params.toString()}`;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 *
 * OLX requires client_secret — no PKCE support.
 * Sends credentials as JSON body fields (not Basic auth).
 *
 * @see https://developer.olx.pl/api/doc#section/Authentication/Grant-type:-authorization_code
 */
export async function exchangeAuthorizationCode(
  credentials: ProviderCredentials,
  code: string,
): Promise<OlxTokenResponse> {
  const base = getApiBase(credentials);
  const url = `${base}/open/oauth/token`;

  tracker.debug('[OLX API] Exchanging authorization code');

  const body: Record<string, string> = {
    grant_type: 'authorization_code',
    client_id: credentials.clientId!,
    client_secret: credentials.clientSecret!,
    code,
    scope: 'v2 read write',
  };

  if (credentials.redirectUri) {
    body.redirect_uri = credentials.redirectUri;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    tracker.debug('[OLX API] Code exchange failed', { status: response.status, errorText });
    throw new Error(`OLX code exchange failed: ${response.status} — ${errorText}`);
  }

  const data = await response.json() as OlxTokenResponse;
  tracker.debug('[OLX API] Authorization code exchanged successfully');

  return data;
}

/**
 * Refresh the access token using the refresh token.
 *
 * @see https://developer.olx.pl/api/doc#section/Authentication/Grant-type:-refresh_token-when-access-token-is-expired
 */
export async function refreshAccessToken(
  credentials: ProviderCredentials,
): Promise<OlxTokenResponse> {
  const base = getApiBase(credentials);
  const url = `${base}/open/oauth/token`;

  tracker.debug('[OLX API] Refreshing access token');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: credentials.clientId!,
      client_secret: credentials.clientSecret!,
      refresh_token: credentials.refreshToken!,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    tracker.debug('[OLX API] Token refresh failed', { status: response.status, errorText });
    throw new Error(`OLX token refresh failed: ${response.status}`);
  }

  const data = await response.json() as OlxTokenResponse;
  tracker.debug('[OLX API] Token refreshed successfully');

  return data;
}

/**
 * Fetch user's adverts.
 *
 * @see https://developer.olx.pl/api/doc#tag/Adverts/paths/~1adverts/get
 */
export async function fetchAdverts(
  credentials: ProviderCredentials,
  options?: {
    offset?: number;
    limit?: number;
  },
): Promise<OlxAdvertsResponse> {
  const base = getApiBase(credentials);
  const params = new URLSearchParams();

  if (options?.offset !== undefined) params.set('offset', String(options.offset));
  if (options?.limit !== undefined) params.set('limit', String(options.limit));

  const queryString = params.toString();
  const url = `${base}/partner/adverts${queryString ? `?${queryString}` : ''}`;

  tracker.debug('[OLX API] Fetching adverts', { url, options });

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      Version: '2.0',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    tracker.debug('[OLX API] Error response', { status: response.status, errorText });
    throw new Error(`OLX API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as OlxAdvertsResponse;
  tracker.debug('[OLX API] Fetched adverts', { count: data.data?.length ?? 0 });

  return data;
}

/**
 * Fetch authenticated user info.
 *
 * @see https://developer.olx.pl/api/doc#tag/Users/paths/~1users~1me/get
 */
export async function fetchCurrentUser(
  credentials: ProviderCredentials,
): Promise<{ id: number; email: string; name: string }> {
  const base = getApiBase(credentials);
  const url = `${base}/partner/users/me`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      Version: '2.0',
    },
  });

  if (!response.ok) {
    throw new Error(`OLX API error fetching user: ${response.status}`);
  }

  return response.json();
}
