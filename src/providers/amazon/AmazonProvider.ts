import type { PurchaseProvider } from '../types';
import type { Purchase } from '@/db';
import { tracker } from '@/analytics';

const PROVIDER_ID = 'amazon';

/**
 * Amazon GDPR / "Request My Data" CSV export format.
 *
 * Columns (comma-separated, values in double quotes):
 *  ASIN, Billing Address, Carrier Name & Tracking Number, Currency,
 *  Gift Message, Gift Recipient Contact, Gift Sender Name, Item Serial Number,
 *  Order Date, Order ID, Order Status, Original Quantity,
 *  Payment Method Type, Product Condition, Product Name,
 *  Purchase Order Number, Ship Date, Shipment Item Subtotal,
 *  Shipment Item Subtotal Tax, Shipment Status, Shipping Address,
 *  Shipping Charge, Shipping Option, Total Amount, Total Discounts,
 *  Unit Price, Unit Price Tax, Website
 */

// ─── RFC 4180 CSV parser ────────────────────────────────────

/**
 * Parse a CSV text into an array of header→value records.
 * Properly handles quoted fields containing commas, newlines, and escaped quotes.
 */
export function parseCsvToRows(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        // Escaped quote
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        current.push(field);
        field = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        current.push(field);
        field = '';
        if (current.some((f) => f.length > 0)) rows.push(current);
        current = [];
        if (ch === '\r') i++; // skip \n in \r\n
      } else {
        field += ch;
      }
    }
  }

  // Last row
  current.push(field);
  if (current.some((f) => f.length > 0)) rows.push(current);

  if (rows.length < 2) return [];

  const headers = rows[0];
  return rows.slice(1).map((values) => {
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] ?? '').trim();
    });
    return row;
  });
}

// ─── Price parsing ──────────────────────────────────────────

/**
 * Parse a price string that may contain:
 * - Thousands separators: "1,382.11"
 * - Quoted negatives: "'−6.66'" or "'-6.66'"
 * - Plain numbers: "81.33"
 */
export function parsePrice(raw: string | undefined): number {
  if (!raw) return 0;
  // Remove surrounding quotes/apostrophes
  let cleaned = raw.replace(/^['"]+|['"]+$/g, '');
  // Remove thousands separators (commas in "1,382.11")
  cleaned = cleaned.replace(/,/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

// ─── Row → Purchase mapping ─────────────────────────────────

export function mapRowToPurchase(row: Record<string, string>, index: number): Purchase | null {
  // Support both GDPR export format and older "Order History" format
  const title =
    row['Product Name'] ?? row['Title'] ?? row['product name'] ?? '';
  const dateStr =
    row['Order Date'] ?? row['order date'] ?? '';
  const orderId =
    row['Order ID'] ?? row['order id'] ?? '';
  const asin = row['ASIN'] ?? '';
  const currency =
    row['Currency'] ?? row['currency'] ?? 'EUR';
  const quantity = parseInt(row['Original Quantity'] ?? '1', 10) || 1;
  const unitPrice = parsePrice(row['Unit Price'] ?? row['Item Total'] ?? row['total owed']);
  const totalAmount = parsePrice(row['Total Amount']);
  const totalDiscounts = parsePrice(row['Total Discounts']);
  const website = row['Website'] ?? '';
  const seller = row['Seller'] ?? undefined;
  const condition = row['Product Condition'] ?? undefined;

  if (!title || !orderId) return null;

  // Build a unique ID per line item (includes date for uniqueness)
  const datePart = dateStr ? new Date(dateStr).toISOString().split('T')[0] : 'nodate';
  const id = `${PROVIDER_ID}-${orderId}-${datePart}-${asin || index}`;

  // Build original URL from ASIN + website domain
  let originalUrl: string | undefined;
  if (asin && website) {
    // website = "Amazon.pl" → "amazon.pl"
    const domain = website.toLowerCase().replace(/^amazon\./, 'www.amazon.');
    originalUrl = `https://${domain}/dp/${asin}`;
  }

  return {
    id,
    providerId: PROVIDER_ID,
    providerItemId: asin || orderId,
    title,
    price: totalAmount || unitPrice * quantity,
    currency,
    purchaseDate: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
    categoryName: undefined,
    originalUrl,
    rawData: {
      orderId,
      asin,
      quantity,
      unitPrice,
      totalAmount: totalAmount || undefined,
      totalDiscounts: totalDiscounts || undefined,
      website,
      seller,
      condition,
    },
    importedAt: new Date().toISOString(),
  };
}

// ─── Provider ───────────────────────────────────────────────

export const amazonProvider: PurchaseProvider = {
  meta: {
    id: PROVIDER_ID,
    name: 'Amazon',
    icon: 'Package',
    type: 'import',
    supportedImportFormats: ['csv', 'json'],
    description: 'Import from Amazon order history CSV export',
    websiteUrl: 'https://amazon.com',
  },

  async parseImportFile(file: File): Promise<Purchase[]> {
    tracker.debug('[Amazon] Parsing import file', { name: file.name, size: file.size });
    const text = await file.text();

    if (file.name.endsWith('.json')) {
      const data = JSON.parse(text) as Record<string, string>[];
      const purchases = data
        .map((row, i) => mapRowToPurchase(row, i))
        .filter((p): p is Purchase => p !== null);
      tracker.debug('[Amazon] Parsed JSON import', { count: purchases.length });
      return purchases;
    }

    // CSV format
    const rows = parseCsvToRows(text);
    tracker.debug('[Amazon] Parsed CSV rows', { rowCount: rows.length });
    const purchases = rows
      .map((row, i) => mapRowToPurchase(row, i))
      .filter((p): p is Purchase => p !== null);
    tracker.debug('[Amazon] Mapped purchases', { count: purchases.length });
    return purchases;
  },

  async validateImportFile(file: File): Promise<string[]> {
    const errors: string[] = [];

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
      errors.push('File must be a CSV or JSON file');
      return errors;
    }

    if (file.name.endsWith('.csv')) {
      try {
        const text = await file.text();
        const rows = parseCsvToRows(text);
        if (rows.length === 0) {
          errors.push('CSV file contains no data rows.');
          return errors;
        }
        // Check for expected columns
        const firstRow = rows[0];
        const hasProductName = 'Product Name' in firstRow || 'Title' in firstRow || 'product name' in firstRow;
        const hasOrderId = 'Order ID' in firstRow || 'order id' in firstRow;
        if (!hasProductName) {
          errors.push('CSV missing expected column: "Product Name" or "Title".');
        }
        if (!hasOrderId) {
          errors.push('CSV missing expected column: "Order ID".');
        }
      } catch {
        errors.push('Could not read CSV file.');
      }
    }

    return errors;
  },
};
