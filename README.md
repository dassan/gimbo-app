# Nexus Finance

> Personal finance management — 100% local, zero cloud dependency.

Nexus is a **client-side PWA** that runs entirely in the browser. Your financial data lives as a portable `data.json` file on your own device. No accounts, no servers, no subscription.

---

## Why Nexus

Most finance tools trade your privacy for convenience — storing transaction history on corporate servers and monetising your spending patterns. Nexus rejects that model:

- **Local-first:** all data stays on your device as a plain JSON file you own and control
- **Portable:** copy `data.json` to any device and pick up where you left off
- **No lock-in:** open or edit your ledger in any text editor at any time
- **Offline-capable:** works with no internet connection once installed as a PWA

---

## Features

### Core

| # | Feature |
|---|---------|
| F-1 | User profile (name, e-mail) |
| F-2 | Account management — 8 types: Checking, Savings, Credit Card, Crypto, Forex, Asset, Stocks, Other |
| F-3 | Categories with sub-category hierarchy and icon picker |
| F-4 | Customisable tags with colour palette, assignable to transactions |
| F-5 | Full transaction CRUD — Income, Expense, Transfer |
| F-6 | Monthly dashboard — income, expenses, consolidated balance, accounts list |
| F-7 | Cash-flow chart (line) — configurable period with monthly/semester/custom views |
| F-8 | Expense & income breakdown by category (donut charts) |
| F-9 | Export / Import `data.json` |
| F-10 | Language selector (pt-BR / en-US) with live switching |
| F-11 | Onboarding — create a new ledger or import an existing file |

### Credit Cards

| # | Feature |
|---|---------|
| F-21 | Credit account type with `limit`, `closingDay`, and `dueDay` fields |
| F-22 | Virtual invoice engine — invoice periods, due dates, and available limit computed at runtime (nothing extra stored in `data.json`) |
| F-23 | Invoice detail page (`/credit-card/:accountId`) — transactions per period, category chips filter, spending summary, period navigation |
| F-24 | Instalment purchases — a single purchase splits into N independent transactions with `(X/N)` suffix and per-month dates |
| F-25 | Invoice payment (`CREDIT_PAYMENT`) — dedicated transaction type linking the credit account to the debit account |

### Sync & Resilience

| Feature | Detail |
|---------|--------|
| Auto-save | Every mutation is debounced to IndexedDB (300 ms); data survives page reload |
| Read-before-write | On every sync, Nexus reads the file first and merges by UUID — recovering data from partial cache evictions |
| Conflict detection | If the file was modified outside Nexus, a modal lets you choose: keep local or load from file |
| Tombstone sync | Deleted entities are tracked in `deletedIds` — they never re-appear after merging with the disk file |
| FileHandle persistence | The File System Access handle is saved in IndexedDB; on cold start the file opens without a picker dialog |
| Multi-tab guard | A `BroadcastChannel` detects concurrent tabs and blocks mutations in the secondary tab |
| FSA fallback | On Firefox / Safari, sync is replaced by file download + `<input type="file">` import |

---

## Getting Started (feedback / testing)

> **Prerequisites:** Node.js 22 and npm.

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

### Reporting issues

Found a bug or have a suggestion? Please open an issue on GitHub:

**[github.com/dassan/nexus-app/issues](https://github.com/dassan/nexus-app/issues)**

When reporting a bug, include:
- What you were doing when it happened
- What you expected vs. what actually happened
- Your browser and OS
- Console errors (F12 → Console), if any

### Build for production

```bash
npm run build      # outputs to app/dist/
npm run preview    # serve the production build locally
```

The `dist/` folder is a fully static PWA — serve it from any static host (GitHub Pages, Netlify, Cloudflare Pages) or open `index.html` directly in Chrome.

---

## Browser Compatibility

| Feature | Chrome / Edge | Firefox | Safari |
|---------|:---:|:---:|:---:|
| Core app | ✅ | ✅ | ✅ |
| File System Access API (auto-sync) | ✅ | ❌ | ⚠️ partial |
| PWA install | ✅ | ✅ | ✅ |

On browsers without the File System Access API, the sync button is hidden and the app falls back to standard file-download export and `<input type="file">` import. All other features work normally.

---

## Contributing

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19.x |
| Routing | React Router | 7.x |
| Build | Vite | 8.x |
| Language | TypeScript strict | 6.x |
| Styling | Tailwind CSS | 4.x |
| State | Zustand | 5.x |
| Validation | Zod | 4.x |
| Cache | IndexedDB via `idb` | 8.x |
| Persistence | File System Access API | native |
| Charts | Recharts | 3.x |
| i18n | i18next + react-i18next | 26.x / 17.x |
| PWA | vite-plugin-pwa | 1.x |
| Icons | Lucide React | 1.x |
| Unit tests | Vitest + Testing Library | 3.x / 16.x |
| E2E tests | Playwright | 1.x (Chromium only) |
| Lint | ESLint (flat config) | 9.x |
| Formatter | Prettier | 3.x |

**Node.js 22** is required (matches CI).

### Project Structure

```
nexus-app/
├── .github/
│   └── workflows/
│       ├── ci.yml          # type-check → lint → format → test → build
│       └── audit.yml       # weekly dependency audit
├── plan/
│   ├── PRD.md              # Product Requirements Document
│   ├── SPEC.md             # Technical specification (sync, milestones)
│   ├── BACKLOG.md          # Bugs (B-XX) and improvements (M-XX)
│   ├── RULES.md            # Human + AI development workflow
│   └── SYNC_SCENARIOS.md   # Edge-case scenarios for persistence
├── design/
│   ├── design_system.md    # "Fluid Ledger" design system
│   └── *.png               # Screen mockups
└── app/
    ├── src/
    │   ├── types/index.ts      # All TypeScript entity definitions
    │   ├── lib/
    │   │   ├── utils.ts            # cn(), uuid(), formatCurrency(), parseDateLocal(), invoice engine
    │   │   ├── tabGuard.ts         # BroadcastChannel multi-tab detection
    │   │   ├── i18n/               # i18next config + pt-BR / en-US locales
    │   │   └── storage/
    │   │       ├── schema.ts       # Zod schemas, factories, applyRetention()
    │   │       ├── fileSystem.ts   # File System Access API + download fallback
    │   │       ├── indexedDb.ts    # IndexedDB CRUD (stores: ledger, handles)
    │   │       ├── merge.ts        # UUID-based merge (read-before-write)
    │   │       └── sync.ts         # importFileToIdb() + syncToFile()
    │   ├── store/
    │   │   ├── useDataStore.ts         # Financial data, mutations, sync state
    │   │   └── useWorkspaceStore.ts    # UI preferences (theme, locale, defaultView)
    │   ├── components/
    │   │   ├── AppLayout.tsx           # Shell: Navbar + Outlet + FAB + modals + banners
    │   │   ├── TransactionDrawer.tsx   # Slide-in form for creating/editing transactions
    │   │   ├── ConflictModal.tsx       # File conflict resolution modal
    │   │   └── ...
    │   ├── pages/
    │   │   ├── Onboarding/     # Create or import a ledger
    │   │   ├── Dashboard/      # Monthly stat cards, accounts list, donut, recent transactions
    │   │   ├── Transactions/   # Full ledger with filters and date grouping
    │   │   ├── Analytics/      # Cash-flow chart + category breakdown
    │   │   ├── CreditCard/     # Invoice detail for a specific credit account
    │   │   └── Settings/       # Accounts, categories, tags, profile, preferences, audit log
    │   └── test/
    │       ├── fixtures/       # makeDataFile() and other test factories
    │       ├── lib/            # Unit tests for storage modules and utilities
    │       ├── store/          # Unit tests for store mutations and persistence
    │       └── components/     # Unit tests for React components
    └── e2e/                    # Playwright end-to-end specs
```

### Data Model

**`data.json`** — the portable financial ledger (File System Access API):

```jsonc
{
  "schemaVersion": 2,
  "user":         { "name", "email", "createdAt", "updatedAt" },
  "settings":     { "fileCreatedAt", "fileUpdatedAt", "auditLogRetentionLimit" },
  "accounts":     [{ "id", "name", "type", "balance", "includeInBalance",
                     "creditMetadata?": { "limit", "closingDay", "dueDay" } }],
  "categories":   [{ "id", "parentId", "name", "icon", "color", "type" }],
  "tags":         [{ "id", "name", "color" }],
  "transactions": [{ "id", "accountId", "categoryId", "amount", "type",
                     "date", "description", "isPaid", "tags",
                     "installment?": { "parentId", "currentIndex", "total" },
                     "transferAccountId?" }],
  "auditLog":     [{ "id", "timestamp", "action", "entity", "entityId", "summary" }],
  "deletedIds":   ["..."]   // tombstones — prevents re-appearing entities after merge
}
```

`schemaVersion` is validated on every import. Files at version 1 are migrated automatically; files from a future version are rejected with a user-visible error.

**`nexus_workspace`** (localStorage) — UI preferences, never leaves the browser:

```jsonc
{ "theme": "system | light | dark", "locale": "pt-BR | en-US", "defaultView": "dashboard" }
```

### Architecture Highlights

**Data flow:**

```
User action
  → store mutation (e.g. addTransaction())
  → mutate(): structuredClone → apply → increment unsyncedCount
  → debouncedSaveToIdb() at 300 ms
  → user clicks Sync
  → persist(): read disk → detect conflict → mergeDataFiles() → saveDataFile()
               → update store + unsyncedCount = 0
```

**Two persistence paths — never mix them:**

| Function | When | Behaviour |
|----------|------|-----------|
| `importFileToIdb(file)` | Onboarding / Settings import | Validates with Zod, wipes IndexedDB, saves fresh |
| `syncToFile(local, disk)` | Recurring sync | UUID merge + write — never overwrites without reading first |

**Date parsing — always use `parseDateLocal()`:**

`new Date("2026-04-01")` creates UTC midnight. In UTC− timezones, calling `.getMonth()` returns the previous day's month. Every date comparison against `tx.date` must go through `parseDateLocal(dateStr)` from `@/lib/utils`.

**Virtual invoice engine (`lib/utils.ts`):**

Credit card invoices are not stored — they are computed at runtime from `closingDay` and `dueDay`. Four pure functions compose the engine: `getInvoicePeriod`, `getInvoiceDueDate`, `getCurrentInvoiceBalance`, `getEffectiveCashFlowDate`. All use `parseDateLocal` internally.

### Quality Gates

Run all checks before opening a PR — CI executes the same commands:

```bash
cd app

npm run format:check   # Prettier
npm run lint           # ESLint
npx tsc -b --noEmit    # TypeScript strict
npx vitest run --coverage  # 351 unit tests — threshold: 80% lines/functions
npx playwright test    # 19 E2E tests (Chromium only)
```

Current coverage: **97.3% statements**, ~92% branches, ~95% functions.

### Commit Convention

```
<type>: <imperative description in lowercase>
```

| Type | Use |
|------|-----|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `test:` | Tests only |
| `style:` | Formatting (no logic change) |
| `refactor:` | Refactor without behaviour change |
| `docs:` | Documentation |
| `chore:` | Config, CI, dependencies |

Reference bug/milestone IDs when applicable: `fix(B-09): use effective cash-flow date for Dashboard monthly totals`.

### Development Rules (summary)

- **CI is the arbiter** — green pipeline = done; red pipeline = session stops
- **Read before proposing** — never suggest changes to files you haven't read
- **No `TODO` in code** — open a `BACKLOG.md` entry instead
- **One feature per PR** — makes review and rollback straightforward
- **No `console.log` in production code**
- Bugs and improvements are tracked in [`plan/BACKLOG.md`](plan/BACKLOG.md)
- Full workflow documented in [`plan/RULES.md`](plan/RULES.md)

---

## Out of Scope (future)

- `data.json` encryption at rest
- Automated Open Banking / bank import
- Native mobile app (iOS / Android)
- Cloud storage or online authentication
- Chargebacks / reversals (mapped as M-22)

---

## Licence

Private repository — all rights reserved.
