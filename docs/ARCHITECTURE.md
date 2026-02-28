# Architecture

## Overview

My Resources is a client-side-only Single Page Application (SPA) deployed on GitHub Pages. There is no backend server — all data is stored in the browser using IndexedDB (via Dexie.js) and localStorage.

## Data Flow

```
[Invitation JSON] → [InvitationStore] → credentials
                                            ↓
[Provider APIs] ←──── credentials ──→ [syncProvider()]
       ↓                                    ↓
  raw API data                          Purchase[]
       ↓                                    ↓
  [mapper]  ──────────────────────→  IndexedDB (Dexie)
                                            ↓
                                    [useLiveQuery()]
                                            ↓
                                     React Components
```

### Import Flow (non-API providers)

```
[User File (CSV/JSON)] → [Provider.parseImportFile()] → Purchase[] → IndexedDB
```

### Currency Conversion Flow

After import or when a preferred currency is set, purchases are automatically converted:

```
[Purchase (price, currency)] → [batchFetchRates()] → [historical exchange rate API]
                                       ↓
                          [convertedPrice, convertedCurrency] → IndexedDB update
```

- Rates are cached in IndexedDB (`currencyRates` table) by `{fromCurrency}_{toCurrency}_{date}`
- Same-currency purchases get identity conversion (`convertedPrice = price`)
- Changing preferred currency triggers full re-conversion of all purchases

## Storage Architecture

| Store | Engine | Purpose |
|-------|--------|---------|
| Purchases, Groups, Tags | IndexedDB (Dexie.js) | Primary data — supports GB-scale storage |
| Language, Theme | localStorage | Small settings |
| Invitation | localStorage | Encrypted credentials |

### IndexedDB Tables

- **purchases** — Individual purchase records with provider-specific IDs, optional `convertedPrice`/`convertedCurrency`
- **purchaseGroups** — Named collections of related purchases
- **tagGroups** — User-defined categorization dimensions (e.g., "Category", "Location")
- **tagAssignments** — Links between a tag group+value and a purchase/group
- **syncState** — Tracks last sync time, cursor, and token per provider
- **currencyRates** — Cached historical exchange rates keyed by currency pair and date

## State Management

Zustand stores act as the command layer; IndexedDB is the source of truth:

- **invitationStore** — Loads/clears invitation, provides credentials to providers
- **purchaseStore** — In-memory filters, sort, selection state; writes go directly to Dexie
- **tagStore** — CRUD for tag groups and assignments
- **groupStore** — CRUD for purchase groups, auto-merges tags from member items
- **settingsStore** — Theme and preferred currency preferences with system media query listener

## Component Architecture

```
<BrowserRouter>
  <Layout>                        ← Header + Footer + Outlet
    <PurchasesPage>               ← Main authenticated view
      <ProviderPanel />           ← Sync & import controls (disabled providers greyed out)
      <PurchaseFilters />         ← Search, provider filter (active only), sort, tags
      <PurchaseList />            ← Live-queried list from Dexie
        <PurchaseCard />          ← Individual item with tag assigner
        <PurchaseGroupCard />     ← Compound item, expandable
      <CreateGroupModal />        ← Selection-based group creation
      <CalculateCostsModal />     ← Cost summary for selected purchases
    </PurchasesPage>
    <SettingsPage>                ← Tag groups, export/import, theme, currency
    <AboutPage>
    <PrivacyPage>
  </Layout>
</BrowserRouter>
```

## Authentication

There is no traditional auth. Instead, **invitation JSON files** contain provider API credentials. Users load an invitation via:
1. Entering a code (fetches `/invitations/{code}.json`)
2. Importing a `.json` file directly

Credentials are stored in localStorage and passed to providers at sync time.

## Build & Deployment

- **Vite** builds the SPA with `base: '/my-purchases/'` for GitHub Pages
- **esbuild `pure`** strips `console.log/info/debug/trace` in production builds
- **GitHub Actions** runs `npm ci && npm run build` on push to `main`, then deploys to GitHub Pages
- **Code splitting** — Pages are lazy-loaded via `React.lazy()` + `Suspense`
