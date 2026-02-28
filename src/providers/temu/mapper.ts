import type { Purchase } from '@/db';
import type { TemuCsvRow } from './types';

const PROVIDER_ID = 'temu';

// ─── Price parsing ──────────────────────────────────────────

/**
 * Parse Temu price string.
 * Examples:
 *   "70,48 zł"  → { amount: 70.48, currency: "PLN" }
 *   "0,00 zł"   → { amount: 0,     currency: "PLN" }
 *   "$12.99"     → { amount: 12.99, currency: "USD" }
 *   "€9,99"      → { amount: 9.99,  currency: "EUR" }
 *   "12.99 USD"  → { amount: 12.99, currency: "USD" }
 */
export function parsePrice(raw: string): { amount: number; currency: string } {
  if (!raw || !raw.trim()) return { amount: 0, currency: 'USD' };

  const trimmed = raw.trim();

  // Detect currency from the string
  const currency = detectCurrency(trimmed);

  // Remove currency symbols/text, keep numbers, dots, commas, minus
  const cleaned = trimmed.replace(/[^\d.,-]/g, '');

  if (!cleaned) return { amount: 0, currency };

  // Handle comma as decimal separator (European format: "70,48")
  // If there's a comma and no dot, comma is decimal separator
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    return { amount: parseFloat(cleaned.replace(',', '.')) || 0, currency };
  }

  // If both exist, the last one is the decimal separator
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  if (lastComma > lastDot) {
    // Comma is decimal separator: "1.070,48" → "1070.48"
    return {
      amount: parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0,
      currency,
    };
  }

  // Dot is decimal separator or no separator
  return { amount: parseFloat(cleaned.replace(/,/g, '')) || 0, currency };
}

/**
 * Detect currency code from a price string.
 */
function detectCurrency(priceStr: string): string {
  const lower = priceStr.toLowerCase();

  if (lower.includes('zł') || lower.includes('pln')) return 'PLN';
  if (lower.includes('€') || lower.includes('eur')) return 'EUR';
  if (lower.includes('£') || lower.includes('gbp')) return 'GBP';
  if (lower.includes('$') || lower.includes('usd')) return 'USD';
  if (lower.includes('czk') || lower.includes('kč')) return 'CZK';
  if (lower.includes('sek') || lower.includes('kr')) return 'SEK';
  if (lower.includes('ron') || lower.includes('lei')) return 'RON';
  if (lower.includes('huf') || lower.includes('ft')) return 'HUF';
  if (lower.includes('bgn') || lower.includes('лв')) return 'BGN';

  // Default to USD if no currency detected
  return 'USD';
}

// ─── CSV parsing ────────────────────────────────────────────

/**
 * RFC 4180 CSV parser.
 * Handles quoted fields with commas, newlines, and escaped quotes.
 */
export function parseCsvToRows(text: string): TemuCsvRow[] {
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
    return row as unknown as TemuCsvRow;
  });
}

// ─── Date parsing ───────────────────────────────────────────

/**
 * Parse Temu date string.
 * Expected format: "2023/11/14" (YYYY/MM/DD)
 * Also handles "2023-11-14", "11/14/2023" etc.
 * Returns UTC noon to avoid timezone shift issues.
 */
export function parseDate(raw: string): string {
  if (!raw || !raw.trim()) return new Date().toISOString();

  const trimmed = raw.trim();

  // Try YYYY/MM/DD or YYYY-MM-DD (most common Temu format)
  const ymdMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    // Use UTC to avoid timezone offset issues
    const date = new Date(Date.UTC(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      12, 0, 0,
    ));
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  // Fallback: try native Date parsing
  try {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) return date.toISOString();
  } catch {
    // ignore
  }

  return new Date().toISOString();
}

// ─── CSV row mapping ────────────────────────────────────────

export function mapCsvRowToPurchase(row: TemuCsvRow): Purchase | null {
  const title = row['Item description at order time'];
  const orderId = row['Order ID'];

  if (!title || !orderId) return null;

  const { amount: price, currency } = parsePrice(row['Price'] || '');
  const { amount: shippingCost } = parsePrice(row['Shipping cost'] || '');
  const { amount: tax } = parsePrice(row['Price tax'] || '');
  const { amount: orderTotal } = parsePrice(row['Order total'] || '');

  const purchaseDate = parseDate(row['Order time'] || '');

  return {
    id: `${PROVIDER_ID}-${orderId}`,
    providerId: PROVIDER_ID,
    providerItemId: orderId,
    title,
    price: orderTotal > 0 ? orderTotal : price,
    currency,
    purchaseDate,
    originalUrl: row['Order detail URL'] || undefined,
    rawData: {
      orderId,
      itemPrice: price,
      tax,
      shippingCost,
      orderTotal,
      shippedDate: row['Shipped date'] || undefined,
    },
    importedAt: new Date().toISOString(),
  };
}
