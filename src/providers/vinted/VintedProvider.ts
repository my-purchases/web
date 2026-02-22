import type { PurchaseProvider } from '../types';
import type { Purchase } from '@/db';
import { tracker } from '@/analytics';

const PROVIDER_ID = 'vinted';

interface VintedImportItem {
  id?: string;
  title?: string;
  price?: number | string;
  currency?: string;
  date?: string;
  category?: string;
  imageUrl?: string;
  url?: string;
  brand?: string;
  size?: string;
}

export const vintedProvider: PurchaseProvider = {
  meta: {
    id: PROVIDER_ID,
    name: 'Vinted',
    icon: 'Shirt',
    type: 'import',
    supportedImportFormats: ['json'],
    description: 'Import from Vinted GDPR data export or custom JSON',
    websiteUrl: 'https://vinted.com',
  },

  async parseImportFile(file: File): Promise<Purchase[]> {
    tracker.debug('[Vinted] Parsing import file', { name: file.name, size: file.size });
    const text = await file.text();
    const data = JSON.parse(text) as VintedImportItem[] | { items?: VintedImportItem[]; purchases?: VintedImportItem[] };

    const items = Array.isArray(data)
      ? data
      : (data.items ?? data.purchases ?? []);

    return items.map((item, index) => ({
      id: `${PROVIDER_ID}-${item.id ?? index}`,
      providerId: PROVIDER_ID,
      providerItemId: String(item.id ?? index),
      title: item.title ?? 'Unknown Item',
      price: typeof item.price === 'string' ? parseFloat(item.price) : (item.price ?? 0),
      currency: item.currency ?? 'EUR',
      purchaseDate: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
      imageUrl: item.imageUrl,
      categoryName: item.category,
      originalUrl: item.url,
      rawData: item as unknown as Record<string, unknown>,
      importedAt: new Date().toISOString(),
    }));
  },

  async validateImportFile(file: File): Promise<string[]> {
    const errors: string[] = [];
    if (!file.name.endsWith('.json')) {
      errors.push('File must be a JSON file (.json)');
    }
    return errors;
  },
};
