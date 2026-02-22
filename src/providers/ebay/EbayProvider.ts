import type { PurchaseProvider } from '../types';
import type { Purchase } from '@/db';
import { tracker } from '@/analytics';

const PROVIDER_ID = 'ebay';

interface EbayImportItem {
  orderId?: string;
  title?: string;
  price?: number | string;
  currency?: string;
  date?: string;
  category?: string;
  imageUrl?: string;
  url?: string;
  itemId?: string;
}

export const ebayProvider: PurchaseProvider = {
  meta: {
    id: PROVIDER_ID,
    name: 'eBay',
    icon: 'Gavel',
    type: 'import', // Future: 'hybrid' when API integration is added (eBay supports PKCE)
    supportedImportFormats: ['csv', 'json'],
    description: 'Import from eBay purchase history export',
    websiteUrl: 'https://ebay.com',
  },

  async parseImportFile(file: File): Promise<Purchase[]> {
    tracker.debug('[eBay] Parsing import file', { name: file.name, size: file.size });
    const text = await file.text();

    if (file.name.endsWith('.json')) {
      const data = JSON.parse(text) as EbayImportItem[] | { orders?: EbayImportItem[]; purchases?: EbayImportItem[] };
      const items = Array.isArray(data) ? data : (data.orders ?? data.purchases ?? []);
      return items.map((item, index) => mapToPayment(item, index));
    }

    // CSV format
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const purchases: Purchase[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, j) => {
        row[h] = values[j] ?? '';
      });
      purchases.push({
        id: `${PROVIDER_ID}-${row['Order ID'] ?? row['orderId'] ?? i}`,
        providerId: PROVIDER_ID,
        providerItemId: row['Item ID'] ?? row['itemId'] ?? String(i),
        title: row['Title'] ?? row['Item Title'] ?? 'Unknown Item',
        price: parseFloat((row['Price'] ?? row['Total'] ?? '0').replace(/[^0-9.-]/g, '')) || 0,
        currency: row['Currency'] ?? 'USD',
        purchaseDate: row['Date'] ?? row['Purchase Date'] ? new Date(row['Date'] ?? row['Purchase Date']).toISOString() : new Date().toISOString(),
        imageUrl: row['Image URL'] ?? undefined,
        categoryName: row['Category'] ?? undefined,
        rawData: row as unknown as Record<string, unknown>,
        importedAt: new Date().toISOString(),
      });
    }
    
    return purchases;
  },

  async validateImportFile(file: File): Promise<string[]> {
    const errors: string[] = [];
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
      errors.push('File must be a CSV or JSON file');
    }
    return errors;
  },
};

function mapToPayment(item: EbayImportItem, index: number): Purchase {
  return {
    id: `${PROVIDER_ID}-${item.orderId ?? index}`,
    providerId: PROVIDER_ID,
    providerItemId: item.itemId ?? item.orderId ?? String(index),
    title: item.title ?? 'Unknown Item',
    price: typeof item.price === 'string' ? parseFloat(item.price) : (item.price ?? 0),
    currency: item.currency ?? 'USD',
    purchaseDate: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
    imageUrl: item.imageUrl,
    categoryName: item.category,
    originalUrl: item.url,
    rawData: item as unknown as Record<string, unknown>,
    importedAt: new Date().toISOString(),
  };
}
