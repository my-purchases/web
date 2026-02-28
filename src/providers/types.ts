// ─── Common Provider Types ──────────────────────────────────
// This is the shared interface that all providers must implement.

import type { Purchase } from '@/db';

/**
 * Provider type determines how data is acquired:
 * - 'api': Fetches data from the provider's REST API
 * - 'import': Accepts file uploads (CSV/JSON) from the user
 * - 'hybrid': Supports both API fetch and file import
 */
export type ProviderType = 'api' | 'import' | 'hybrid';

/**
 * Metadata about a provider — used for UI display and registration
 */
export interface ProviderMeta {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  type: ProviderType;
  supportedImportFormats?: string[]; // e.g., ['csv', 'json']
  description?: string;
  websiteUrl?: string;
  disabled?: boolean; // If true, provider is shown but greyed out (not yet available)
}

/**
 * Credentials structure stored in invitation files.
 * Different providers may use different fields.
 */
export interface ProviderCredentials {
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string; // ISO 8601
  apiKey?: string;
  proxyUrl?: string; // Optional CORS proxy URL
  redirectUri?: string; // OAuth redirect URI
  [key: string]: unknown; // Provider-specific fields
}

/**
 * Options for fetching purchases from API providers
 */
export interface FetchPurchasesOptions {
  since?: string; // ISO 8601 — fetch purchases newer than this date
  cursor?: string; // Pagination cursor from previous fetch
  limit?: number; // Max items per page
}

/**
 * Result of a purchase fetch operation
 */
export interface FetchPurchasesResult {
  purchases: Purchase[];
  nextCursor?: string; // For pagination
  hasMore: boolean;
  totalCount?: number;
}

/**
 * Result of a token refresh operation
 */
export interface RefreshTokenResult {
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt: string; // ISO 8601
}

/**
 * Options for parsing imported files
 */
export interface ParseImportOptions {
  format: string; // 'csv' | 'json' | etc.
  encoding?: string; // Default: 'utf-8'
}

/**
 * The unified PurchaseProvider interface.
 * Each provider implements the methods relevant to its type.
 */
export interface PurchaseProvider {
  meta: ProviderMeta;

  // ─── API Methods (for 'api' and 'hybrid' providers) ────
  
  /**
   * Fetch purchases from the provider's API.
   * Only implemented by 'api' and 'hybrid' providers.
   */
  fetchPurchases?(
    credentials: ProviderCredentials,
    options?: FetchPurchasesOptions,
  ): Promise<FetchPurchasesResult>;

  /**
   * Refresh the OAuth access token.
   * Only implemented by 'api' and 'hybrid' providers.
   */
  refreshToken?(
    credentials: ProviderCredentials,
  ): Promise<RefreshTokenResult>;

  /**
   * Check if the current credentials are valid / token not expired.
   */
  isAuthenticated?(credentials: ProviderCredentials): boolean;

  // ─── Import Methods (for 'import' and 'hybrid' providers) ────

  /**
   * Parse an imported file into purchases.
   * Only implemented by 'import' and 'hybrid' providers.
   */
  parseImportFile?(
    file: File,
    options?: ParseImportOptions,
  ): Promise<Purchase[]>;

  /**
   * Validate that an imported file has the expected format.
   * Returns error messages if invalid, or empty array if valid.
   */
  validateImportFile?(
    file: File,
    options?: ParseImportOptions,
  ): Promise<string[]>;
}
