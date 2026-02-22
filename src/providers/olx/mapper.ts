import type { Purchase } from '@/db';
import type { OlxAdvert } from './types';

const PROVIDER_ID = 'olx';

/**
 * Map a single OLX advert to a Purchase.
 */
export function mapAdvertToPurchase(advert: OlxAdvert): Purchase {
  const price = advert.price?.value ?? 0;
  const currency = advert.price?.currency ?? 'PLN';
  const imageUrl = advert.images?.[0]?.url;

  return {
    id: `${PROVIDER_ID}-${advert.id}`,
    providerId: PROVIDER_ID,
    providerItemId: String(advert.id),
    title: advert.title,
    price,
    currency,
    purchaseDate: advert.created_at
      ? new Date(advert.created_at).toISOString()
      : new Date().toISOString(),
    imageUrl,
    categoryName: undefined, // OLX returns category_id, not name
    originalUrl: advert.url,
    rawData: advert as unknown as Record<string, unknown>,
    importedAt: new Date().toISOString(),
  };
}

/**
 * Map an array of OLX adverts to purchases.
 */
export function mapAdvertsToPurchases(adverts: OlxAdvert[]): Purchase[] {
  return adverts.map(mapAdvertToPurchase);
}
