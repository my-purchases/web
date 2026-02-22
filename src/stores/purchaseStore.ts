import { create } from 'zustand';
import { db } from '@/db';
import type { Purchase } from '@/db';
import { tracker, AnalyticsEvents } from '@/analytics';

export type SortDirection = 'asc' | 'desc';

export interface ImportProgress {
  total: number;
  processed: number;
  added: number;
  skipped: number;
  updated: number;
}

export interface ImportResult {
  added: number;
  skipped: number;
  updated: number;
  total: number;
}

interface PurchaseFilters {
  providerIds: string[]; // Empty = all providers
  searchQuery: string;
  tagFilters: Record<string, string[]>; // tagGroupId → selected values
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
  clearProviderPurchases: (providerId: string) => Promise<void>;
  clearAllPurchases: () => Promise<void>;
}

const defaultFilters: PurchaseFilters = {
  providerIds: [],
  searchQuery: '',
  tagFilters: {},
};

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
          skipped++;
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
        onProgress({ total, processed: i + 1, added, skipped, updated });
      }
    }
    console.info('[Purchases] Added:', added, 'Updated:', updated, 'Skipped:', skipped);
    return { added, skipped, updated, total };
  },

  deletePurchase: async (id) => {
    await db.purchases.delete(id);
    // Also clean up tag assignments
    await db.tagAssignments.where('targetId').equals(id).delete();
    console.info('[Purchases] Deleted:', id);
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
}));
