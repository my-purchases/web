import type { PurchaseProvider, ProviderCredentials, FetchPurchasesOptions, FetchPurchasesResult, RefreshTokenResult } from '../types';
import type { Purchase } from '@/db';
import { fetchAdverts, refreshAccessToken } from './api';
import { mapAdvertsToPurchases } from './mapper';
import { tracker } from '@/analytics';

const PROVIDER_ID = 'olx';
const ITEMS_PER_PAGE = 50;

interface OlxImportItem {
  id?: string;
  title?: string;
  price?: number | string;
  currency?: string;
  date?: string;
  category?: string;
  imageUrl?: string;
  url?: string;
  quantity?: number;
}

export const olxProvider: PurchaseProvider = {
  meta: {
    id: PROVIDER_ID,
    name: 'OLX',
    icon: 'Tag',
    type: 'hybrid',
    supportedImportFormats: ['json'],
    description: 'OLX — buy & sell locally. Connect via OAuth or import JSON.',
    websiteUrl: 'https://olx.pl',
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
    tracker.debug('[OLX] Fetching adverts', { options });

    const offset = options?.cursor ? parseInt(options.cursor, 10) : 0;
    const limit = options?.limit ?? ITEMS_PER_PAGE;

    const response = await fetchAdverts(credentials, { offset, limit });

    const adverts = response.data ?? [];
    const purchases = mapAdvertsToPurchases(adverts);

    // OLX doesn't return totalCount in the adverts response,
    // so we infer hasMore from the number of items returned
    const hasMore = adverts.length >= limit;
    const nextOffset = offset + adverts.length;

    tracker.debug('[OLX] Fetched adverts batch', {
      count: purchases.length,
      hasMore,
    });

    return {
      purchases,
      nextCursor: hasMore ? String(nextOffset) : undefined,
      hasMore,
    };
  },

  async refreshToken(
    credentials: ProviderCredentials,
  ): Promise<RefreshTokenResult> {
    tracker.debug('[OLX] Refreshing token');

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
    tracker.debug('[OLX] Parsing import file', { name: file.name, size: file.size });
    const text = await file.text();
    const data = JSON.parse(text) as OlxImportItem[] | { items?: OlxImportItem[]; purchases?: OlxImportItem[] };

    const items = Array.isArray(data)
      ? data
      : (data.items ?? data.purchases ?? []);

    return items.map((item, index) => {
      const purchaseDate = item.date ? new Date(item.date).toISOString() : new Date().toISOString();
      const datePart = purchaseDate.split('T')[0];
      const quantity = item.quantity ?? 1;
      const unitPrice = typeof item.price === 'string' ? parseFloat(item.price) : (item.price ?? 0);

      return {
        id: `${PROVIDER_ID}-${datePart}-${item.id ?? index}`,
        providerId: PROVIDER_ID,
        providerItemId: String(item.id ?? index),
        title: item.title ?? 'Unknown Item',
        price: unitPrice * quantity,
        currency: item.currency ?? 'PLN',
        purchaseDate,
        imageUrl: item.imageUrl,
        categoryName: item.category,
        originalUrl: item.url,
        rawData: item as unknown as Record<string, unknown>,
        importedAt: new Date().toISOString(),
      };
    });
  },

  async validateImportFile(file: File): Promise<string[]> {
    const errors: string[] = [];
    if (!file.name.endsWith('.json')) {
      errors.push('File must be a JSON file (.json)');
    }
    return errors;
  },
};
