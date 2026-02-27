import type { PurchaseProvider } from '../types';
import type { Purchase } from '@/db';
import type { AliexpressShopperInventoryItem } from './types';
import {
  mapJsonItemToPurchase,
  parseCsvToRows,
  mapCsvRowToPurchase,
  mapXlsxRowToPurchase,
} from './mapper';
import { tracker } from '@/analytics';
import { read, utils } from 'xlsx';

const PROVIDER_ID = 'aliexpress';

export const aliexpressProvider: PurchaseProvider = {
  meta: {
    id: PROVIDER_ID,
    name: 'AliExpress',
    icon: 'Package',
    type: 'import',
    supportedImportFormats: ['csv', 'json', 'xlsx'],
    description: 'Import from AliExpress Shopper Inventory plugin or GDPR data export',
    websiteUrl: 'https://aliexpress.com',
  },

  async parseImportFile(file: File): Promise<Purchase[]> {
    tracker.debug('[AliExpress] Parsing import file', { name: file.name, size: file.size });

    if (file.name.endsWith('.xlsx')) {
      return parseXlsxFile(file);
    }

    const text = await file.text();

    if (file.name.endsWith('.json')) {
      return parseJsonFile(text);
    }

    // CSV format
    return parseCsvFile(text);
  },

  async validateImportFile(file: File): Promise<string[]> {
    const errors: string[] = [];

    if (
      !file.name.endsWith('.csv') &&
      !file.name.endsWith('.json') &&
      !file.name.endsWith('.xlsx')
    ) {
      errors.push('File must be a CSV, JSON, or XLSX file');
      return errors;
    }

    if (file.name.endsWith('.xlsx')) {
      try {
        const buffer = await file.arrayBuffer();
        const workbook = read(buffer, { type: 'array' });
        const hasOrderSheet = workbook.SheetNames.includes('Order Information');
        if (!hasOrderSheet) {
          errors.push(
            'XLSX file must contain an "Order Information" sheet (AliExpress GDPR data export)',
          );
        }
      } catch {
        errors.push('Could not read XLSX file');
      }
      return errors;
    }

    if (file.name.endsWith('.csv')) {
      try {
        const text = await file.text();
        const rows = parseCsvToRows(text);
        if (rows.length === 0) {
          errors.push('CSV file contains no data rows');
          return errors;
        }
        const firstRow = rows[0];
        const hasTitle = 'Title' in firstRow;
        const hasOrderId = 'Order ID' in firstRow;
        if (!hasTitle) {
          errors.push('CSV missing expected column: "Title"');
        }
        if (!hasOrderId) {
          errors.push('CSV missing expected column: "Order ID"');
        }
      } catch {
        errors.push('Could not read CSV file');
      }
      return errors;
    }

    // JSON validation
    try {
      const text = await file.text();
      const data = JSON.parse(text) as unknown;
      if (!Array.isArray(data)) {
        errors.push('JSON must contain an array of order items');
      }
    } catch {
      errors.push('File is not valid JSON');
    }

    return errors;
  },
};

// ─── Internal parsers ───────────────────────────────────────

function parseJsonFile(text: string): Purchase[] {
  const data = JSON.parse(text) as AliexpressShopperInventoryItem[];
  const items = Array.isArray(data) ? data : [];
  const completed = items.filter((item) => item.status === 'Completed');
  tracker.debug('[AliExpress] Filtered JSON items by status', {
    total: items.length,
    completed: completed.length,
    skipped: items.length - completed.length,
  });
  const purchases = completed.map((item) => mapJsonItemToPurchase(item));
  tracker.debug('[AliExpress] Parsed JSON import', { count: purchases.length });
  return purchases;
}

function parseCsvFile(text: string): Purchase[] {
  const rows = parseCsvToRows(text);
  tracker.debug('[AliExpress] Parsed CSV rows', { rowCount: rows.length });
  const completed = rows.filter((row) => row['Status'] === 'Completed');
  tracker.debug('[AliExpress] Filtered CSV rows by status', {
    total: rows.length,
    completed: completed.length,
    skipped: rows.length - completed.length,
  });
  const purchases = completed
    .map((row) => mapCsvRowToPurchase(row))
    .filter((p): p is Purchase => p !== null);
  tracker.debug('[AliExpress] Mapped CSV purchases', { count: purchases.length });
  return purchases;
}

async function parseXlsxFile(file: File): Promise<Purchase[]> {
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: 'array' });

  const sheetName = 'Order Information';
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    tracker.debug('[AliExpress] XLSX sheet "Order Information" not found');
    return [];
  }

  const rows = utils.sheet_to_json(sheet, { raw: true }) as Record<string, unknown>[];
  tracker.debug('[AliExpress] Parsed XLSX rows', { rowCount: rows.length });

  const purchases = rows
    .map((row) =>
      mapXlsxRowToPurchase({
        order_id: String(row['order_id'] ?? ''),
        parent_orderid: String(row['parent_orderid'] ?? ''),
        gmt_create_order_time: String(row['gmt_create_order_time'] ?? ''),
        order_status: String(row['order_status'] ?? ''),
        item_name: String(row['item_name'] ?? ''),
        unit_price: Number(row['unit_price']) || 0,
        payable_amt: Number(row['payable_amt']) || 0,
        gmt_pay_order_time: String(row['gmt_pay_order_time'] ?? ''),
        gmt_trade_end_time: String(row['gmt_trade_end_time'] ?? ''),
        end_reason: String(row['end_reason'] ?? ''),
        is_success_pay: String(row['is_success_pay'] ?? ''),
        frozen_status: String(row['frozen_status'] ?? ''),
      }),
    )
    .filter((p): p is Purchase => p !== null);

  tracker.debug('[AliExpress] Mapped XLSX purchases', { count: purchases.length });
  return purchases;
}
