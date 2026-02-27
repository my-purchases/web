import { create } from 'zustand';
import { db } from '@/db';
import type { Purchase } from '@/db';
import { tracker, AnalyticsEvents } from '@/analytics';
import { batchFetchRates } from '@/services/currencyService';
import type { ConversionRequest, ConversionProgress } from '@/services/currencyService';

export type SortDirection = 'asc' | 'desc';

export interface ImportProgress {
  total: number;
  processed: number;
  added: number;
  skipped: number;
  updated: number;
  enriched: number;
}

export interface ImportResult {
  added: number;
  skipped: number;
  updated: number;
  enriched: number;
  total: number;
}

interface PurchaseFilters {
  providerIds: string[]; // Empty = all providers
  searchQuery: string;
  tagFilters: Record<string, string[]>; // tagGroupId → selected values
  untaggedOnly: boolean; // Show only purchases without any tag assignments
}

interface PurchaseState {
  filters: PurchaseFilters;
  sortDirection: SortDirection;
  selectedPurchaseIds: Set<string>;

  // Actions
  setProviderFilter: (providerIds: string[]) => void;
  setSearchQuery: (query: string) => void;
  setSortDirection: (direction: SortDirection) => void;
  setTagFilter: (tagGroupId: string, values: string[]) => void;
  setUntaggedFilter: (enabled: boolean) => void;
  clearFilters: () => void;
  toggleSelection: (purchaseId: string) => void;
  selectAll: (purchaseIds: string[]) => void;
  clearSelection: () => void;

  // Data operations
  addPurchases: (
    purchases: Purchase[],
    onProgress?: (progress: ImportProgress) => void,
  ) => Promise<ImportResult>;
  deletePurchase: (id: string) => Promise<void>;
  deleteSelectedPurchases: () => Promise<number>;
  clearProviderPurchases: (providerId: string) => Promise<void>;
  clearAllPurchases: () => Promise<void>;

  // Currency conversion
  convertPurchases: (
    preferredCurrency: string,
    onProgress?: (progress: ConversionProgress) => void,
  ) => Promise<number>;
  rebuildConvertedPrices: (
    preferredCurrency: string,
    onProgress?: (progress: ConversionProgress) => void,
  ) => Promise<number>;
}

const defaultFilters: PurchaseFilters = {
  providerIds: [],
  searchQuery: '',
  tagFilters: {},
  untaggedOnly: false,
};

/**
 * Extract YYYY-MM-DD from an ISO 8601 date string
 */
function extractDate(isoDate: string): string {
  return isoDate.slice(0, 10);
}

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  filters: { ...defaultFilters },
  sortDirection: 'desc',
  selectedPurchaseIds: new Set(),

  setProviderFilter: (providerIds) => {
    set({ filters: { ...get().filters, providerIds } });
    tracker.trackEvent(AnalyticsEvents.PURCHASE_FILTER_CHANGED, { providerIds });
    console.info('[Purchases] Provider filter changed:', providerIds);
  },

  setSearchQuery: (searchQuery) => {
    set({ filters: { ...get().filters, searchQuery } });
    tracker.trackEvent(AnalyticsEvents.PURCHASE_SEARCH, { query: searchQuery });
    console.debug('[Purchases] Search query:', searchQuery);
  },

  setSortDirection: (sortDirection) => {
    set({ sortDirection });
    tracker.trackEvent(AnalyticsEvents.PURCHASE_SORT_CHANGED, { direction: sortDirection });
    console.info('[Purchases] Sort direction changed:', sortDirection);
  },

  setTagFilter: (tagGroupId, values) => {
    const tagFilters = { ...get().filters.tagFilters };
    if (values.length === 0) {
      delete tagFilters[tagGroupId];
    } else {
      tagFilters[tagGroupId] = values;
    }
    set({ filters: { ...get().filters, tagFilters } });
    tracker.trackEvent(AnalyticsEvents.TAG_FILTER_APPLIED, { tagGroupId, values });
    console.info('[Purchases] Tag filter:', tagGroupId, values);
  },

  setUntaggedFilter: (untaggedOnly) => {
    set({ filters: { ...get().filters, untaggedOnly } });
    tracker.trackEvent(AnalyticsEvents.TAG_FILTER_APPLIED, { untaggedOnly });
    console.info('[Purchases] Untagged filter:', untaggedOnly);
  },

  clearFilters: () => {
    set({ filters: { ...defaultFilters } });
    console.info('[Purchases] Filters cleared');
  },

  toggleSelection: (purchaseId) => {
    const selected = new Set(get().selectedPurchaseIds);
    if (selected.has(purchaseId)) {
      selected.delete(purchaseId);
    } else {
      selected.add(purchaseId);
    }
    set({ selectedPurchaseIds: selected });
    console.debug('[Purchases] Selection toggled:', purchaseId);
  },

  selectAll: (purchaseIds) => {
    set({ selectedPurchaseIds: new Set(purchaseIds) });
    console.debug('[Purchases] Selected all:', purchaseIds.length);
  },

  clearSelection: () => {
    set({ selectedPurchaseIds: new Set() });
    console.debug('[Purchases] Selection cleared');
  },

  addPurchases: async (purchases, onProgress) => {
    console.info('[Purchases] Adding purchases:', purchases.length);
    const total = purchases.length;
    let added = 0;
    let skipped = 0;
    let updated = 0;
    let enriched = 0;

    // Build a set of existing [providerId+providerItemId] for fast dedup
    const providerIds = [...new Set(purchases.map((p) => p.providerId))];
    const existingMap = new Map<string, string>(); // "providerId|providerItemId" → existing.id
    for (const pid of providerIds) {
      const existing = await db.purchases.where('providerId').equals(pid).toArray();
      for (const e of existing) {
        existingMap.set(`${e.providerId}|${e.providerItemId}`, e.id);
      }
    }

    for (let i = 0; i < purchases.length; i++) {
      const purchase = purchases[i];
      const key = `${purchase.providerId}|${purchase.providerItemId}`;
      const existingId = existingMap.get(key);

      if (existingId) {
        // Check if data actually changed — skip if identical
        const existing = await db.purchases.get(existingId);
        if (
          existing &&
          existing.title === purchase.title &&
          existing.price === purchase.price &&
          existing.currency === purchase.currency &&
          existing.purchaseDate === purchase.purchaseDate
        ) {
          // Core data identical — check if new import can fill in missing fields
          const fieldsToEnrich: Record<string, unknown> = {};
          if (!existing.imageUrl && purchase.imageUrl) {
            fieldsToEnrich.imageUrl = purchase.imageUrl;
          }
          if (!existing.categoryName && purchase.categoryName) {
            fieldsToEnrich.categoryName = purchase.categoryName;
          }
          if (!existing.originalUrl && purchase.originalUrl) {
            fieldsToEnrich.originalUrl = purchase.originalUrl;
          }
          if (!existing.rawData && purchase.rawData) {
            fieldsToEnrich.rawData = purchase.rawData;
          }

          if (Object.keys(fieldsToEnrich).length > 0) {
            await db.purchases.update(existingId, fieldsToEnrich);
            enriched++;
            console.debug('[Purchases] Enriched existing:', existingId, Object.keys(fieldsToEnrich));
          } else {
            skipped++;
          }
        } else {
          await db.purchases.update(existingId, {
            title: purchase.title,
            price: purchase.price,
            currency: purchase.currency,
            purchaseDate: purchase.purchaseDate,
            categoryName: purchase.categoryName,
            imageUrl: purchase.imageUrl,
            originalUrl: purchase.originalUrl,
            rawData: purchase.rawData,
          } as Record<string, unknown>);
          updated++;
          console.debug('[Purchases] Updated existing:', existingId);
        }
      } else {
        await db.purchases.add(purchase);
        existingMap.set(key, purchase.id); // Track for intra-batch dedup
        added++;
        console.debug('[Purchases] Added new:', purchase.id);
      }

      // Report progress every 50 items or on last item
      if (onProgress && (i % 50 === 0 || i === purchases.length - 1)) {
        onProgress({ total, processed: i + 1, added, skipped, updated, enriched });
      }
    }
    console.info('[Purchases] Added:', added, 'Updated:', updated, 'Enriched:', enriched, 'Skipped:', skipped);
    return { added, skipped, updated, enriched, total };
  },

  deletePurchase: async (id) => {
    await db.purchases.delete(id);
    // Also clean up tag assignments
    await db.tagAssignments.where('targetId').equals(id).delete();
    console.info('[Purchases] Deleted:', id);
  },

  deleteSelectedPurchases: async () => {
    const ids = [...get().selectedPurchaseIds];
    if (ids.length === 0) return 0;

    for (const id of ids) {
      await db.purchases.delete(id);
      await db.tagAssignments.where('targetId').equals(id).delete();
    }

    set({ selectedPurchaseIds: new Set() });
    console.info('[Purchases] Deleted selected:', ids.length);
    return ids.length;
  },

  clearProviderPurchases: async (providerId) => {
    const count = await db.purchases.where('providerId').equals(providerId).count();
    await db.purchases.where('providerId').equals(providerId).delete();
    console.info('[Purchases] Cleared provider:', providerId, 'Count:', count);
  },

  clearAllPurchases: async () => {
    await db.purchases.clear();
    await db.tagAssignments.clear();
    await db.purchaseGroups.clear();
    console.info('[Purchases] All data cleared');
  },

  /**
   * Convert all purchases that have a different currency than the preferred one.
   * Skips purchases that already have the correct convertedCurrency.
   * Used after initial currency setup or after import.
   */
  convertPurchases: async (preferredCurrency, onProgress) => {
    console.info('[Purchases] Converting purchases to', preferredCurrency);

    const allPurchases = await db.purchases.toArray();
    const toConvert = allPurchases.filter(
      (p) => p.currency !== preferredCurrency && p.convertedCurrency !== preferredCurrency,
    );

    if (toConvert.length === 0) {
      console.info('[Purchases] No purchases need conversion');
      // Still update same-currency purchases
      const sameCurrency = allPurchases.filter(
        (p) => p.currency === preferredCurrency && p.convertedCurrency !== preferredCurrency,
      );
      for (const p of sameCurrency) {
        await db.purchases.update(p.id, {
          convertedPrice: p.price,
          convertedCurrency: preferredCurrency,
        } as Record<string, unknown>);
      }
      return 0;
    }

    // Build conversion requests
    const requests: ConversionRequest[] = toConvert.map((p) => ({
      fromCurrency: p.currency,
      toCurrency: preferredCurrency,
      date: extractDate(p.purchaseDate),
    }));

    // Batch fetch rates
    const rates = await batchFetchRates(requests, onProgress);

    // Apply conversions
    let converted = 0;
    for (const p of toConvert) {
      const rateKey = `${p.currency}_${preferredCurrency}_${extractDate(p.purchaseDate)}`;
      const rate = rates.get(rateKey);
      if (rate !== undefined) {
        const convertedPrice = Math.round(p.price * rate * 100) / 100;
        await db.purchases.update(p.id, {
          convertedPrice,
          convertedCurrency: preferredCurrency,
        } as Record<string, unknown>);
        converted++;
      }
    }

    // Update same-currency purchases too
    const sameCurrency = allPurchases.filter(
      (p) => p.currency === preferredCurrency && p.convertedCurrency !== preferredCurrency,
    );
    for (const p of sameCurrency) {
      await db.purchases.update(p.id, {
        convertedPrice: p.price,
        convertedCurrency: preferredCurrency,
      } as Record<string, unknown>);
    }

    console.info('[Purchases] Converted', converted, 'purchases to', preferredCurrency);
    return converted;
  },

  /**
   * Rebuild all converted prices when the user changes their preferred currency.
   * Unlike convertPurchases, this re-converts ALL purchases including ones
   * that already have a convertedPrice (since the target currency changed).
   */
  rebuildConvertedPrices: async (preferredCurrency, onProgress) => {
    console.info('[Purchases] Rebuilding converted prices for', preferredCurrency);

    const allPurchases = await db.purchases.toArray();
    const toConvert = allPurchases.filter((p) => p.currency !== preferredCurrency);

    // Update same-currency purchases immediately
    const sameCurrency = allPurchases.filter((p) => p.currency === preferredCurrency);
    for (const p of sameCurrency) {
      await db.purchases.update(p.id, {
        convertedPrice: p.price,
        convertedCurrency: preferredCurrency,
      } as Record<string, unknown>);
    }

    if (toConvert.length === 0) {
      console.info('[Purchases] All purchases already in', preferredCurrency);
      return 0;
    }

    // Build conversion requests
    const requests: ConversionRequest[] = toConvert.map((p) => ({
      fromCurrency: p.currency,
      toCurrency: preferredCurrency,
      date: extractDate(p.purchaseDate),
    }));

    // Batch fetch rates
    const rates = await batchFetchRates(requests, onProgress);

    // Apply conversions
    let converted = 0;
    for (const p of toConvert) {
      const rateKey = `${p.currency}_${preferredCurrency}_${extractDate(p.purchaseDate)}`;
      const rate = rates.get(rateKey);
      if (rate !== undefined) {
        const convertedPrice = Math.round(p.price * rate * 100) / 100;
        await db.purchases.update(p.id, {
          convertedPrice,
          convertedCurrency: preferredCurrency,
        } as Record<string, unknown>);
        converted++;
      }
    }

    console.info('[Purchases] Rebuilt', converted, 'converted prices for', preferredCurrency);
    return converted;
  },
}));
