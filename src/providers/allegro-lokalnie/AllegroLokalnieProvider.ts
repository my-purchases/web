import type { PurchaseProvider } from '../types';
import type { Purchase } from '@/db';
import { tracker } from '@/analytics';

const PROVIDER_ID = 'allegro-lokalnie';

interface AllegroLokalnieImportItem {
  id?: string;
  title?: string;
  price?: number | string;
  currency?: string;
  date?: string;
  category?: string;
  imageUrl?: string;
  url?: string;
  quantity?: number;
}

export const allegroLokalnieProvider: PurchaseProvider = {
  meta: {
    id: PROVIDER_ID,
    name: 'Allegro Lokalnie',
    icon: 'MapPin',
    type: 'import',
    supportedImportFormats: ['json'],
    description: 'Import from Allegro Lokalnie data export or custom JSON',
    websiteUrl: 'https://allegrolokalnie.pl',
    disabled: true,
  },

  async parseImportFile(file: File): Promise<Purchase[]> {
    tracker.debug('[Allegro Lokalnie] Parsing import file', { name: file.name, size: file.size });
    const text = await file.text();
    const data = JSON.parse(text) as AllegroLokalnieImportItem[] | { items?: AllegroLokalnieImportItem[]; purchases?: AllegroLokalnieImportItem[] };

    const items = Array.isArray(data)
      ? data
      : (data.items ?? data.purchases ?? []);

    return items.map((item, index) => {
      const purchaseDate = item.date ? new Date(item.date).toISOString() : new Date().toISOString();
      const datePart = purchaseDate.split('T')[0];
      const quantity = item.quantity ?? 1;
      const unitPrice = typeof item.price === 'string' ? parseFloat(item.price) : (item.price ?? 0);

      return {
        id: `${PROVIDER_ID}-${datePart}-${item.id ?? index}`,
        providerId: PROVIDER_ID,
        providerItemId: String(item.id ?? index),
        title: item.title ?? 'Unknown Item',
        price: unitPrice * quantity,
        currency: item.currency ?? 'PLN',
        purchaseDate,
        imageUrl: item.imageUrl,
        categoryName: item.category,
        originalUrl: item.url,
        rawData: item as unknown as Record<string, unknown>,
        importedAt: new Date().toISOString(),
      };
    });
  },

  async validateImportFile(file: File): Promise<string[]> {
    const errors: string[] = [];
    if (!file.name.endsWith('.json')) {
      errors.push('File must be a JSON file (.json)');
    }
    return errors;
  },
};
