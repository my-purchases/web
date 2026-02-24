import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  parseCsvToRows,
  parsePrice,
  mapRowToPurchase,
} from './AmazonProvider';

const FIXTURE_PATH = resolve(__dirname, '__fixtures__', 'amazon-sample.csv');
const csv = readFileSync(FIXTURE_PATH, 'utf-8');

// ─── parseCsvToRows (RFC 4180 parser) ───────────────────────

describe('parseCsvToRows', () => {
  const rows = parseCsvToRows(csv);

  it('parses all 8 data rows from the fixture', () => {
    expect(rows).toHaveLength(8);
  });

  it('returns objects with expected column names', () => {
    const keys = Object.keys(rows[0]);
    expect(keys).toContain('ASIN');
    expect(keys).toContain('Product Name');
    expect(keys).toContain('Order ID');
    expect(keys).toContain('Currency');
    expect(keys).toContain('Unit Price');
    expect(keys).toContain('Website');
    expect(keys).toContain('Order Date');
    expect(keys).toContain('Original Quantity');
    expect(keys).toContain('Total Discounts');
  });

  it('has 28 columns per row', () => {
    for (const row of rows) {
      expect(Object.keys(row)).toHaveLength(28);
    }
  });

  it('handles comma inside quoted product name', () => {
    // First row: "Stadler Form O-009E Ventilador, 45 W, 220 V, Negro, Madera, 350"
    expect(rows[0]['Product Name']).toBe(
      'Stadler Form O-009E Ventilador, 45 W, 220 V, Negro, Madera, 350',
    );
  });

  it('handles escaped double quotes in field', () => {
    // Second row has 3,5"" in name — escaped quote
    expect(rows[1]['Product Name']).toContain('3,5"');
  });

  it('handles thousands separator in price field', () => {
    // Third row: Unit Price = "1,382.11"
    expect(rows[2]['Unit Price']).toBe('1,382.11');
  });

  it('handles negative discount with apostrophes', () => {
    // Fourth row: Total Discounts = "'-6.66'"
    expect(rows[3]['Total Discounts']).toBe("'-6.66'");
  });

  it('returns empty array for empty input', () => {
    expect(parseCsvToRows('')).toEqual([]);
  });

  it('returns empty array for header-only input', () => {
    expect(parseCsvToRows('A,B,C\n')).toEqual([]);
  });

  it('handles \\r\\n line endings', () => {
    const crlf = 'Name,Value\r\nAlice,10\r\nBob,20\r\n';
    const result = parseCsvToRows(crlf);
    expect(result).toHaveLength(2);
    expect(result[0]['Name']).toBe('Alice');
    expect(result[1]['Value']).toBe('20');
  });
});

// ─── parsePrice ─────────────────────────────────────────────

describe('parsePrice', () => {
  it('parses a plain decimal number', () => {
    expect(parsePrice('81.33')).toBeCloseTo(81.33, 2);
  });

  it('parses price with thousands separator', () => {
    expect(parsePrice('1,382.11')).toBeCloseTo(1382.11, 2);
  });

  it('parses negative price with apostrophes', () => {
    expect(parsePrice("'-6.66'")).toBeCloseTo(-6.66, 2);
  });

  it('parses integer price', () => {
    expect(parsePrice('3')).toBe(3);
  });

  it('returns 0 for undefined', () => {
    expect(parsePrice(undefined)).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(parsePrice('')).toBe(0);
  });

  it('returns 0 for non-numeric input', () => {
    expect(parsePrice('abc')).toBe(0);
  });

  it('handles price with double quotes', () => {
    expect(parsePrice('"49.98"')).toBeCloseTo(49.98, 2);
  });

  it('handles large price with multiple thousands separators', () => {
    expect(parsePrice('1,234,567.89')).toBeCloseTo(1234567.89, 2);
  });

  it('handles zero', () => {
    expect(parsePrice('0')).toBe(0);
  });
});

// ─── mapRowToPurchase ───────────────────────────────────────

describe('mapRowToPurchase', () => {
  const rows = parseCsvToRows(csv);

  it('maps a basic EUR row correctly — uses Total Amount as price', () => {
    const p = mapRowToPurchase(rows[0], 0);
    expect(p).not.toBeNull();
    expect(p!.providerId).toBe('amazon');
    expect(p!.title).toBe(
      'Stadler Form O-009E Ventilador, 45 W, 220 V, Negro, Madera, 350',
    );
    expect(p!.currency).toBe('EUR');
    expect(p!.price).toBeCloseTo(110.65, 2); // Total Amount, not Unit Price
    expect(p!.providerItemId).toBe('B00ARPM4XY');
    expect(p!.originalUrl).toBe('https://www.amazon.es/dp/B00ARPM4XY');
  });

  it('maps a PLN row from Amazon.pl — uses Total Amount', () => {
    const p = mapRowToPurchase(rows[1], 1);
    expect(p).not.toBeNull();
    expect(p!.currency).toBe('PLN');
    expect(p!.price).toBeCloseTo(89.66, 2); // Total Amount
    expect(p!.originalUrl).toBe('https://www.amazon.pl/dp/B01JRUH0CY');
  });

  it('handles thousands separator in Total Amount', () => {
    const p = mapRowToPurchase(rows[2], 2);
    expect(p).not.toBeNull();
    expect(p!.price).toBeCloseTo(1700, 2); // Total Amount = 1,700
  });

  it('maps GBP Amazon.co.uk row', () => {
    const p = mapRowToPurchase(rows[4], 4);
    expect(p).not.toBeNull();
    expect(p!.currency).toBe('GBP');
    expect(p!.originalUrl).toBe('https://www.amazon.co.uk/dp/B0DDZK2DDG');
  });

  it('maps USD Amazon.com row — uses Total Amount', () => {
    const p = mapRowToPurchase(rows[5], 5);
    expect(p).not.toBeNull();
    expect(p!.currency).toBe('USD');
    expect(p!.price).toBeCloseTo(76.10, 2); // Total Amount
    expect(p!.originalUrl).toBe('https://www.amazon.com/dp/B001F0MNRM');
  });

  it('uses Total Amount for multi-quantity items', () => {
    // Row 7: qty=3, unitPrice=9.99, Total Amount=36.86
    const p = mapRowToPurchase(rows[6], 6);
    expect(p).not.toBeNull();
    expect(p!.price).toBeCloseTo(36.86, 2); // Total Amount, not 9.99*3
  });

  it('generates unique IDs based on orderId, date and ASIN', () => {
    const p = mapRowToPurchase(rows[0], 0);
    expect(p!.id).toBe('amazon-404-9369579-4557113-2020-03-07-B00ARPM4XY');
  });

  it('parses dates as ISO 8601', () => {
    const p = mapRowToPurchase(rows[0], 0);
    expect(p!.purchaseDate).toContain('2020-03-07');
  });

  it('stores rawData with order details', () => {
    const p = mapRowToPurchase(rows[0], 0);
    expect(p!.rawData).toBeDefined();
    expect(p!.rawData!.orderId).toBe('404-9369579-4557113');
    expect(p!.rawData!.asin).toBe('B00ARPM4XY');
    expect(p!.rawData!.website).toBe('Amazon.es');
    expect(p!.rawData!.condition).toBe('New');
    expect(p!.rawData!.totalAmount).toBeCloseTo(110.65, 2);
  });

  it('stores totalDiscounts in rawData when non-zero', () => {
    // Row 4: Total Discounts = "'-6.66'"
    const p = mapRowToPurchase(rows[3], 3);
    expect(p!.rawData).toBeDefined();
    expect(p!.rawData!.totalDiscounts).toBeCloseTo(-6.66, 2);
  });

  it('omits totalDiscounts from rawData when zero', () => {
    const p = mapRowToPurchase(rows[0], 0);
    expect(p!.rawData!.totalDiscounts).toBeUndefined();
  });

  it('returns null when title is missing', () => {
    const row = { ...rows[0], 'Product Name': '' };
    expect(mapRowToPurchase(row, 99)).toBeNull();
  });

  it('returns null when orderId is missing', () => {
    const row = { ...rows[0], 'Order ID': '' };
    expect(mapRowToPurchase(row, 99)).toBeNull();
  });

  it('sets importedAt timestamp', () => {
    const p = mapRowToPurchase(rows[0], 0);
    expect(p!.importedAt).toBeTruthy();
    expect(() => new Date(p!.importedAt)).not.toThrow();
  });
});

// ─── Full pipeline: CSV text → purchases ────────────────────

describe('full CSV → purchases pipeline', () => {
  const rows = parseCsvToRows(csv);
  const purchases = rows
    .map((row, i) => mapRowToPurchase(row, i))
    .filter((p): p is NonNullable<typeof p> => p !== null);

  it('creates a purchase for every non-cancelled row', () => {
    expect(purchases).toHaveLength(7);
  });

  it('filters out cancelled orders', () => {
    const cancelledRow = rows.find((r) => r['Order Status'] === 'Cancelled');
    expect(cancelledRow).toBeDefined();
    const result = mapRowToPurchase(cancelledRow!, 99);
    expect(result).toBeNull();
  });

  it('all have providerId = amazon', () => {
    for (const p of purchases) {
      expect(p.providerId).toBe('amazon');
    }
  });

  it('covers multiple currencies', () => {
    const currencies = new Set(purchases.map((p) => p.currency));
    expect(currencies).toContain('EUR');
    expect(currencies).toContain('PLN');
    expect(currencies).toContain('GBP');
    expect(currencies).toContain('USD');
  });

  it('covers multiple Amazon websites via originalUrl', () => {
    const urls = purchases.map((p) => p.originalUrl!);
    expect(urls.some((u) => u.includes('amazon.es'))).toBe(true);
    expect(urls.some((u) => u.includes('amazon.pl'))).toBe(true);
    expect(urls.some((u) => u.includes('amazon.co.uk'))).toBe(true);
    expect(urls.some((u) => u.includes('amazon.com'))).toBe(true);
  });

  it('generates unique IDs', () => {
    const ids = new Set(purchases.map((p) => p.id));
    expect(ids.size).toBe(purchases.length);
  });
});
