# My Purchases

An open-source, privacy-first web application for tracking and organizing your online purchases across multiple platforms. Deployed as a static site on GitHub Pages — all data stays in your browser.

## Live Demo

**[https://my-purchases.github.io/web](https://my-purchases.github.io/web)**

Use invitation code `demo` to explore the app.

## Features

- **Multi-provider support** — Allegro (API + import), Amazon, AliExpress, Temu (CSV/JSON import); eBay, OLX, Vinted, Allegro Lokalnie (coming soon)
- **Cost calculator** — Select purchases and calculate total costs with per-currency breakdown and converted totals
- **Currency conversion** — Automatic historical exchange rate conversion to your preferred currency
- **Custom tagging** — Create tag groups (e.g., Category, Location) with custom values and assign them to purchases
- **Purchase grouping** — Combine related purchases into compound items (e.g., "New PC Build")
- **Export / Import** — Full data portability via JSON export and import
- **17 languages** — English, Polish, German, French, Spanish, Italian, Dutch, Portuguese (BR), Russian, Japanese, Korean, Chinese (Simplified & Traditional), Arabic, Hindi, Bengali, Turkish
- **Dark mode** — Light, dark, and system-following themes
- **Privacy-first** — All data stored locally in IndexedDB; no server, no tracking cookies
- **Invitation-based access** — Credentials delivered via JSON invitation files

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript 5.9 |
| Build | Vite 7 |
| Styling | Tailwind CSS v4 |
| State | Zustand 5 |
| Storage | Dexie.js 4 (IndexedDB) |
| i18n | react-i18next |
| Icons | Lucide React |
| Routing | React Router 7 |
| Deployment | GitHub Pages via GitHub Actions |

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173/web](http://localhost:5173/web) and enter code `demo`.

## Project Structure

```
├── public/
│   └── invitations/          # Invitation JSON files
├── src/
│   ├── analytics/            # Event tracking system
│   ├── components/           # React components
│   │   ├── common/           # Button, Modal
│   │   ├── currency/         # Currency setup & conversion progress
│   │   ├── data/             # Export/Import dialogs
│   │   ├── invitation/       # Welcome & auth screen
│   │   ├── layout/           # Header, Footer, Layout
│   │   ├── providers/        # Provider sync/import panel
│   │   ├── purchases/        # Purchase list, cards, filters, groups, cost calculator
│   │   └── tags/             # Tag assigner, tag group manager
│   ├── db/                   # Dexie.js database & sync logic
│   ├── i18n/                 # i18next config + 17 locale files
│   ├── pages/                # Route pages
│   ├── providers/            # Provider implementations
│   │   ├── allegro/          # Allegro (hybrid: API + import)
│   │   ├── amazon/           # Amazon (import only)
│   │   ├── aliexpress/       # AliExpress (import only)
│   │   ├── temu/             # Temu (import only)
│   │   ├── ebay/             # eBay (coming soon)
│   │   ├── olx/              # OLX (coming soon)
│   │   ├── vinted/           # Vinted (coming soon)
│   │   └── allegro-lokalnie/ # Allegro Lokalnie (coming soon)
│   ├── stores/               # Zustand state management
│   ├── types/                # Shared TypeScript interfaces
│   └── utils/                # Helpers, export/import logic
├── docs/                     # Project documentation
└── .github/workflows/        # CI/CD pipeline
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — System design & data flow
- [Providers](docs/PROVIDERS.md) — How provider integrations work
- [Invitations](docs/INVITATIONS.md) — Creating & distributing invitation files
- [Internationalization](docs/I18N.md) — Adding or updating translations
- [Contributing](docs/CONTRIBUTING.md) — Development workflow & guidelines

## License

MIT
