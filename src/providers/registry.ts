import type { PurchaseProvider, ProviderMeta } from './types';
import { allegroProvider } from './allegro/AllegroProvider';
import { amazonProvider } from './amazon/AmazonProvider';
import { olxProvider } from './olx/OlxProvider';
import { ebayProvider } from './ebay/EbayProvider';
import { vintedProvider } from './vinted/VintedProvider';
import { allegroLokalnieProvider } from './allegro-lokalnie/AllegroLokalnieProvider';
import { aliexpressProvider } from './aliexpress/AliexpressProvider';

// ─── Provider Registry ──────────────────────────────────────

const providers = new Map<string, PurchaseProvider>();

function register(provider: PurchaseProvider): void {
  providers.set(provider.meta.id, provider);
}

// Register all providers
register(allegroProvider);
register(amazonProvider);
register(olxProvider);
register(ebayProvider);
register(vintedProvider);
register(allegroLokalnieProvider);
register(aliexpressProvider);

/**
 * Get a provider by its ID
 */
export function getProvider(id: string): PurchaseProvider | undefined {
  return providers.get(id);
}

/**
 * Get all registered providers
 */
export function getAllProviders(): PurchaseProvider[] {
  return Array.from(providers.values());
}

/**
 * Get all provider metadata (for UI display)
 */
export function getAllProviderMetas(): ProviderMeta[] {
  return getAllProviders().map((p) => p.meta);
}

/**
 * Get providers that support API fetching
 */
export function getApiProviders(): PurchaseProvider[] {
  return getAllProviders().filter(
    (p) => p.meta.type === 'api' || p.meta.type === 'hybrid',
  );
}

/**
 * Get providers that support file import
 */
export function getImportProviders(): PurchaseProvider[] {
  return getAllProviders().filter(
    (p) => p.meta.type === 'import' || p.meta.type === 'hybrid',
  );
}
