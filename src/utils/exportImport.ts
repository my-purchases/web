import { db } from '@/db';
import type { Purchase, PurchaseGroup, TagGroup, TagAssignment, CurrencyRate } from '@/db';
import { tracker, AnalyticsEvents } from '@/analytics';
import { downloadJson } from '@/utils';

// ─── Export Data Types ──────────────────────────────────────

export interface ExportData {
  version: 1;
  exportedAt: string;
  purchases?: Purchase[];
  purchaseGroups?: PurchaseGroup[];
  tagGroups?: TagGroup[];
  tagAssignments?: TagAssignment[];
  currencyRates?: CurrencyRate[];
  settings?: {
    language: string;
    theme: string;
    preferredCurrency?: string;
  };
}

export interface ExportOptions {
  purchases: boolean;
  tags: boolean;
  groups: boolean;
  settings: boolean;
}

// ─── Export ─────────────────────────────────────────────────

export async function exportData(options: ExportOptions): Promise<ExportData> {
  tracker.trackEvent(AnalyticsEvents.EXPORT_STARTED, { options });
  console.info('[Export] Starting export with options:', options);

  const data: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
  };

  if (options.purchases) {
    data.purchases = await db.purchases.toArray();
    data.currencyRates = await db.currencyRates.toArray();
    console.info('[Export] Purchases:', data.purchases.length, 'Currency rates:', data.currencyRates.length);
  }

  if (options.groups) {
    data.purchaseGroups = await db.purchaseGroups.toArray();
    console.info('[Export] Groups:', data.purchaseGroups.length);
  }

  if (options.tags) {
    data.tagGroups = await db.tagGroups.toArray();
    data.tagAssignments = await db.tagAssignments.toArray();
    console.info('[Export] Tag groups:', data.tagGroups.length, 'Assignments:', data.tagAssignments.length);
  }

  if (options.settings) {
    data.settings = {
      language: localStorage.getItem('my-purchases-language') ?? 'en',
      theme: localStorage.getItem('my-purchases-theme') ?? 'system',
      preferredCurrency: localStorage.getItem('my-purchases-currency') ?? undefined,
    };
  }

  tracker.trackEvent(AnalyticsEvents.EXPORT_COMPLETED);
  return data;
}

export async function exportToFile(options: ExportOptions): Promise<void> {
  const data = await exportData(options);
  const dateStr = new Date().toISOString().split('T')[0];
  downloadJson(data, `my-purchases-export-${dateStr}.json`);
}

// ─── Import ─────────────────────────────────────────────────

export type ImportMode = 'merge' | 'overwrite';

export interface ImportResult {
  purchasesImported: number;
  groupsImported: number;
  tagGroupsImported: number;
  tagAssignmentsImported: number;
  currencyRatesImported: number;
}

export function validateExportData(data: unknown): data is ExportData {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return obj.version === 1 && typeof obj.exportedAt === 'string';
}

export async function importData(
  data: ExportData,
  mode: ImportMode,
): Promise<ImportResult> {
  tracker.trackEvent(AnalyticsEvents.IMPORT_STARTED, { mode });
  console.info('[Import] Starting import, mode:', mode);

  const result: ImportResult = {
    purchasesImported: 0,
    groupsImported: 0,
    tagGroupsImported: 0,
    tagAssignmentsImported: 0,
    currencyRatesImported: 0,
  };

  if (mode === 'overwrite') {
    console.info('[Import] Clearing existing data (overwrite mode)');
    await db.purchases.clear();
    await db.purchaseGroups.clear();
    await db.tagGroups.clear();
    await db.tagAssignments.clear();
    await db.currencyRates.clear();
  }

  if (data.purchases?.length) {
    if (mode === 'merge') {
      for (const purchase of data.purchases) {
        const existing = await db.purchases.get(purchase.id);
        if (!existing) {
          await db.purchases.add(purchase);
          result.purchasesImported++;
        }
      }
    } else {
      await db.purchases.bulkAdd(data.purchases);
      result.purchasesImported = data.purchases.length;
    }
    console.info('[Import] Purchases imported:', result.purchasesImported);
  }

  if (data.purchaseGroups?.length) {
    if (mode === 'merge') {
      for (const group of data.purchaseGroups) {
        const existing = await db.purchaseGroups.get(group.id);
        if (!existing) {
          await db.purchaseGroups.add(group);
          result.groupsImported++;
        }
      }
    } else {
      await db.purchaseGroups.bulkAdd(data.purchaseGroups);
      result.groupsImported = data.purchaseGroups.length;
    }
    console.info('[Import] Groups imported:', result.groupsImported);
  }

  if (data.tagGroups?.length) {
    if (mode === 'merge') {
      for (const tagGroup of data.tagGroups) {
        const existing = await db.tagGroups.get(tagGroup.id);
        if (!existing) {
          await db.tagGroups.add(tagGroup);
          result.tagGroupsImported++;
        }
      }
    } else {
      await db.tagGroups.bulkAdd(data.tagGroups);
      result.tagGroupsImported = data.tagGroups.length;
    }
    console.info('[Import] Tag groups imported:', result.tagGroupsImported);
  }

  if (data.tagAssignments?.length) {
    if (mode === 'merge') {
      for (const assignment of data.tagAssignments) {
        const existing = await db.tagAssignments.get(assignment.id);
        if (!existing) {
          await db.tagAssignments.add(assignment);
          result.tagAssignmentsImported++;
        }
      }
    } else {
      await db.tagAssignments.bulkAdd(data.tagAssignments);
      result.tagAssignmentsImported = data.tagAssignments.length;
    }
    console.info('[Import] Tag assignments imported:', result.tagAssignmentsImported);
  }

  if (data.currencyRates?.length) {
    if (mode === 'merge') {
      for (const rate of data.currencyRates) {
        const existing = await db.currencyRates.get(rate.id);
        if (!existing) {
          await db.currencyRates.add(rate);
          result.currencyRatesImported++;
        }
      }
    } else {
      await db.currencyRates.bulkAdd(data.currencyRates);
      result.currencyRatesImported = data.currencyRates.length;
    }
    console.info('[Import] Currency rates imported:', result.currencyRatesImported);
  }

  if (data.settings) {
    if (data.settings.language) {
      localStorage.setItem('my-purchases-language', data.settings.language);
    }
    if (data.settings.theme) {
      localStorage.setItem('my-purchases-theme', data.settings.theme);
    }
    if (data.settings.preferredCurrency) {
      localStorage.setItem('my-purchases-currency', data.settings.preferredCurrency);
    }
    console.info('[Import] Settings imported');
  }

  tracker.trackEvent(AnalyticsEvents.IMPORT_COMPLETED, { result });
  console.info('[Import] Import completed:', result);
  return result;
}
