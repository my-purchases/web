import type { Purchase } from '@/db';
import type { AllegroCheckoutForm, AllegroOfferDetails } from './types';

const PROVIDER_ID = 'allegro';

/**
 * Map an Allegro checkout form (order) to an array of Purchase objects.
 * Each line item in the order becomes a separate purchase.
 */
export function mapCheckoutFormToPurchases(
  checkoutForm: AllegroCheckoutForm,
  offerDetailsMap?: Map<string, AllegroOfferDetails>,
): Purchase[] {
  return checkoutForm.lineItems.map((lineItem) => {
    const offerDetails = offerDetailsMap?.get(lineItem.offer.id);

    return {
      id: `${PROVIDER_ID}-${checkoutForm.id}-${lineItem.id}`,
      providerId: PROVIDER_ID,
      providerItemId: lineItem.offer.id,
      title: lineItem.offer.name,
      price: parseFloat(lineItem.price.amount) * lineItem.quantity,
      currency: lineItem.price.currency,
      purchaseDate: lineItem.boughtAt,
      imageUrl: offerDetails?.images?.[0]?.url,
      categoryName: undefined, // Would require additional category lookup
      originalUrl: `https://allegro.pl/oferta/${lineItem.offer.id}`,
      rawData: {
        checkoutFormId: checkoutForm.id,
        lineItemId: lineItem.id,
        quantity: lineItem.quantity,
        unitPrice: lineItem.price.amount,
        originalPrice: lineItem.originalPrice.amount,
        orderStatus: checkoutForm.status,
        seller: undefined,
      },
      importedAt: new Date().toISOString(),
    };
  });
}

/**
 * Map a raw JSON import (matching Allegro API format) to purchases
 */
export function mapRawJsonToPurchases(data: unknown): Purchase[] {
  // Accept either full API response format or array of checkout forms
  const forms: AllegroCheckoutForm[] = Array.isArray(data)
    ? data
    : (data as { checkoutForms?: AllegroCheckoutForm[] }).checkoutForms ?? [];

  return forms.flatMap((form) => mapCheckoutFormToPurchases(form));
}

// ─── CSV Import ─────────────────────────────────────────────

/**
 * Expected CSV header columns (Allegro export format).
 * Separator: semicolon (;), values wrapped in single quotes.
 *
 * 'Numer oferty';'Tytuł oferty';'Data zakupu';'Liczba zakupionych przedmiotów / zestawów / kompletów';'Cena oryginalna';'Login sprzedawcy'
 */
const EXPECTED_HEADER_COLUMNS = [
  'Numer oferty',
  'Tytuł oferty',
  'Data zakupu',
];

/**
 * Strip surrounding single quotes from a CSV field value.
 */
export function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Parse a semicolon-separated CSV line into fields.
 * Handles single-quoted values (which may contain semicolons inside quotes).
 */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "'" && !inQuote) {
      inQuote = true;
    } else if (ch === "'" && inQuote) {
      inQuote = false;
    } else if (ch === ';' && !inQuote) {
      fields.push(current);
      current = '';
      continue;
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Validate that a CSV text looks like an Allegro export.
 * Returns an array of error strings (empty = valid).
 */
export function validateAllegroCsv(text: string): string[] {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    errors.push('CSV file must contain a header row and at least one data row.');
    return errors;
  }

  const headerFields = parseCsvLine(lines[0]).map(unquote);

  for (const expected of EXPECTED_HEADER_COLUMNS) {
    if (!headerFields.some((h) => h === expected)) {
      errors.push(`Missing expected CSV column: "${expected}". Found columns: ${headerFields.join(', ')}`);
    }
  }

  return errors;
}

/**
 * Parse an Allegro CSV export into Purchase objects.
 *
 * CSV columns:
 *  0: Numer oferty (offer ID)
 *  1: Tytuł oferty (title)
 *  2: Data zakupu (ISO 8601 date)
 *  3: Liczba zakupionych przedmiotów (quantity)
 *  4: Cena oryginalna (unit price)
 *  5: Login sprzedawcy (seller)
 */
export function mapCsvToPurchases(text: string): Purchase[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const now = new Date().toISOString();
  const purchases: Purchase[] = [];

  // Skip header (line 0)
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    if (fields.length < 5) continue;

    const offerId = unquote(fields[0]);
    const title = unquote(fields[1]);
    const purchaseDate = unquote(fields[2]);
    const quantity = parseInt(unquote(fields[3]), 10) || 1;
    const unitPrice = parseFloat(unquote(fields[4]));
    const seller = fields.length > 5 ? unquote(fields[5]) : undefined;

    if (!offerId || !title || isNaN(unitPrice)) continue;

    purchases.push({
      id: `${PROVIDER_ID}-csv-${offerId}-${purchaseDate}-${i}`,
      providerId: PROVIDER_ID,
      providerItemId: offerId,
      title,
      price: unitPrice * quantity,
      currency: 'PLN', // Allegro export doesn't include currency — default PLN
      purchaseDate,
      imageUrl: undefined,
      categoryName: undefined,
      originalUrl: `https://allegro.pl/oferta/${offerId}`,
      rawData: {
        offerId,
        quantity,
        unitPrice: String(unitPrice),
        seller,
        importRow: i,
      },
      importedAt: now,
    });
  }

  return purchases;
}
