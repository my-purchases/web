import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  parseCsvLine,
  unquote,
  validateAllegroCsv,
  mapCsvToPurchases,
} from './mapper';

const FIXTURE_PATH = resolve(__dirname, '__fixtures__', 'allegro-sample.csv');
const csv = readFileSync(FIXTURE_PATH, 'utf-8');

// ─── parseCsvLine ───────────────────────────────────────────

describe('parseCsvLine', () => {
  it('parses simple semicolon-separated fields', () => {
    const fields = parseCsvLine("12345;'Title';'2026-01-01T00:00:00Z';1;9.99;'seller'");
    expect(fields).toEqual(['12345', 'Title', '2026-01-01T00:00:00Z', '1', '9.99', 'seller']);
  });

  it('preserves commas inside quoted values', () => {
    const fields = parseCsvLine("18203218372;'Rękawiczki Nitrylowe Beznitkowe Clara w Kolorze Czarnym, Rozmiar L';'2026-02-05T10:04:25Z';1;12.2;'Zdrowa_Dolinka'");
    expect(fields[1]).toBe('Rękawiczki Nitrylowe Beznitkowe Clara w Kolorze Czarnym, Rozmiar L');
  });

  it('handles unquoted numeric fields', () => {
    const fields = parseCsvLine("7835892;'Magnetofon DENON DRM - 600';'2002-10-23T12:43:47Z';1;203.5;'Shango'");
    expect(fields[0]).toBe('7835892');
    expect(fields[3]).toBe('1');
    expect(fields[4]).toBe('203.5');
  });

  it('handles empty lines gracefully', () => {
    const fields = parseCsvLine('');
    expect(fields).toEqual(['']);
  });
});

// ─── unquote ────────────────────────────────────────────────

describe('unquote', () => {
  it('strips surrounding single quotes', () => {
    expect(unquote("'hello'")).toBe('hello');
  });

  it('leaves unquoted values unchanged', () => {
    expect(unquote('12345')).toBe('12345');
  });

  it('trims whitespace before unquoting', () => {
    expect(unquote("  'spaced'  ")).toBe('spaced');
  });

  it('handles empty string', () => {
    expect(unquote('')).toBe('');
  });
});

// ─── validateAllegroCsv ─────────────────────────────────────

describe('validateAllegroCsv', () => {
  it('validates a correct Allegro CSV with no errors', () => {
    const errors = validateAllegroCsv(csv);
    expect(errors).toEqual([]);
  });

  it('rejects CSV with too few rows', () => {
    const errors = validateAllegroCsv("'Numer oferty';'Tytuł oferty'");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('header row');
  });

  it('rejects CSV with missing required columns', () => {
    const errors = validateAllegroCsv(
      "'Kolumna A';'Kolumna B'\n'val1';'val2'\n",
    );
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('Numer oferty'))).toBe(true);
  });

  it('rejects empty content', () => {
    const errors = validateAllegroCsv('');
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ─── mapCsvToPurchases (full fixture) ───────────────────────

describe('mapCsvToPurchases', () => {
  const purchases = mapCsvToPurchases(csv);

  it('parses all 7 data rows from the fixture', () => {
    expect(purchases).toHaveLength(7);
  });

  it('maps provider to allegro', () => {
    for (const p of purchases) {
      expect(p.providerId).toBe('allegro');
    }
  });

  it('defaults currency to PLN', () => {
    for (const p of purchases) {
      expect(p.currency).toBe('PLN');
    }
  });

  it('parses title with comma correctly', () => {
    const p = purchases.find((p) => p.providerItemId === '18203218372');
    expect(p).toBeDefined();
    expect(p!.title).toBe(
      'Rękawiczki Nitrylowe Beznitkowe Clara w Kolorze Czarnym, Rozmiar L',
    );
  });

  it('computes total price = unitPrice * quantity', () => {
    // Row with quantity=2, unitPrice=27.77 → price=55.54
    const p = purchases.find((p) => p.providerItemId === '17461178942');
    expect(p).toBeDefined();
    expect(p!.price).toBeCloseTo(55.54, 2);
  });

  it('handles single-unit price correctly', () => {
    const p = purchases.find((p) => p.providerItemId === '17831449557');
    expect(p).toBeDefined();
    expect(p!.price).toBeCloseTo(7.5, 2);
  });

  it('generates correct original URL', () => {
    const p = purchases[0];
    expect(p.originalUrl).toBe('https://allegro.pl/oferta/17831449557');
  });

  it('stores seller in rawData', () => {
    const p = purchases.find((p) => p.providerItemId === '7835892');
    expect(p).toBeDefined();
    expect(p!.rawData?.seller).toBe('Shango');
  });

  it('parses ISO 8601 dates', () => {
    const p = purchases[0];
    expect(p.purchaseDate).toBe('2026-02-05T10:04:25Z');
  });

  it('handles old-format offer IDs (no leading zeros)', () => {
    const p = purchases.find((p) => p.providerItemId === '7835892');
    expect(p).toBeDefined();
    expect(p!.title).toBe('Magnetofon DENON DRM - 600');
    expect(p!.price).toBeCloseTo(203.5, 2);
  });

  it('generates unique IDs for each purchase', () => {
    const ids = new Set(purchases.map((p) => p.id));
    expect(ids.size).toBe(purchases.length);
  });

  it('sets importedAt timestamp', () => {
    for (const p of purchases) {
      expect(p.importedAt).toBeTruthy();
      // Should be a valid ISO string
      expect(() => new Date(p.importedAt)).not.toThrow();
    }
  });

  it('stores quantity in rawData', () => {
    const p = purchases.find((p) => p.providerItemId === '10002940974');
    expect(p).toBeDefined();
    expect(p!.rawData?.quantity).toBe(2);
    expect(p!.price).toBeCloseTo(80.0, 2); // 40.0 * 2
  });

  it('returns empty array for empty input', () => {
    expect(mapCsvToPurchases('')).toEqual([]);
  });

  it('returns empty array for header-only CSV', () => {
    const headerOnly = "'Numer oferty';'Tytuł oferty';'Data zakupu';'Liczba zakupionych przedmiotów / zestawów / kompletów';'Cena oryginalna';'Login sprzedawcy'\n";
    expect(mapCsvToPurchases(headerOnly)).toEqual([]);
  });

  it('skips rows with missing fields', () => {
    const csvWithBadRow =
      "'Numer oferty';'Tytuł oferty';'Data zakupu';'Liczba zakupionych przedmiotów / zestawów / kompletów';'Cena oryginalna';'Login sprzedawcy'\n" +
      "12345;'Good Row';'2025-01-01T00:00:00Z';1;9.99;'seller'\n" +
      ';;\n'; // bad row — missing fields
    const result = mapCsvToPurchases(csvWithBadRow);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Good Row');
  });
});
