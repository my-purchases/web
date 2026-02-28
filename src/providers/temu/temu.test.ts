import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  parsePrice,
  parseDate,
  parseCsvToRows,
  mapCsvRowToPurchase,
} from './mapper';
import { temuProvider } from './TemuProvider';

const CSV_FIXTURE = resolve(__dirname, '__fixtures__', 'sample-orders.csv');

// ─── parsePrice ─────────────────────────────────────────────

describe('parsePrice', () => {
  it('parses PLN price "70,48 zł"', () => {
    expect(parsePrice('70,48 zł')).toEqual({ amount: 70.48, currency: 'PLN' });
  });

  it('parses zero PLN price "0,00 zł"', () => {
    expect(parsePrice('0,00 zł')).toEqual({ amount: 0, currency: 'PLN' });
  });

  it('parses USD price "$12.99"', () => {
    expect(parsePrice('$12.99')).toEqual({ amount: 12.99, currency: 'USD' });
  });

  it('parses EUR price "€9,99"', () => {
    expect(parsePrice('€9,99')).toEqual({ amount: 9.99, currency: 'EUR' });
  });

  it('parses PLN price with shipping "5,50 zł"', () => {
    expect(parsePrice('5,50 zł')).toEqual({ amount: 5.5, currency: 'PLN' });
  });

  it('parses large PLN price "1.070,48 zł"', () => {
    expect(parsePrice('1.070,48 zł')).toEqual({ amount: 1070.48, currency: 'PLN' });
  });

  it('returns 0 for empty string', () => {
    expect(parsePrice('')).toEqual({ amount: 0, currency: 'USD' });
  });

  it('returns 0 for whitespace-only string', () => {
    expect(parsePrice('   ')).toEqual({ amount: 0, currency: 'USD' });
  });

  it('parses GBP price "£15.99"', () => {
    expect(parsePrice('£15.99')).toEqual({ amount: 15.99, currency: 'GBP' });
  });
});

// ─── parseDate ──────────────────────────────────────────────

describe('parseDate', () => {
  it('parses "2023/11/14" (Temu format)', () => {
    const result = parseDate('2023/11/14');
    expect(result).toContain('2023-11-14');
  });

  it('parses "2024/03/22"', () => {
    const result = parseDate('2024/03/22');
    expect(result).toContain('2024-03-22');
  });

  it('parses "2024-06-10" (ISO-like format)', () => {
    const result = parseDate('2024-06-10');
    expect(result).toContain('2024-06-10');
  });

  it('returns current date for empty string', () => {
    const result = parseDate('');
    expect(result).toBeTruthy();
    // Should be a valid ISO string
    expect(() => new Date(result)).not.toThrow();
  });
});

// ─── CSV parsing ────────────────────────────────────────────

describe('parseCsvToRows', () => {
  const csv = readFileSync(CSV_FIXTURE, 'utf-8');

  it('parses CSV into rows', () => {
    const rows = parseCsvToRows(csv);
    expect(rows).toHaveLength(5);
  });

  it('parses headers correctly', () => {
    const rows = parseCsvToRows(csv);
    expect(rows[0]['Order ID']).toBe('PO-162-21726517842553634');
    expect(rows[0]['Item description at order time']).toContain('40 Szt.');
    expect(rows[0]['Order time']).toBe('2023/11/14');
  });

  it('parses price fields correctly', () => {
    const rows = parseCsvToRows(csv);
    expect(rows[0]['Price']).toBe('70,48 zł');
    expect(rows[0]['Order total']).toBe('70,48 zł');
    expect(rows[0]['Shipping cost']).toBe('0,00 zł');
  });

  it('parses order detail URL', () => {
    const rows = parseCsvToRows(csv);
    expect(rows[0]['Order detail URL']).toContain('temu.com');
    expect(rows[0]['Order detail URL']).toContain('PO-162-21726517842553634');
  });

  it('handles different currencies across rows', () => {
    const rows = parseCsvToRows(csv);
    // Row 0-1, 3: PLN
    expect(rows[0]['Price']).toContain('zł');
    // Row 2: USD
    expect(rows[2]['Price']).toContain('$');
    // Row 4: EUR
    expect(rows[4]['Price']).toContain('€');
  });
});

// ─── CSV row mapping ────────────────────────────────────────

describe('mapCsvRowToPurchase', () => {
  const csv = readFileSync(CSV_FIXTURE, 'utf-8');
  const rows = parseCsvToRows(csv);

  it('maps first CSV row (PLN) to purchase', () => {
    const purchase = mapCsvRowToPurchase(rows[0]);
    expect(purchase).not.toBeNull();
    expect(purchase!.id).toBe('temu-PO-162-21726517842553634');
    expect(purchase!.providerId).toBe('temu');
    expect(purchase!.providerItemId).toBe('PO-162-21726517842553634');
    expect(purchase!.title).toContain('40 Szt.');
    expect(purchase!.price).toBe(70.48);
    expect(purchase!.currency).toBe('PLN');
    expect(purchase!.purchaseDate).toContain('2023-11-14');
    expect(purchase!.originalUrl).toContain('temu.com');
  });

  it('maps USD row to purchase', () => {
    const purchase = mapCsvRowToPurchase(rows[2]);
    expect(purchase).not.toBeNull();
    expect(purchase!.price).toBe(14.99); // Order total (price + shipping)
    expect(purchase!.currency).toBe('USD');
    expect(purchase!.title).toContain('USB C Hub');
  });

  it('maps EUR row to purchase', () => {
    const purchase = mapCsvRowToPurchase(rows[4]);
    expect(purchase).not.toBeNull();
    expect(purchase!.price).toBe(11.49); // Order total
    expect(purchase!.currency).toBe('EUR');
    expect(purchase!.title).toContain('LED Strip');
  });

  it('uses order total as price when available', () => {
    const purchase = mapCsvRowToPurchase(rows[1]);
    expect(purchase).not.toBeNull();
    // Order total = 51,49 zł (price 45,99 + shipping 5,50)
    expect(purchase!.price).toBe(51.49);
  });

  it('stores rawData with order metadata', () => {
    const purchase = mapCsvRowToPurchase(rows[0]);
    expect(purchase!.rawData).toBeDefined();
    const raw = purchase!.rawData as Record<string, unknown>;
    expect(raw['orderId']).toBe('PO-162-21726517842553634');
    expect(raw['itemPrice']).toBe(70.48);
    expect(raw['shippingCost']).toBe(0);
    expect(raw['tax']).toBe(0);
    expect(raw['orderTotal']).toBe(70.48);
    expect(raw['shippedDate']).toBe('2023/11/15');
  });

  it('returns null for row without title', () => {
    const badRow = { ...rows[0], 'Item description at order time': '' };
    const purchase = mapCsvRowToPurchase(badRow);
    expect(purchase).toBeNull();
  });

  it('returns null for row without order ID', () => {
    const badRow = { ...rows[0], 'Order ID': '' };
    const purchase = mapCsvRowToPurchase(badRow);
    expect(purchase).toBeNull();
  });
});

// ─── Provider-level integration ─────────────────────────────

describe('temuProvider.parseImportFile', () => {
  it('parses CSV file into purchases', async () => {
    const csvContent = readFileSync(CSV_FIXTURE, 'utf-8');
    const file = new File([csvContent], 'orders.csv', { type: 'text/csv' });
    const purchases = await temuProvider.parseImportFile!(file);

    expect(purchases).toHaveLength(5);
    expect(purchases[0].providerId).toBe('temu');
    expect(purchases[0].title).toContain('40 Szt.');
  });

  it('all purchases have required fields', async () => {
    const csvContent = readFileSync(CSV_FIXTURE, 'utf-8');
    const file = new File([csvContent], 'orders.csv', { type: 'text/csv' });
    const purchases = await temuProvider.parseImportFile!(file);

    purchases.forEach((p) => {
      expect(p.id).toBeTruthy();
      expect(p.providerId).toBe('temu');
      expect(p.providerItemId).toBeTruthy();
      expect(p.title).toBeTruthy();
      expect(p.price).toBeGreaterThan(0);
      expect(p.currency).toBeTruthy();
      expect(p.purchaseDate).toBeTruthy();
      expect(p.importedAt).toBeTruthy();
    });
  });
});

describe('temuProvider.validateImportFile', () => {
  it('validates a correct CSV file', async () => {
    const csvContent = readFileSync(CSV_FIXTURE, 'utf-8');
    const file = new File([csvContent], 'orders.csv', { type: 'text/csv' });
    const errors = await temuProvider.validateImportFile!(file);
    expect(errors).toHaveLength(0);
  });

  it('rejects non-CSV file', async () => {
    const file = new File(['{}'], 'orders.json', { type: 'application/json' });
    const errors = await temuProvider.validateImportFile!(file);
    expect(errors).toContain('File must be a CSV file');
  });

  it('rejects empty CSV', async () => {
    const file = new File([''], 'orders.csv', { type: 'text/csv' });
    const errors = await temuProvider.validateImportFile!(file);
    expect(errors).toContain('CSV file contains no data rows');
  });

  it('rejects CSV with wrong columns', async () => {
    const csv = '"Wrong Column","Another Wrong"\n"val1","val2"\n';
    const file = new File([csv], 'orders.csv', { type: 'text/csv' });
    const errors = await temuProvider.validateImportFile!(file);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('Order ID'))).toBe(true);
  });
});
