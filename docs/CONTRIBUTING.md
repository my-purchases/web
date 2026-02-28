# Contributing

Thank you for your interest in contributing to My Purchases!

## Development Setup

```bash
git clone https://github.com/mobulum/my-purchases.git
cd my-purchases/web
npm install
npm run dev
```

The dev server runs at `http://localhost:5173/my-purchases`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build (outputs to `dist/`) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npx vitest run` | Run all tests once |
| `npx vitest` | Run tests in watch mode |

## Code Style

- TypeScript strict mode
- Functional React components with hooks
- Zustand for state, Dexie for persistence
- Tailwind CSS utility classes (no CSS modules)
- Named exports for components, default exports for pages

## Pull Request Guidelines

1. Fork the repo and create a branch from `main`
2. Make your changes with clear commit messages
3. Ensure `npm run build` succeeds without errors
4. Run `npx vitest run` and ensure all tests pass
5. Add/update translations in all 17 locale files if adding user-facing text
5. Open a PR with a description of the change

## Reporting Issues

Open an issue on GitHub with:
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS information
