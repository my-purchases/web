import { db } from '@/db';
import type { CurrencyRate } from '@/db';

// ─── Types ──────────────────────────────────────────────────

export interface ConversionRequest {
  fromCurrency: string;
  toCurrency: string;
  date: string; // YYYY-MM-DD
}

export interface ConversionProgress {
  total: number;
  fetched: number;
  cached: number;
}

// ─── Frankfurter API ────────────────────────────────────────
// Free, open-source API: https://www.frankfurter.app/
// No API key required. Supports historical rates.
// Endpoint: GET https://api.frankfurter.app/{date}?from={from}&to={to}

const API_BASE = 'https://api.frankfurter.app';

interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

/**
 * Fetch a single exchange rate from the Frankfurter API
 */
async function fetchRateFromApi(
  fromCurrency: string,
  toCurrency: string,
  date: string,
): Promise<number> {
  const url = `${API_BASE}/${date}?from=${fromCurrency}&to=${toCurrency}`;
  console.debug('[Currency] Fetching rate:', url);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Currency API error: ${response.status} ${response.statusText}`);
  }

  const data: FrankfurterResponse = await response.json();
  const rate = data.rates[toCurrency];

  if (rate === undefined) {
    throw new Error(`No rate found for ${fromCurrency} → ${toCurrency} on ${date}`);
  }

  return rate;
}

// ─── Cache Layer ────────────────────────────────────────────

function buildRateId(fromCurrency: string, toCurrency: string, date: string): string {
  return `${fromCurrency}_${toCurrency}_${date}`;
}

/**
 * Get a rate from the Dexie cache
 */
async function getCachedRate(
  fromCurrency: string,
  toCurrency: string,
  date: string,
): Promise<number | null> {
  const id = buildRateId(fromCurrency, toCurrency, date);
  const cached = await db.currencyRates.get(id);
  return cached?.rate ?? null;
}

/**
 * Save a rate to the Dexie cache
 */
async function cacheRate(
  fromCurrency: string,
  toCurrency: string,
  date: string,
  rate: number,
): Promise<void> {
  const entry: CurrencyRate = {
    id: buildRateId(fromCurrency, toCurrency, date),
    fromCurrency,
    toCurrency,
    date,
    rate,
    fetchedAt: new Date().toISOString(),
  };
  await db.currencyRates.put(entry);
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Get an exchange rate, using the Dexie cache first, falling back to the API.
 * For same-currency conversions, returns 1 without any API call or cache lookup.
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  date: string,
): Promise<number> {
  if (fromCurrency === toCurrency) return 1;

  // Check cache first
  const cached = await getCachedRate(fromCurrency, toCurrency, date);
  if (cached !== null) {
    console.debug('[Currency] Cache hit:', fromCurrency, '→', toCurrency, date, '=', cached);
    return cached;
  }

  // Fetch from API
  const rate = await fetchRateFromApi(fromCurrency, toCurrency, date);
  console.debug('[Currency] Fetched:', fromCurrency, '→', toCurrency, date, '=', rate);

  // Cache the result permanently
  await cacheRate(fromCurrency, toCurrency, date, rate);

  return rate;
}

/**
 * Convert a price from one currency to another using historical rates.
 * Returns the converted price rounded to 2 decimal places.
 */
export async function convertPrice(
  price: number,
  fromCurrency: string,
  toCurrency: string,
  date: string,
): Promise<number> {
  if (fromCurrency === toCurrency) return price;

  const rate = await getExchangeRate(fromCurrency, toCurrency, date);
  return Math.round(price * rate * 100) / 100;
}

/**
 * Batch-fetch exchange rates for multiple conversion requests.
 * Deduplicates requests with the same (fromCurrency, toCurrency, date) tuple.
 * Reports progress via callback.
 */
export async function batchFetchRates(
  requests: ConversionRequest[],
  onProgress?: (progress: ConversionProgress) => void,
): Promise<Map<string, number>> {
  // Deduplicate
  const uniqueKeys = new Map<string, ConversionRequest>();
  for (const req of requests) {
    if (req.fromCurrency === req.toCurrency) continue;
    const key = buildRateId(req.fromCurrency, req.toCurrency, req.date);
    if (!uniqueKeys.has(key)) {
      uniqueKeys.set(key, req);
    }
  }

  const total = uniqueKeys.size;
  let fetched = 0;
  let cached = 0;
  const results = new Map<string, number>();

  for (const [key, req] of uniqueKeys) {
    // Check cache first
    const cachedRate = await getCachedRate(req.fromCurrency, req.toCurrency, req.date);
    if (cachedRate !== null) {
      results.set(key, cachedRate);
      cached++;
    } else {
      try {
        const rate = await fetchRateFromApi(req.fromCurrency, req.toCurrency, req.date);
        await cacheRate(req.fromCurrency, req.toCurrency, req.date, rate);
        results.set(key, rate);
        fetched++;
      } catch (error) {
        console.error('[Currency] Failed to fetch rate for', key, error);
        // Skip this rate — the purchase won't get a convertedPrice
      }
    }

    if (onProgress) {
      onProgress({ total, fetched, cached });
    }
  }

  console.info('[Currency] Batch fetch complete:', { total, fetched, cached });
  return results;
}

/**
 * Get all cached currency rates from IndexedDB.
 * Used for export.
 */
export async function getAllCachedRates(): Promise<CurrencyRate[]> {
  return db.currencyRates.toArray();
}

/**
 * Import currency rates into the cache (used during data import).
 * Uses put to upsert — existing rates are overwritten.
 */
export async function importCachedRates(rates: CurrencyRate[]): Promise<void> {
  await db.currencyRates.bulkPut(rates);
  console.info('[Currency] Imported', rates.length, 'cached rates');
}

/**
 * Clear all cached currency rates.
 */
export async function clearCachedRates(): Promise<void> {
  await db.currencyRates.clear();
  console.info('[Currency] Cache cleared');
}

/**
 * List of commonly used currencies, ordered by global usage.
 */
export const COMMON_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв' },
  { code: 'HRK', name: 'Croatian Kuna', symbol: 'kn' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
] as const;
