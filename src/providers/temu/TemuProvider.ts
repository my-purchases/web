import type { PurchaseProvider } from '../types';
import type { Purchase } from '@/db';
import { TEMU_REQUIRED_COLUMNS } from './types';
import { parseCsvToRows, mapCsvRowToPurchase } from './mapper';
import { tracker } from '@/analytics';

const PROVIDER_ID = 'temu';

export const temuProvider: PurchaseProvider = {
  meta: {
    id: PROVIDER_ID,
    name: 'Temu',
    icon: 'ShoppingBag',
    type: 'import',
    supportedImportFormats: ['csv'],
    description: 'Import from Temu order history CSV export',
    websiteUrl: 'https://temu.com',
  },

  async parseImportFile(file: File): Promise<Purchase[]> {
    tracker.debug('[Temu] Parsing import file', { name: file.name, size: file.size });

    const text = await file.text();
    const rows = parseCsvToRows(text);

    tracker.debug('[Temu] Parsed CSV rows', { rowCount: rows.length });

    const purchases = rows
      .map((row) => mapCsvRowToPurchase(row))
      .filter((p): p is Purchase => p !== null);

    tracker.debug('[Temu] Mapped CSV purchases', { count: purchases.length });

    return purchases;
  },

  async validateImportFile(file: File): Promise<string[]> {
    const errors: string[] = [];

    if (!file.name.endsWith('.csv')) {
      errors.push('File must be a CSV file');
      return errors;
    }

    try {
      const text = await file.text();
      const rows = parseCsvToRows(text);

      if (rows.length === 0) {
        errors.push('CSV file contains no data rows');
        return errors;
      }

      // Check required columns by inspecting keys of first parsed row
      const firstRow = rows[0];
      for (const col of TEMU_REQUIRED_COLUMNS) {
        if (!(col in firstRow)) {
          errors.push(`CSV missing expected column: "${col}"`);
        }
      }
    } catch {
      errors.push('Could not read CSV file');
    }

    return errors;
  },
};
