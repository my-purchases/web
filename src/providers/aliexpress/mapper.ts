import type { Purchase } from '@/db';
import type { AliexpressShopperInventoryItem, AliexpressCsvRow, AliexpressXlsxOrderRow } from './types';

const PROVIDER_ID = 'aliexpress';

// ─── Price parsing ──────────────────────────────────────────

/**
 * Parse AliExpress price string from the Shopper Inventory format.
 * Examples:
 *   "US $120.95" → 120.95
 *   "129,46zł"   → 129.46
 *   "US $3.93"   → 3.93
 */
export function parsePrice(raw: string): number {
  if (!raw) return 0;
  // Remove currency symbols/prefixes, keep numbers, dots, commas
  const cleaned = raw.replace(/[^\d.,]/g, '');
  // Handle comma as decimal separator (European format: "129,46")
  // If there's a comma and no dot, or comma comes after dot, comma is decimal sep
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    return parseFloat(cleaned.replace(',', '.')) || 0;
  }
  // If both exist, the last one is the decimal separator
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  if (lastComma > lastDot) {
    // Comma is decimal separator: "1.129,46" → "1129.46"
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }
  // Dot is decimal separator or no separator
  return parseFloat(cleaned.replace(/,/g, '')) || 0;
}

/**
 * Parse the priceInfo field: "US $120.95|120|95" or "129,46zł|129|46"
 * Returns the numeric price from the pipe-separated parts.
 */
export function parsePriceInfo(priceInfo: string): number {
  if (!priceInfo) return 0;
  const parts = priceInfo.split('|');
  if (parts.length >= 3) {
    const intPart = parseInt(parts[1], 10) || 0;
    const decPart = parseInt(parts[2], 10) || 0;
    return intPart + decPart / 100;
  }
  // Fallback: parse the first part as price string
  return parsePrice(parts[0]);
}

// ─── JSON mapping (Shopper Inventory) ───────────────────────

export function mapJsonItemToPurchase(item: AliexpressShopperInventoryItem): Purchase {
  const price = parsePriceInfo(item.priceInfo) || parsePrice(item.price);

  return {
    id: `${PROVIDER_ID}-${item.orderLineId}-${item.productId}-${item.skuId}`,
    providerId: PROVIDER_ID,
    providerItemId: item.productId,
    title: item.title,
    price: price * (item.quantity || 1),
    currency: item.currency || 'USD',
    purchaseDate: item.orderDateIso
      ? new Date(item.orderDateIso).toISOString()
      : new Date(item.orderDate).toISOString(),
    imageUrl: item.imageUrl || undefined,
    originalUrl: item.productUrl || undefined,
    rawData: {
      orderId: item.orderId,
      orderLineId: item.orderLineId,
      skuId: item.skuId,
      quantity: item.quantity,
      status: item.status,
      storeName: item.storeName,
      storePageUrl: item.storePageUrl,
      attributes: item.attributes,
    },
    importedAt: new Date().toISOString(),
  };
}

// ─── CSV parsing (Shopper Inventory) ────────────────────────

/**
 * RFC 4180 CSV parser.
 * Handles quoted fields with commas, newlines, and escaped quotes.
 */
export function parseCsvToRows(text: string): AliexpressCsvRow[] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
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
        if (ch === '\r') i++;
      } else {
        field += ch;
      }
    }
  }

  current.push(field);
  if (current.some((f) => f.length > 0)) rows.push(current);

  if (rows.length < 2) return [];

  const headers = rows[0];
  return rows.slice(1).map((values) => {
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] ?? '').trim();
    });
    return row as unknown as AliexpressCsvRow;
  });
}

export function mapCsvRowToPurchase(row: AliexpressCsvRow): Purchase | null {
  const title = row['Title'] ?? row.Title;
  const orderId = row['Order ID'];
  const productId = row['Product ID'];
  const skuId = row['SKU ID'];

  if (!title || !orderId) return null;

  const priceInfo = row['Price Info'] || '';
  const price = parsePriceInfo(priceInfo) || parsePrice(row['Price'] || '');
  const quantity = parseInt(row['Qty'] || '1', 10) || 1;
  const currency = row['Currency'] || 'USD';
  const dateStr = row['Order Date'] || '';

  let purchaseDate: string;
  try {
    purchaseDate = new Date(dateStr).toISOString();
  } catch {
    purchaseDate = new Date().toISOString();
  }

  return {
    id: `${PROVIDER_ID}-${orderId}-${productId}-${skuId}`,
    providerId: PROVIDER_ID,
    providerItemId: productId || orderId,
    title,
    price: price * quantity,
    currency,
    purchaseDate,
    imageUrl: row['Product Image Url'] || undefined,
    originalUrl: row['Product Url'] || undefined,
    rawData: {
      orderId,
      productId,
      skuId,
      quantity,
      status: row['Status'],
      storeName: row['Store'],
      storeUrl: row['Store Url'],
      attributes: row['Attributes'],
    },
    importedAt: new Date().toISOString(),
  };
}

// ─── XLSX mapping (AliExpress GDPR data backup) ────────────

export function mapXlsxRowToPurchase(row: AliexpressXlsxOrderRow): Purchase | null {
  const orderId = String(row.order_id || '');
  const itemName = String(row.item_name || '');

  if (!orderId || !itemName) return null;

  // Prices in XLSX are in cents — convert to dollars
  const payableAmt = Number(row.payable_amt) || 0;
  const price = payableAmt / 100;

  const dateStr = String(row.gmt_create_order_time || '');
  let purchaseDate: string;
  try {
    purchaseDate = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();
  } catch {
    purchaseDate = new Date().toISOString();
  }

  const parentOrderId = String(row.parent_orderid || orderId);

  return {
    id: `${PROVIDER_ID}-${orderId}`,
    providerId: PROVIDER_ID,
    providerItemId: orderId,
    title: itemName,
    price,
    currency: 'USD', // XLSX export doesn't include currency, AliExpress uses USD as base
    purchaseDate,
    rawData: {
      orderId,
      parentOrderId,
      unitPrice: (Number(row.unit_price) || 0) / 100,
      payableAmt: price,
      orderStatus: row.order_status,
      payTime: row.gmt_pay_order_time,
      endTime: row.gmt_trade_end_time,
      endReason: row.end_reason,
      isSuccessPay: row.is_success_pay,
    },
    importedAt: new Date().toISOString(),
  };
}
