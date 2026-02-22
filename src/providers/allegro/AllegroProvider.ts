import type { PurchaseProvider, ProviderCredentials, FetchPurchasesOptions, FetchPurchasesResult, RefreshTokenResult } from '../types';
import type { Purchase } from '@/db';
import { fetchCheckoutForms, refreshAccessToken } from './api';
import { mapCheckoutFormToPurchases, mapRawJsonToPurchases, mapCsvToPurchases, validateAllegroCsv } from './mapper';
import { tracker } from '@/analytics';

const ITEMS_PER_PAGE = 100;

export const allegroProvider: PurchaseProvider = {
  meta: {
    id: 'allegro',
    name: 'Allegro',
    icon: 'ShoppingBag',
    type: 'hybrid',
    supportedImportFormats: ['csv', 'json'],
    description: 'Poland\'s largest online marketplace',
    websiteUrl: 'https://allegro.pl',
  },

  isAuthenticated(credentials: ProviderCredentials): boolean {
    if (!credentials.accessToken) return false;
    if (credentials.tokenExpiresAt) {
      return new Date(credentials.tokenExpiresAt) > new Date();
    }
    return true;
  },

  async fetchPurchases(
    credentials: ProviderCredentials,
    options?: FetchPurchasesOptions,
  ): Promise<FetchPurchasesResult> {
    tracker.debug('[Allegro] Fetching purchases', { options });

    const offset = options?.cursor ? parseInt(options.cursor, 10) : 0;
    const limit = options?.limit ?? ITEMS_PER_PAGE;

    const response = await fetchCheckoutForms(credentials, {
      offset,
      limit,
      boughtAtGte: options?.since,
    });

    const purchases = response.checkoutForms.flatMap((form) =>
      mapCheckoutFormToPurchases(form),
    );

    const nextOffset = offset + response.count;
    const hasMore = nextOffset < response.totalCount;

    tracker.debug('[Allegro] Fetched purchases batch', {
      count: purchases.length,
      totalCount: response.totalCount,
      hasMore,
    });

    return {
      purchases,
      nextCursor: hasMore ? String(nextOffset) : undefined,
      hasMore,
      totalCount: response.totalCount,
    };
  },

  async refreshToken(
    credentials: ProviderCredentials,
  ): Promise<RefreshTokenResult> {
    tracker.debug('[Allegro] Refreshing token');

    const tokenData = await refreshAccessToken(credentials);

    const expiresAt = new Date(
      Date.now() + tokenData.expires_in * 1000,
    ).toISOString();

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt: expiresAt,
    };
  },

  async parseImportFile(file: File): Promise<Purchase[]> {
    tracker.debug('[Allegro] Parsing import file', { name: file.name, size: file.size });

    const text = await file.text();

    if (file.name.endsWith('.csv')) {
      const purchases = mapCsvToPurchases(text);
      tracker.debug('[Allegro] Parsed CSV import', { count: purchases.length });
      return purchases;
    }

    // JSON import (Allegro API format)
    const data = JSON.parse(text) as unknown;
    return mapRawJsonToPurchases(data);
  },

  async validateImportFile(file: File): Promise<string[]> {
    const errors: string[] = [];

    if (file.name.endsWith('.csv')) {
      try {
        const text = await file.text();
        return validateAllegroCsv(text);
      } catch {
        errors.push('Could not read CSV file');
        return errors;
      }
    }

    if (!file.name.endsWith('.json')) {
      errors.push('File must be a CSV (.csv) or JSON (.json) file');
      return errors;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text) as unknown;

      if (!Array.isArray(data) && !(data as Record<string, unknown>).checkoutForms) {
        errors.push(
          'JSON must contain either an array of checkout forms or an object with a "checkoutForms" property',
        );
      }
    } catch {
      errors.push('File is not valid JSON');
    }

    return errors;
  },
};
