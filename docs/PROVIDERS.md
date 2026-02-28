# Providers

My Resources supports eight purchase providers. Each is either **API-based** (fetches data directly from the provider), **import-based** (parses user-uploaded files), or **hybrid** (both). Some providers are currently marked as **disabled** (coming soon) and are shown greyed out in the UI.

## Provider Types

| Provider | Type | Formats | Status | Notes |
|----------|------|---------|--------|-------|
| Allegro | Hybrid | API + JSON | Active | OAuth2 API (requires client credentials); also accepts GDPR JSON export |
| Amazon | Import | CSV, JSON | Active | Parses order history CSV or GDPR JSON export |
| AliExpress | Import | CSV, JSON, XLSX | Active | Parses Shopper Inventory Chrome extension exports (CSV/JSON) or AliExpress GDPR data backup (XLSX) |
| Temu | Import | CSV | Active | Parses Temu order history CSV export |
| eBay | Import | CSV, JSON | Coming soon | Parses order history CSV or GDPR JSON export |
| OLX | Import | JSON | Coming soon | Parses GDPR JSON export |
| Vinted | Import | JSON | Coming soon | Parses GDPR JSON export |
| Allegro Lokalnie | Import | JSON | Coming soon | Parses GDPR JSON export |

## Disabled Providers

Providers can be marked as `disabled: true` in their `ProviderMeta`. Disabled providers:
- Appear at the end of the provider list in the UI
- Are rendered greyed out with a "Coming soon" badge
- Have no actionable buttons (no Import, Sync, or Connect)
- Are excluded from the purchase filter chips

## Allegro API Integration

Allegro uses OAuth2 with client credentials. The flow:

1. Invitation file contains `clientId`, `clientSecret`, `accessToken`, `refreshToken`
2. On sync, the app checks if the token is expired
3. If expired, it calls Allegro's token endpoint to refresh
4. Fetches `/order/checkout-forms` with pagination
5. Maps checkout forms to the internal `Purchase` interface

### CORS Considerations

Allegro's API does not support browser CORS. Options:
- Use a CORS proxy URL (configurable in invitation's `proxyUrl` field)
- Run a simple proxy server locally

## Import-Only Providers

For providers without public buyer APIs, users can export their data (typically via GDPR data portability requests) and import the resulting files.

### Supported Formats

**CSV** (Amazon, eBay):
- Standard order history CSV exports
- Auto-detects column headers and maps to purchase fields

**CSV** (Temu):
- Exported from Temu order history
- Headers: `"Order ID","Item description at order time","Order time","Shipped date","Price","Price tax","Shipping cost","Order total","Order detail URL"`
- Prices use European format with currency symbol (e.g., `"70,48 zł"`, `"$12.99"`, `"15,00 €"`)
- Supports multiple currencies (PLN, USD, EUR)

**CSV** (AliExpress — Shopper Inventory Chrome extension):
- Exported from the [Aliexpress Shopper Inventory](https://chromewebstore.google.com/detail/aliexpress-shopper-invento/bfojcbgpgnfajmbdkdnpckjaemkbpbph) Chrome extension
- Headers: `Order Date,Order ID,Title,Qty,Price,Store,Product ID,SKU ID,Attributes,Price Info,Currency,Status,Product Url,Product Image Url,Store Url,Tags`
- Price parsed from strings like `"US $120.95"` or `"129,46zł"`

**JSON** (AliExpress — Shopper Inventory Chrome extension):
- Exported from the same Chrome extension
- Array of objects with fields: `id`, `orderId`, `title`, `price`, `currency`, `quantity`, `orderDateIso`, `status`, `storeName`, `productUrl`, `imageUrl`, etc.

**XLSX** (AliExpress — GDPR data backup):
- Obtained via AliExpress privacy/data portability request
- Uses the "Order Information" sheet from `aliexpress_user_data_backup_*.xlsx`
- Prices are in cents (e.g., `15115` = $151.15) — no currency field, defaults to USD
- `order_id` is the line-item ID, `parent_orderid` is the parent order ID

**JSON** (all providers):
- GDPR data exports
- Flexible schema detection — the parser looks for arrays of items in common locations (`items`, `purchases`, `orders`, `data`)

## Adding a New Provider

1. Create a folder under `src/providers/<name>/`
2. Implement the `PurchaseProvider` interface from `src/providers/types.ts`
3. Register in `src/providers/registry.ts` (active providers first, disabled last)
4. Add the provider name to all 17 locale files under the `providers` section

```typescript
// src/providers/my-provider/MyProvider.ts
import type { PurchaseProvider, ProviderMeta } from '../types';

const meta: ProviderMeta = {
  id: 'my-provider',
  name: 'My Provider',
  description: 'Description of provider',
  type: 'import',       // 'api' | 'import' | 'hybrid'
  supportedFormats: ['json'],
  website: 'https://example.com',
  // disabled: true,     // Set to true for coming-soon providers
};

export const MyProvider: PurchaseProvider = {
  meta,
  async parseImportFile(file: File) {
    // Parse file and return Purchase[]
  },
  async validateImportFile(file: File) {
    // Return string[] of errors, or empty array if valid
  },
};
```
