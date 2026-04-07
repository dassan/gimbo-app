# Nexus Finance

> Personal finance management — 100% local, zero cloud dependency.

Nexus is a **client-side PWA** that runs entirely in the browser. Your financial data lives as a portable `data.json` file on your own device. No accounts, no servers, no subscription.

---

## Why Nexus

Most finance tools trade your privacy for convenience — storing transaction history on corporate servers and monetising your spending patterns. Nexus rejects that model:

- **Local-first:** all data stays on your device as a plain JSON file you own and control
- **Zero installation:** open the URL, create your ledger, start tracking
- **No lock-in:** export your `data.json` at any time and open it in any text editor

---

## Features

| # | Feature |
|---|---------|
| F-1 | User profile (name, e-mail) |
| F-2 | Account management (Checking, Savings, Credit Card) |
| F-3 | Categories with sub-category hierarchy |
| F-4 | Customisable tags, assignable to transactions |
| F-5 | Full transaction CRUD (Income, Expense, Transfer) |
| F-6 | Monthly dashboard — income, expenses, consolidated balance |
| F-7 | Cash Flow chart — ±3 months history + forecast (weekly / monthly) |
| F-8 | Expense breakdown by category (donut chart) |
| F-9 | Export / Import `data.json` |
| F-10 | Language selector (pt-BR / en-US) with live switching |
| F-11 | Onboarding modal — create new ledger or import existing file |

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | React 19 + Vite 8 | Fast DX, static output, no server required |
| Language | TypeScript 6 | Full type safety across the entire data model |
| Styling | Tailwind CSS v4 | Design system tokens via `@theme`, no runtime |
| State | Zustand | Lightweight in-memory store, no boilerplate |
| Charts | Recharts | Composable, React-native chart primitives |
| i18n | i18next + react-i18next | Multi-language from day 1 |
| PWA | vite-plugin-pwa | Service worker + Web App Manifest, auto-update |
| Icons | Lucide React | Thin-stroke (1.5pt) geometric icon set |

---

## Project Structure

```
nexus-app/
├── plan/
│   ├── PRD.md          # Product Requirements Document
│   └── SPEC.md         # Technical implementation specification
├── design/
│   ├── design_system.md
│   └── *.png           # Screen mockups
└── app/                # Vite application
    └── src/
        ├── types/          # TypeScript entities (DataFile, WorkspaceFile…)
        ├── lib/
        │   ├── utils.ts        # cn(), uuid(), formatCurrency()
        │   ├── i18n/           # i18next config + pt-BR / en-US locales
        │   └── storage/        # File System Access API + localStorage
        ├── store/
        │   ├── useDataStore.ts       # CRUD for all financial entities
        │   └── useWorkspaceStore.ts  # Theme, locale, view preferences
        ├── components/
        │   ├── Navbar.tsx            # Top horizontal nav with glassmorphism
        │   ├── FAB.tsx               # Fixed bottom-right action button
        │   ├── AppLayout.tsx         # Shell: Navbar + Outlet + FAB + Drawer
        │   └── TransactionDrawer.tsx # Slide-in sheet for new transactions
        └── pages/
            ├── Onboarding/   # Split editorial layout, create or import
            ├── Dashboard/    # Stat cards, cash flow chart, donut, recent txs
            ├── Transactions/ # Ledger: filters, date grouping, status toggle
            ├── Analytics/    # Cash flow projection + category breakdown
            └── Settings/     # Accounts · Categories · Tags · Profile · Prefs
```

---

## Data Architecture

Two files, two responsibilities:

**`data.json`** — the portable financial ledger (managed via File System Access API):
```jsonc
{
  "user":         { "name", "email", "createdAt", "updatedAt" },
  "settings":     { "fileCreatedAt", "fileUpdatedAt" },
  "accounts":     [{ "id", "name", "type", "balance" }],
  "categories":   [{ "id", "parentId", "name", "icon", "color", "type" }],
  "tags":         [{ "id", "name", "color" }],
  "transactions": [{ "id", "accountId", "categoryId", "amount", "type",
                     "date", "description", "isPaid", "tags" }]
}
```

**`workspace.json`** — UI preferences, stored in `localStorage` (never leaves the browser):
```jsonc
{ "theme": "system | light | dark", "locale": "pt-BR | en-US", "defaultView": "dashboard" }
```

---

## Getting Started

```bash
# 1. Clone the repository
git clone git@github.com:dassan/nexus-app.git
cd nexus-app/app

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — the Onboarding screen will guide you through creating your first ledger.

### Build for production

```bash
npm run build      # outputs to app/dist/
npm run preview    # serve the production build locally
```

The `dist/` folder is a fully static PWA — serve it from any static host (GitHub Pages, Netlify, Cloudflare Pages) or open `index.html` directly.

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Notes |
|---------|--------|---------|--------|-------|
| Core app | ✅ | ✅ | ✅ | Full support |
| File System Access API | ✅ | ✅ | ⚠️ | Safari uses download fallback |
| PWA install | ✅ | ✅ | ✅ | |

On browsers without File System Access API support, `data.json` is managed via standard file input + download — the experience degrades gracefully.

---

## Out of Scope (future)

- `data.json` encryption
- Automated Open Banking sync
- Native mobile app (iOS / Android)
- Online authentication / cloud storage / expense sharing

---

## Licence

Private repository — all rights reserved.
