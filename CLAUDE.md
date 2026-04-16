# Nexus Finance — CLAUDE.md

> Instruções permanentes para qualquer IA que trabalhe neste projeto.
> Leia este arquivo integralmente antes de propor ou implementar qualquer coisa.
> Em caso de conflito entre este arquivo e instruções verbais da sessão, questione antes de agir.

---

## Identidade do Projeto

**Nexus Finance** é um aplicativo web de finanças pessoais **local-first**, instalável como PWA.

- Toda a informação financeira reside em um arquivo `data.json` controlado pelo usuário, sem servidor, sem nuvem.
- A arquitetura prioriza privacidade, portabilidade e funcionamento offline.
- O projeto é desenvolvido em colaboração humano + IA, usando o workflow definido em `plan/RULES.md`.

---

## Stack Tecnológico

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework UI | React | 19.x |
| Roteamento | React Router | 7.x |
| Build | Vite | 8.x |
| Linguagem | TypeScript | 6.x (strict) |
| Estilo | Tailwind CSS | 4.x |
| Estado | Zustand | 5.x |
| Validação | Zod | 4.x |
| Persistência (cache) | IndexedDB via `idb` | 8.x |
| Persistência (disco) | File System Access API | nativa |
| Gráficos | Recharts | 3.x |
| i18n | i18next + react-i18next | 26.x / 17.x |
| PWA | vite-plugin-pwa | 1.x |
| Ícones | Lucide React | 1.x |
| Utilitários CSS | clsx + tailwind-merge | — |
| Testes unitários | Vitest + Testing Library | 3.x / 16.x |
| Testes E2E | Playwright | 1.x (Chromium only) |
| Lint | ESLint (flat config) | 9.x |
| Formatter | Prettier | 3.x |
| Gerenciador de pacotes | npm | — |

**Node.js**: 22 (requerido pelo CI)

---

## Estrutura de Diretórios

```
MyFinanceApp/
├── .github/
│   └── workflows/
│       ├── ci.yml             # pipeline principal (type-check, lint, format, test, build)
│       └── audit.yml          # auditoria semanal de dependências
├── plan/
│   ├── PRD.md                 # Product Requirements Document — fonte da verdade para produto
│   ├── SPEC.md                # Especificação técnica detalhada (sync, milestones)
│   ├── BACKLOG.md             # Bugs (B-XX) e melhorias (M-XX) priorizados
│   ├── RULES.md               # Workflow de desenvolvimento IA + humano
│   └── SYNC_SCENARIOS.md      # Cenários detalhados de sync e recuperação de erros
├── design/
│   ├── design_system.md       # Sistema de design "Fluid Ledger" (cores, tipografia, componentes)
│   └── *.png                  # Mockups de telas
├── app/
│   ├── src/
│   │   ├── main.tsx           # Entry point React (StrictMode + i18n init)
│   │   ├── App.tsx            # Hidratação, route guard, error boundary raiz
│   │   ├── types/index.ts     # Definições TypeScript de todas as entidades
│   │   ├── lib/
│   │   │   ├── utils.ts           # cn(), uuid(), formatCurrency(), now(), parseDateLocal()
│   │   │   ├── tabGuard.ts        # BroadcastChannel: detecção de múltiplas abas
│   │   │   ├── i18n/              # Config i18next + locales (pt-BR, en-US)
│   │   │   └── storage/
│   │   │       ├── schema.ts      # Schemas Zod + factories + applyRetention()
│   │   │       ├── fileSystem.ts  # File System Access API + fallback download
│   │   │       ├── indexedDb.ts   # CRUD IndexedDB (stores: ledger, handles)
│   │   │       ├── merge.ts       # Merge por UUID (read-before-write)
│   │   │       └── sync.ts        # importFileToIdb() + syncToFile() — dois caminhos separados
│   │   ├── store/
│   │   │   ├── useDataStore.ts    # Dados financeiros + persistência + estado de sync
│   │   │   └── useWorkspaceStore.ts # Preferências UI (tema, locale, defaultView)
│   │   ├── components/
│   │   │   ├── AppLayout.tsx      # Shell: Navbar + Outlet + FAB + modais + banners
│   │   │   ├── Navbar.tsx         # Nav com glassmorphism + badge de sync + FSA guard
│   │   │   ├── FAB.tsx            # Botão de ação flutuante (oculto em /settings)
│   │   │   ├── TransactionDrawer.tsx # Formulário de transação (drawer lateral)
│   │   │   ├── ConflictModal.tsx  # Modal de resolução de conflito de arquivo
│   │   │   ├── Toast.tsx          # Toast de erro de escrita
│   │   │   └── ErrorBoundary.tsx  # Boundary de erro com fallback UI (card ou full-page)
│   │   ├── pages/
│   │   │   ├── Onboarding/        # Criar perfil ou importar data.json
│   │   │   ├── Dashboard/         # Cards mensais + card Minhas Contas + donut + lançamentos recentes
│   │   │   ├── Transactions/      # Ledger com filtros e agrupamento
│   │   │   ├── Analytics/         # Projeção de fluxo de caixa + breakdown por categoria
│   │   │   ├── Accounts/          # CRUD de contas (página dedicada — não confundir com aba de Settings)
│   │   │   ├── CreditCard/        # Detalhe de fatura: lançamentos, categorias, período, "Pagar Agora"
│   │   │   └── Settings/          # Contas, categorias, tags, perfil, preferências, log de auditoria
│   │   └── test/
│   │       ├── setup.ts           # Setup Vitest (Testing Library matchers)
│   │       ├── fixtures/          # Factories: makeDataFile(), etc.
│   │       ├── lib/               # Testes de storage e utilitários
│   │       ├── store/             # Testes de store (mutações, persistência, conflitos)
│   │       └── components/        # Testes de componentes
│   ├── e2e/
│   │   ├── onboarding.spec.ts     # Fluxos de criação e importação
│   │   ├── persistence.spec.ts    # Persistência e badge de sync
│   │   ├── transaction.spec.ts    # CRUD de transações
│   │   └── fixtures/
│   │       └── dataFile.json      # Fixture E2E com schemaVersion:1 + dados mínimos
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── playwright.config.ts
│   ├── eslint.config.js
│   ├── .prettierrc
│   ├── tsconfig.json              # Referencia tsconfig.app, tsconfig.node, tsconfig.e2e
│   ├── tsconfig.app.json          # TS strict para src/
│   ├── tsconfig.node.json         # TS para ferramentas de build
│   └── tsconfig.e2e.json          # TS para e2e/
└── CLAUDE.md                      # Este arquivo
```

---

## Arquitetura

### Fluxo de dados principal

```
Ação do usuário
  → Método do store (ex: addTransaction())
  → mutate(): structuredClone + aplica mutação + incrementa unsyncedCount
  → debouncedSaveToIdb() em 300ms   ←── salva em background (debounce timer)
  → Usuário clica em Sync (ou há auto-sync)
  → persist(): atualiza fileUpdatedAt, lê disco, detecta conflito,
               chama syncToFile() → mergeDataFiles() → saveDataFile()
               → atualiza store com merged + unsyncedCount = 0
```

### Quatro camadas de persistência

| Camada | Tecnologia | Escopo | Chave / Local |
|--------|-----------|--------|---------------|
| Memória | Zustand (`useDataStore.data`) | Sessão atual | — |
| Cache | IndexedDB `nexus-db` v2 | Sobrevive reload | `ledger/'current'` |
| Sync meta | IndexedDB `nexus-db` v2 | Sobrevive reload | `ledger/'sync-meta'` (persiste `unsyncedCount`) |
| FileHandle | IndexedDB `nexus-db` v2 | Sobrevive reload | `handles/'data'` |
| Disco | File System Access API (`data.json`) | Portável, permanente | Escolhido pelo usuário |
| Config UI | localStorage `nexus_workspace` | Sobrevive reload | `theme`, `locale`, `defaultView` |
| FSA notice | localStorage `nexus_fsa_notice_seen` | Sobrevive reload | banner dismissível (M-18) |

### Sequência de startup (`App.tsx`)

```
init() — executa em paralelo:
  1. initWorkspace()           — carrega localStorage → useWorkspaceStore
  2. loadFromIdb()             — carrega DataFile do IDB → useDataStore.loadData()
  3. loadFileHandle()          — carrega FileSystemFileHandle do IDB
  4. loadSyncMeta()            — carrega { unsyncedCount } do IDB

Após carregar:
  - Se IDB tem dados: loadData(saved) → restaura unsyncedCount se > 0
  - Se há handle: checkHandlePermission(handle)
      'granted' → _dataHandle injetado, sync pronto
      'prompt'  → _pendingHandle, store.permissionNeeded = true
      'denied'  → store.fileHandleLost = true
  - initTabGuard() — BroadcastChannel para detecção de múltiplas abas
  - Route guard: data !== null → AppLayout, senão → /onboarding
```

### Máquina de estados de permissão do FileHandle

```
startup
  → checkHandlePermission(handle)
      ├── 'granted'  → _dataHandle injetado; sync automático pronto
      ├── 'prompt'   → _pendingHandle; store.permissionNeeded = true (ícone azul)
      └── 'denied'   → store.fileHandleLost = true (ícone vermelho/!)

clique no botão de sync (persist())
  ├── isPermissionNeeded() → requestHandlePermission() → promoção para _dataHandle
  │     └── negado → fileHandleLost = true
  ├── isHandleLost() → saveDataFile() abre showSaveFilePicker() para re-associar
  └── normal → readCurrentDataFile() → conflito? → syncToFile()
```

### Dois caminhos de persistência de arquivo (`sync.ts`)

| Função | Uso | Comportamento |
|--------|-----|---------------|
| `importFileToIdb(file)` | Onboarding e Settings import | Valida Zod, **limpa IDB, salva novo** (total replace) |
| `syncToFile(local, diskSnapshot)` | `persist()` recorrente | **Merge por UUID** + write. Nunca sobrescreve sem ler antes |

> **CRÍTICO**: nunca misturar os dois caminhos. `importFileToIdb` é onboarding; `syncToFile` é sync diário.

### Estratégia de merge (`merge.ts` — `mergeDataFiles`)

- `schemaVersion`: local wins
- `user`: local wins (edições mais recentes)
- `settings`: local wins, **exceto `fileCreatedAt`** que vem do disco (preserva data original)
- `accounts`, `categories`, `tags`, `transactions`: union por `id` — local tem prioridade; itens só no disco são recuperados
- `auditLog`: union por `id`, ordenado por `timestamp` ASC, política de retenção aplicada

Detecção de conflito: `File.lastModified > _lastWrittenModified` → exibe `ConflictModal`

### Modo fallback sem FSA (`isFsaSupported()`)

Quando `typeof window?.showSaveFilePicker !== 'function'` (Firefox, Safari):
- Navbar: ícone de sync **oculto** (`fsaSupported=false` prop)
- AppLayout: exibe banner dismissível (localStorage `nexus_fsa_notice_seen`)
- Onboarding "Novo Perfil": **skip** do `showSaveFilePicker` → `downloadDataFile()` imediato
- Onboarding "Importar": botão "Importar e Iniciar" **oculto** (drop zone + `<input type="file">` funcionam)
- Settings Import: botão dispara `<input type="file" ref>` oculto em vez de `openDataFile()`
- Settings Export: **já usa `downloadDataFile()`** — sem mudança necessária

### Validação de dados externos

- Todo JSON importado ou lido do disco passa por `validateDataFile()` em `schema.ts`
- `validateDataFile()` faz `DataFileSchema.parse(data)` → lança `SchemaVersionError` se `schemaVersion > CURRENT_SCHEMA_VERSION`
- `SchemaVersionError` é uma subclasse de `Error` com `detectedVersion: number` e `name = 'SchemaVersionError'`
- Schemas Zod são a única entrada de dados externos (sem `as DataFile`)
- Falha na validação → rejeita, mantém dados locais intactos

---

## Padrões Críticos de Implementação

### Parsing de datas — `parseDateLocal()` (`lib/utils.ts`)

**Problema:** `new Date("2026-04-01")` cria meia-noite UTC. Em fusos UTC− (ex: Brasil UTC−3), chamar `.getMonth()` / `.getFullYear()` retorna o mês/ano do dia anterior, porque a data local é ainda 31/03 às 21h. Isso causava os bugs B-01, B-02 e B-03 (gráficos vazios em todos os períodos que usavam o primeiro dia do mês).

**Solução:** usar `parseDateLocal(dateStr: string): Date` de `@/lib/utils`:

```typescript
export function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d) // meia-noite local, sem conversão UTC
}
```

**Regra:** toda comparação de `tx.date` (string `"YYYY-MM-DD"`) com mês/ano deve passar por `parseDateLocal()`. Nunca usar `new Date(tx.date)` para extrair `.getMonth()` ou `.getFullYear()`.

Locais onde `parseDateLocal` é obrigatório:
- `pages/Dashboard/index.tsx` — filtros de mês atual e cashFlowData
- `pages/Analytics/index.tsx` — cashFlowData e incomeByCategory/expenseByCategory
- Qualquer novo componente que filtre transações por período

---

### Motor de Fatura Virtual — `lib/utils.ts` (schema v2)

**Contexto:** O módulo de Cartão de Crédito adota faturas como entidade virtual (não persistida no `data.json`). Todo o ciclo de vida de uma fatura é derivado em runtime a partir de `Account.creditMetadata.closingDay` e `creditMetadata.dueDay`. Quatro funções puras compõem esse motor — todas devem usar `parseDateLocal()` internamente, nunca `new Date(dateStr)`.

```typescript
// Retorna o período (ano/mês) da fatura à qual uma transação pertence.
// Regra: day(txDate) > closingDay → fatura do mês seguinte; caso contrário, mês corrente.
getInvoicePeriod(txDate: string, closingDay: number): { year: number; month: number }

// Retorna a data de vencimento da fatura no formato "YYYY-MM-DD".
// Vencimento = mês seguinte ao período da fatura. Se dueDay > dias do mês, usa último dia.
getInvoiceDueDate(period: { year: number; month: number }, dueDay: number): string

// Soma o amount das transações EXPENSE da conta no período de fatura corrente.
// Retorna 0 se a conta não tiver creditMetadata.
getCurrentInvoiceBalance(transactions: Transaction[], account: Account): number

// Retorna a data efetiva para plotagem no gráfico de fluxo de caixa.
// Contas CREDIT com creditMetadata → data de vencimento da fatura (getInvoiceDueDate).
// Todos os outros casos (não-CREDIT, CREDIT sem metadata, CREDIT_PAYMENT) → tx.date.
getEffectiveCashFlowDate(tx: Transaction, accounts: Account[]): string
```

**Regra crítica de `getEffectiveCashFlowDate`:** aplicar **exclusivamente** na plotagem do gráfico de fluxo de caixa em `Analytics`. O breakdown por categoria usa sempre `tx.date` (perspectiva de orçamento — a despesa ocorreu na data da compra, não no vencimento). Transações `CREDIT_PAYMENT` são excluídas de todos os gráficos de Receitas × Despesas — são liquidação de passivo, não receita nem despesa.

---

### Saldo de conta — derivado de transações

**Problema:** o campo `Account.balance` (tipo `number`) é sempre `0` — é um campo estático herdado do schema, nunca atualizado automaticamente. Exibi-lo diretamente causa o bug B-04.

**Solução:** calcular o saldo real iterando `data.transactions` com um `useMemo`:

```typescript
const accountBalances = useMemo<Record<string, number>>(() => {
  if (!data) return {}
  const map: Record<string, number> = {}
  data.transactions.forEach((tx) => {
    if (tx.type === 'INCOME')   map[tx.accountId] = (map[tx.accountId] ?? 0) + tx.amount
    if (tx.type === 'EXPENSE')  map[tx.accountId] = (map[tx.accountId] ?? 0) - tx.amount
    if (tx.type === 'TRANSFER') map[tx.accountId] = (map[tx.accountId] ?? 0) - tx.amount
  })
  return map
}, [data])

// Uso: accountBalances[acc.id] ?? 0
```

**Regra:** nunca usar `acc.balance` para exibição. Sempre derivar do mapa acima.

Locais que usam este padrão:
- `pages/Settings/index.tsx` — aba Contas, coluna de saldo
- `pages/Dashboard/index.tsx` — card "Minhas Contas"

---

### Tradução de tipos de conta — `t(\`accounts.${type.toLowerCase()}\`)`

Os labels dos tipos de conta (`AccountType`) são traduzidos via a seção `accounts` dos arquivos de locale. Os valores são formas curtas adequadas tanto para grids compactos quanto para subtítulos:

| Chave i18n | pt-BR | en-US |
|---|---|---|
| `accounts.retail` | Corrente | Checking |
| `accounts.savings` | Poupança | Savings |
| `accounts.credit` | Crédito | Credit |
| `accounts.crypto` | Cripto | Crypto |
| `accounts.forex` | Câmbio | Forex |
| `accounts.asset` | Ativo | Asset |
| `accounts.stocks` | Ações | Stocks |
| `accounts.other` | Outros | Other |

**Regra:** nunca exibir o enum bruto (ex: `'RETAIL'`) diretamente na UI. Sempre usar `t(\`accounts.${type.toLowerCase()}\`)`.

Bug B-05: o modal de criação/edição de conta em `Settings/index.tsx` exibia `{t_}` (o enum bruto) em vez de `{t(\`accounts.${t_.toLowerCase()}\`)}`.

---

### Ícones e cores de tipos de conta (Dashboard)

O card "Minhas Contas" em `pages/Dashboard/index.tsx` usa dois mapas de constantes para renderizar cada tipo:

```typescript
const ACCOUNT_TYPE_ICONS: Record<AccountType, React.ReactNode> = {
  RETAIL: <Landmark />, SAVINGS: <PiggyBank />, CREDIT: <CreditCard />,
  CRYPTO: <Bitcoin />, FOREX: <ArrowLeftRight />, ASSET: <Briefcase />,
  STOCKS: <TrendingUp />, OTHER: <MoreHorizontal />,
}

const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  RETAIL: '#3B82F6', SAVINGS: '#22C55E', CREDIT: '#1F2937',
  CRYPTO: '#F59E0B', FOREX: '#8B5CF6', ASSET: '#6B7280',
  STOCKS: '#006E2F', OTHER: '#9CA3AF',
}
```

**Nota:** `Settings/index.tsx` tem sua própria cópia `ACCOUNT_TYPES[]` com ícones (usada apenas no grid do modal). Os dois conjuntos são intencionalmente independentes (tamanhos de ícone diferentes: 18px no Dashboard, 20px no Settings).

---

## Modelo de Dados

### `DataFile` (arquivo `data.json`, tipo em `types/index.ts`)

```typescript
interface DataFile {
  schemaVersion: number        // sempre presente; legados sem campo assumem 1
  user: User
  settings: Settings
  accounts: Account[]
  categories: Category[]
  tags: Tag[]
  transactions: Transaction[]
  auditLog: AuditEntry[]
  deletedIds: string[]         // tombstones (B-11) — UUIDs de entidades deletadas; default [] em arquivos legados
}
```

### Entidades

```typescript
interface User       { name, email, createdAt, updatedAt }  // datas ISO 8601

interface Settings   { fileCreatedAt, fileUpdatedAt,        // datas ISO 8601
                       auditLogRetentionLimit: number | null } // null = ilimitado

interface Account    { id, name, type: AccountType, balance, includeInBalance,
                       creditMetadata?: CreditMetadata } // apenas contas CREDIT — schema v2
// AccountType: 'RETAIL' | 'SAVINGS' | 'CREDIT' | 'CRYPTO' | 'FOREX' | 'ASSET' | 'STOCKS' | 'OTHER'

interface Category   { id, parentId: string | null, name, icon, color,
                       type: CategoryType }
// CategoryType: 'INCOME' | 'EXPENSE'

interface Tag        { id, name, color }

interface Transaction { id, accountId, categoryId, amount, type: TransactionType,
                        date, description, isPaid, tags: string[],
                        installment?: Installment,     // apenas compras parceladas — schema v2
                        transferAccountId?: string }   // apenas CREDIT_PAYMENT: conta debitada (CC-21)
// TransactionType: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'CREDIT_PAYMENT' (schema v2)

// ── Schema v2 — tipos adicionados pelo módulo de Cartão de Crédito (CC-01 a CC-05) ──
interface CreditMetadata { limit: number; closingDay: number; dueDay: number }
// closingDay e dueDay: inteiros de 1 a 28 (conservador — evita edge case de fevereiro)
// creditMetadata é opcional em Account; presente apenas em contas do tipo CREDIT

interface Installment { parentId: string; currentIndex: number; total: number }
// parentId = UUID da primeira parcela do grupo (gerado na criação)
// currentIndex começa em 1; installment é opcional em Transaction

interface AuditEntry { id, timestamp, action: AuditAction,
                       entity: AuditEntity, entityId, summary }
// AuditAction:  'CREATE' | 'UPDATE' | 'DELETE'
// AuditEntity:  'account' | 'category' | 'tag' | 'transaction' | 'user'
```

### `WorkspaceFile` (localStorage `nexus_workspace`)

```typescript
{ theme: 'light' | 'dark' | 'system', locale: 'pt-BR' | 'en-US', defaultView: string }
```

### IndexedDB `nexus-db` (DB_VERSION = 2)

| Store | Chave | Tipo | Conteúdo |
|-------|-------|------|---------|
| `ledger` | `'current'` | `DataFile` | snapshot completo do ledger |
| `ledger` | `'sync-meta'` | `{ unsyncedCount: number }` | badge de sync sobrevive reload |
| `handles` | `'data'` | `FileSystemFileHandle` | handle do arquivo do usuário |

### Versionamento do schema

- `CURRENT_SCHEMA_VERSION = 2` (constante em `schema.ts`) — incrementado de 1 para 2 pelo módulo de Cartão de Crédito (CC-05)
- Arquivos sem `schemaVersion` são tratados como v1 (Zod `.default(1)`) e promovidos para v2 pela migração automática
- Arquivos com versão futura lançam `SchemaVersionError` com mensagem i18n `settings.importVersionError`
- Para evoluir o schema: incrementar `CURRENT_SCHEMA_VERSION`, adicionar migração em `validateDataFile()` via `migrateDataFile()`
- **Migração v1→v2 (implementada em CC-05):** promove `schemaVersion` de 1 para 2; campos opcionais `creditMetadata` e `installment` não exigem backfill (ausência é válida). Migração idempotente — arquivos v2 passam sem alteração.

---

## API de cada módulo de storage

### `schema.ts` — exports públicos

| Export | Tipo | Descrição |
|--------|------|-----------|
| `CURRENT_SCHEMA_VERSION` | `number` (2) | Versão atual do schema |
| `AUDIT_RETENTION_DEFAULT` | `number` (200) | Limite padrão de entradas |
| `AUDIT_RETENTION_DAYS` | `number` (90) | Janela de retenção por data |
| `SchemaVersionError` | `class` | Erro para versão incompatível; tem `.detectedVersion` |
| `DataFileSchema` | Zod schema | Schema completo do DataFile |
| `validateDataFile(data)` | `DataFile` | Valida + lança SchemaVersionError se necessário |
| `createEmptyDataFile(name, email)` | `DataFile` | Cria DataFile com categorias padrão |
| `createDefaultWorkspace()` | `WorkspaceFile` | Workspace padrão (system, pt-BR, dashboard) |
| `applyRetention(log, limit)` | `AuditEntry[]` | Aplica retenção por data + limite de entradas |

### `fileSystem.ts` — exports públicos

| Export | Tipo | Descrição |
|--------|------|-----------|
| `isFsaSupported()` | `boolean` | true se `showSaveFilePicker` existe |
| `setDataHandle(handle)` | `void` | Injeta handle (usado em testes) |
| `checkHandlePermission(handle)` | `Promise<PermissionState>` | Startup: verifica e roteia handle |
| `requestHandlePermission()` | `Promise<boolean>` | Dentro de gesto: pede permissão pendente |
| `isPermissionNeeded()` | `boolean` | true se há _pendingHandle |
| `isHandleLost()` | `boolean` | true se último acesso deu NotFoundError |
| `getLastWrittenModified()` | `number \| null` | Timestamp após último write bem-sucedido |
| `openDataFile()` | `Promise<{handle, file} \| null>` | showOpenFilePicker → retorna handle+File |
| `createNewDataFile(data, name?)` | `Promise<FileSystemFileHandle \| null>` | showSaveFilePicker → escreve JSON inicial |
| `readCurrentDataFile()` | `Promise<{data, lastModified} \| null>` | Lê handle cached; não abre picker |
| `saveDataFile(data)` | `Promise<boolean>` | Escreve em handle cached; abre picker se null |
| `downloadDataFile(data, filename?)` | `void` | Fallback: `<a download>` programático |
| `loadWorkspace()` | `WorkspaceFile \| null` | localStorage read |
| `saveWorkspace(w)` | `void` | localStorage write |

### `indexedDb.ts` — exports públicos

| Export | Descrição |
|--------|-----------|
| `saveToIdb(data)` | Salva DataFile em `ledger/'current'` |
| `loadFromIdb()` | Carrega DataFile ou null |
| `clearIdb()` | Remove `ledger/'current'` |
| `saveSyncMeta(count)` | Salva `{ unsyncedCount }` em `ledger/'sync-meta'` |
| `loadSyncMeta()` | Carrega `{ unsyncedCount }` ou null |
| `saveFileHandle(handle)` | Salva FileSystemFileHandle em `handles/'data'` |
| `loadFileHandle()` | Carrega FileSystemFileHandle ou null |
| `clearFileHandle()` | Remove `handles/'data'` |

### `sync.ts` — exports públicos

| Export | Caminho | Descrição |
|--------|---------|-----------|
| `importFileToIdb(file)` | Import (onboarding) | Valida, limpa IDB, salva. Lança se inválido |
| `syncToFile(local, diskSnapshot)` | Sync recorrente | Merge + write. Retorna merged ou null |

### `merge.ts` — exports públicos

| Export | Descrição |
|--------|-----------|
| `mergeDataFiles(local, disk)` | Union por UUID, local wins, fileCreatedAt de disk |

---

## `useDataStore` — interface e comportamentos

### Estado

```typescript
data: DataFile | null          // null = usuário não fez onboarding ainda
unsyncedCount: number          // badge da Navbar; persiste no IDB via sync-meta
conflictData: { local, disk } | null  // quando lastModified > _lastWrittenModified
fileHandleLost: boolean        // NotFoundError ou 'denied' no startup
permissionNeeded: boolean      // handle em estado 'prompt'
isSecondaryTab: boolean        // BroadcastChannel detectou outra aba aberta
writeError: boolean            // última escrita em disco falhou
idbQuotaExceeded: boolean      // QuotaExceededError ao salvar no IDB
```

### Mutações (cada uma chama `mutate()`)

`mutate()` faz: `structuredClone(data)` → aplica fn → incrementa `unsyncedCount` → `debouncedSaveToIdb()` (300ms)

- `addAccount / updateAccount / deleteAccount`
- `addCategory / updateCategory / deleteCategory`
- `addTag / updateTag / deleteTag`
- `addTransaction / updateTransaction / deleteTransaction`
- `deleteInstallmentGroup(parentId)` — remove todas as transações do grupo e gera audit DELETE (CC-27)
- `updateUser(patch)` — merge parcial com `updatedAt: now()`
- `setRetentionLimit(limit)` — aplica política imediatamente ao `auditLog`

Toda mutação gera uma `AuditEntry` via `makeEntry()` + `addAudit()`.

### `persist()` — fluxo completo

```
1. isSecondaryTab? → false (aba bloqueada)
2. isPermissionNeeded()? → requestHandlePermission()
     granted → continua; denied → fileHandleLost = true, return false
3. isHandleLost()? → saveDataFile() (picker) → ok: unsyncedCount=0; return
4. readCurrentDataFile() → diskSnapshot ou null
5. isHandleLost() após leitura? → fileHandleLost = true, return false
6. diskSnapshot.lastModified > _lastWrittenModified? → conflictData set, return false
7. syncToFile(updated, diskSnapshot) → mergeDataFiles() + saveDataFile()
     ok: store atualizado, IDB sincronizado (unsyncedCount=0)
     handleLost: fileHandleLost = true
     write fail: writeError = true (unsyncedCount mantido)
```

### `loadData(data)` vs `clearData()`

- `loadData`: set `{ data, unsyncedCount: 0 }` — usado no startup e após import
- `clearData`: set `{ data: null, unsyncedCount: 0 }` — logout/reset

---

## `useWorkspaceStore` — interface

```typescript
workspace: WorkspaceFile  // theme, locale, defaultView
init()                    // carrega localStorage → state
setTheme(theme)           // atualiza state + localStorage
setLocale(locale)         // atualiza state + localStorage
setDefaultView(view)      // atualiza state + localStorage
```

---

## AppLayout — Banners e estados de UI

O `AppLayout` renderiza, em ordem, os seguintes elementos condicionais:

| Condição | UI | Posição |
|----------|----|---------|
| `isSecondaryTab` | Banner fixo vermelho abaixo da Navbar | `fixed top-14` |
| `idbQuotaExceeded` | Banner flow com botão de export + link settings | `<main>` topo |
| `!fsaSupported && !fsaNoticeDismissed` | Banner informativo dismissível | `<main>` topo |
| `writeError` | Toast temporário (5s) | canto inferior |
| `conflictData` | `ConflictModal` (overwrite vs load-cloud) | modal overlay |

A Navbar recebe `fsaSupported` como prop — quando false, o botão de sync é completamente omitido do DOM.

---

## Detalhes das Páginas

### Dashboard (`pages/Dashboard/index.tsx`)

Layout em três blocos verticais:

1. **Stat cards** (grid 3 colunas) — Receitas, Despesas e Saldo do mês corrente. Saldo usa `bg-primary` (verde).
2. **Accounts + Category row** (grid 3 colunas):
   - Col-span-2 — **Card "Minhas Contas"**: lista contas com `includeInBalance = true`. Cada linha mostra ícone colorido por tipo, nome, label de tipo (via `t(\`accounts.${type.toLowerCase()}\`)`) e saldo derivado de transações. Saldo negativo em `text-tertiary` (vermelho).
   - Col-span-1 — **Donut "Despesas por Categoria"**: agrupamento das despesas do mês corrente por categoria, com legenda de até 4 entradas e total no centro.
3. **Últimos Lançamentos** (full width) — 5 transações mais recentes ordenadas por data decrescente.

Dados derivados com `useMemo`:
- `income / expenses / balance / recentTxs` — filtrados pelo mês/ano atual via `parseDateLocal`
- `accountBalances` — mapa `accountId → number` derivado de todas as transações (INCOME+, EXPENSE−, TRANSFER−). **Schema v2:** contas `CREDIT` com `creditMetadata` usam `creditMetadata.limit - getCurrentInvoiceBalance()` em vez do somatório; exibem label "Limite disponível" (CC-13, CC-14)
- `donutData` — despesas do mês agrupadas por categoria, com percentual

> **Nota:** o gráfico de fluxo de caixa foi removido do Dashboard (M-21). Ele continua disponível na página Analytics com mais opções de período.

---

### Analytics (`pages/Analytics/index.tsx`)

Controles de período no topo: navegação por offset de meses, tabs `Mês / Semestre / Personalizado`, toggle `Incluir não pagos` (padrão **true** — bug B-02/B-03 era `false`).

Dois blocos de visualização:
1. **LineChart de Fluxo de Caixa** — `generalFlow` (receitas − despesas por mês) e `consolidatedBalance` (acumulado). Renderizado apenas se algum ponto `!== 0`.
2. **Donut por Categoria** (grid 2 colunas) — um `CategoryDonut` para Receitas, outro para Despesas. Estado vazio exibido se `data.length === 0`.

Todos os filtros de data usam `parseDateLocal(tx.date)` para evitar o bug UTC.

**Schema v2:** o `cashFlowData` usa `parseDateLocal(getEffectiveCashFlowDate(tx, accounts))` para plotagem — transações de cartão de crédito aparecem no mês do vencimento da fatura, não no mês da compra (CC-16). O breakdown de categorias mantém `tx.date` (CC-18). `CREDIT_PAYMENT` é excluído de todos os cálculos de receita/despesa (CC-17).

---

### Settings (`pages/Settings/index.tsx`)

Abas: `accounts | categories | tags | profile | preferences | data | history`.

**Aba Contas:**
- Saldo exibido calculado via `accountBalances` useMemo (mesma lógica do Dashboard). **Nunca** usar `acc.balance`.
- Modal Adicionar/Editar: grid 4×2 de tipos de conta. Labels traduzidos via `t(\`accounts.${t_.toLowerCase()}\`)`. Antes do fix B-05, o enum bruto era exibido (RETAIL, SAVINGS…).
- **Schema v2:** ao selecionar tipo `CREDIT` no modal, exibir campos extras `creditMetadata` (limit, closingDay, dueDay) e setar `includeInBalance: false` como padrão (CC-10, CC-11). A coluna de saldo bifurca para contas CREDIT: exibe "Limite disp." calculado via `getCurrentInvoiceBalance` (CC-15).

**Aba Categorias:** hierarquia pai/filho; ícone via `categoryIcon(name)` que mapeia strings para componentes Lucide.

**Aba Tags:** paleta de 8 cores (`TAG_COLORS`).

**Aba Dados:** importação via `<input type="file">` (FSA fallback) ou `openDataFile()` (FSA); exportação via `downloadDataFile()`. Botão "Exportar Base Local" disponível em situações de emergência (quota excedida, JSON corrompido).

---

### CreditCard (`pages/CreditCard/index.tsx`)

Rota: `/credit-card/:accountId` — acessada ao clicar em um card de cartão no Dashboard.

Blocos de UI:
1. **Header** — botão voltar + nome do cartão.
2. **Card de fatura** — mês/ano do período, datas de fechamento e vencimento, limite disponível, total da fatura, botão "Pagar Agora" (abre `TransactionDrawer`), navegação `< >` por período (`periodOffset`).
3. **Chips de categoria** — filtro por categoria das transações da fatura corrente.
4. **Lista de transações** — `InvoiceTxRow`: ícone de categoria, descrição, categoria, conta, data, valor. Clique abre `TransactionDrawer` em modo edição.
5. **Resumo de gastos** — barras de progresso por categoria + total.

Dados derivados com `useMemo`:
- `resolvedPeriod` — aplica `getInvoicePeriod` sobre hoje + `periodOffset` para obter `{year, month}` (1-based)
- `closingDateStr / dueDateStr` — datas do período a partir de `creditMetadata`
- `invoiceTransactions` — apenas `EXPENSE` da conta no período resolvido (nunca inclui `CREDIT_PAYMENT`)
- `categoryTotals` — agrupamento por categoria, ordenado por valor decrescente
- `filteredTransactions` — `invoiceTransactions` filtrado por `filterCategory`

---

## Convenções de Código

### Nomenclatura

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Componentes React | PascalCase | `TransactionDrawer.tsx` |
| Páginas | `index.tsx` em pasta | `pages/Dashboard/index.tsx` |
| Stores | prefixo `use` + PascalCase | `useDataStore.ts` |
| Utilitários | camelCase | `fileSystem.ts`, `merge.ts` |
| Testes unitários | `*.test.ts` | `useDataStore.test.ts` |
| Testes E2E | `*.spec.ts` | `persistence.spec.ts` |
| Constantes | UPPER_SNAKE_CASE | `AUDIT_RETENTION_DEFAULT` |
| Handlers de evento | prefixo `handle` | `handleSync`, `handleClick` |
| Membros privados de módulo | prefixo `_` | `_lastWrittenModified`, `_dataHandle` |

### TypeScript

- **Strict mode** ativo: `noUnusedLocals`, `noUnusedParameters`, `noImplicitAny`
- Type imports separados: `import type { DataFile } from '@/types'`
- Enums como union types de string (ex: `AccountType`, `TransactionType`)
- Nunca usar `as SomeType` para contornar validação — use schemas Zod
- Ao destruturar para excluir uma chave em testes: `const { key: _key, ...rest } = obj` com `// eslint-disable-next-line @typescript-eslint/no-unused-vars`

### Imports

- Alias `@/` aponta para `src/` (configurado em `vite.config.ts` + `tsconfig.app.json`)
- Usar sempre `@/` em vez de caminhos relativos longos
- React hooks sem prefixo `React.`: `import { useState } from 'react'`

### Formatação

- Prettier: 100 chars por linha, sem ponto-e-vírgula, aspas simples, trailing commas
- Indentação: 2 espaços
- Seções lógicas no código: separadores `─── ───` em comentários de heading

### Componentes

- Sempre componentes funcionais com hooks
- Interface de props exportada acima do componente (ou inline quando simples)
- Sem class components
- `useMemo` para dados derivados pesados (ex: cálculos de gráficos)
- `useMemo` com `[]` para valores estáticos computados uma vez (ex: `isFsaSupported()`)

---

## Testes

### Cobertura atual (2026-04-15, atualizado pós B-06–B-11)

- **351 testes unitários passando** — 22 arquivos de teste
- **19 testes E2E passando** — 4 arquivos de spec (incluindo `creditCard.spec.ts` com 5 cenários)
- Cobertura: **97.29% statements**, ~92% branches, ~95% funções
- Arquivos críticos (schema, merge, sync, indexedDb, store): 97–100% de cobertura
- `schema.ts`: 100% — inclui testes de migração v1→v2 e validação dos novos campos (CC-05)
- `utils.ts`: 100% — inclui testes para `parseDateLocal` + motor de fatura virtual CC-06–CC-09 (19 novos testes)
- `useDataStore.ts`: 98.6% statements — inclui 4 novos testes para `creditMetadata` (CC-12) + 3 novos testes para `CREDIT_PAYMENT` audit log (CC-21) + 16 novos testes para geração de parcelas (CC-24/CC-25) + 5 novos testes para `deleteInstallmentGroup` (CC-27)
- `Dashboard.test.tsx`: 10 novos testes — bifurcação de `accountBalances` e seção "Meus Cartões" (CC-13/14); +2 testes excluindo `CREDIT_PAYMENT` dos totais (CC-22)
- `Settings.test.tsx`: 6 novos testes — bifurcação de saldo e label "Limite disponível" na aba Contas (CC-15)
- `Analytics.test.tsx`: 10 novos testes — `getEffectiveCashFlowDate` no gráfico de caixa, exclusão de `CREDIT_PAYMENT`, perspectiva de orçamento no breakdown por categoria (CC-16–CC-18)
- `TransactionDrawer.test.tsx`: 10 novos testes — dois seletores de conta CREDIT_PAYMENT (CC-19) e hint de fatura corrente (CC-20) + 9 novos testes seção de parcelamento (CC-23) + 6 novos testes modal de deleção (CC-26) + 2 novos testes auto-foco (M-20)
- `Transactions.test.tsx`: novo arquivo — 3 testes de exibição de `CREDIT_PAYMENT` no extrato (CC-22)

### Testes unitários (Vitest)

- Ambiente: `jsdom`
- Setup: `src/test/setup.ts` importa `@testing-library/jest-dom`
- Factories em `src/test/fixtures/`: `makeDataFile()` (inclui `schemaVersion: 2`)
- Reset de store no `beforeEach`: `useDataStore.setState({ data: null, unsyncedCount: 0 })`
- Mocks de módulos: `vi.mock('react-i18next')`, `vi.mock('react-router-dom')`
- `fileSystem.test.ts` usa `vi.resetModules()` + `await import()` em cada describe para isolar estado de módulo
- Threshold de cobertura: **80% de linhas e funções** para arquivos críticos

### Testes E2E (Playwright)

- Browser: apenas Chromium (`Desktop Chrome`)
- Base URL: `http://localhost:5173` (servidor iniciado automaticamente)
- Timeout: 30 segundos por teste
- Trace: `on-first-retry`

**Mock da File System Access API** (via `addInitScript`):
- `showSaveFilePicker()` → retorna handle fake que captura JSON gravado
- `showOpenFilePicker()` → retorna handle fake com conteúdo injetado
- `indexedDB.deleteDatabase('nexus-db')` → limpa entre testes
- `localStorage.clear()` → reseta workspace

**Regra crítica:** Nunca substituir mocks E2E por mocks em memória. A validação real do fluxo File System API → IndexedDB → store é o valor dos testes E2E.

### Scripts de qualidade (executar antes de todo commit)

```bash
# 1. Formatação
cd app && npm run format:check

# 2. Lint
cd app && npm run lint

# 3. Tipos
cd app && npx tsc -b --noEmit

# 4. Testes unitários com cobertura
cd app && npx vitest run --coverage

# 5. E2E (opcional local, obrigatório no CI)
cd app && npx playwright test
```

O CI replica exatamente esses comandos. Se passa localmente, passa no CI.

---

## Convenções de Git

### Formato de commit

```
<tipo>: <descrição imperativa em minúsculas>
```

| Tipo | Uso |
|------|-----|
| `feat:` | Nova funcionalidade |
| `fix:` | Correção de bug |
| `test:` | Adição/correção de testes |
| `style:` | Formatação (sem alteração de lógica) |
| `refactor:` | Refatoração sem mudança de comportamento |
| `docs:` | Documentação |
| `chore:` | Configuração, CI, dependências |

**Exemplos:**
```
feat: implement M-18 — FSA fallback for Firefox/Safari
fix: resolve B-04 — incorrect balance calculation in Settings accounts tab
style: apply Prettier formatting to useDataStore.test.ts
```

Referência obrigatória ao ID do milestone (M-XX) ou bug (B-XX) quando aplicável.

### Regras de branch/PR

- Uma feature por commit/PR — facilita revisão e rollback
- CI verde obrigatório antes de merge — sem exceções
- Nenhum `TODO` no código — vai para `BACKLOG.md`

---

## Estado Atual do Projeto (2026-04-15, atualizado pós B-06–B-11)

### Funcionalidades implementadas

| Feature | Milestone | Status |
|---------|-----------|--------|
| Schema v2 — `CREDIT_PAYMENT`, `CreditMetadata`, `Installment` + migração automática v1→v2 | CC-01–CC-05 | ✅ |
| Motor de fatura virtual — `getInvoicePeriod`, `getInvoiceDueDate`, `getCurrentInvoiceBalance`, `getEffectiveCashFlowDate` em `lib/utils.ts` | CC-06–CC-09 | ✅ |
| Conta CREDIT: campos `creditMetadata` no modal de conta + `includeInBalance: false` automático + sanitização no store | CC-10–CC-12 | ✅ |
| Saldo CREDIT: Dashboard bifurca `accountBalances` (limite disponível = limit − fatura), seção "Meus Cartões" separada com barra de utilização | CC-13–CC-14 | ✅ |
| Saldo CREDIT: Settings aba Contas exibe "Limite disponível" e valor correto para contas CREDIT | CC-15 | ✅ |
| Analytics: despesas CREDIT projetadas na data de vencimento da fatura no gráfico de caixa | CC-16 | ✅ |
| Analytics: `CREDIT_PAYMENT` excluído dos gráficos de Receitas × Despesas e do breakdown de categorias | CC-17 | ✅ |
| Analytics: breakdown de categorias usa `tx.date` (perspectiva de orçamento) com comentário inline | CC-18 | ✅ |
| TransactionDrawer: tipo `CREDIT_PAYMENT` com dois seletores (cartão + conta de débito) + i18n | CC-19 | ✅ |
| TransactionDrawer: hint "Fatura atual: R$ X,XX" ao selecionar conta CREDIT em CREDIT_PAYMENT | CC-20 | ✅ |
| Store: `addTransaction` persiste `transferAccountId` e gera audit log descritivo para CREDIT_PAYMENT | CC-21 | ✅ |
| Transactions/Dashboard: CREDIT_PAYMENT com ícone neutro + label distinto + excluído dos totais mensais; página dedicada `/credit-card/:accountId` | CC-22 | ✅ |
| TransactionDrawer: seção "Parcelar?" (toggle + campo de contagem + hint) para EXPENSE em conta CREDIT; payload inclui `installment` metadata | CC-23 | ✅ |
| Store: `addTransaction` gera N transações com ids únicos, datas avançadas mês a mês, descrições com sufixo "(X/N)", valores divididos com resíduo na 1ª parcela | CC-24 | ✅ |
| Store: grupo de parcelas gera **uma** entrada no Audit Log com summary descritivo | CC-25 | ✅ |
| TransactionDrawer: ao excluir transação parcelada, exibe modal com opções "Excluir apenas esta" / "Excluir todas" / "Cancelar" | CC-26 | ✅ |
| Store: `deleteInstallmentGroup(parentId)` remove todas as transações do grupo e gera entry DELETE no Audit Log | CC-27 | ✅ |
| Perfil do usuário | — | ✅ |
| CRUD de contas (8 tipos) | M-03 | ✅ |
| CRUD de categorias (hierarquia pai/filho) | M-04 | ✅ |
| CRUD de tags (paleta de cores) | M-05 | ✅ |
| CRUD de transações (Income/Expense/Transfer) | — | ✅ |
| Editar/remover transação ao clicar na linha | M-02 | ✅ |
| Dashboard com cards mensais + card Minhas Contas | M-21 | ✅ |
| Gráfico de fluxo de caixa (±3 meses) | — | ✅ |
| Gráfico de despesas por categoria (donut) | — | ✅ |
| Exportar/Importar data.json | — | ✅ |
| Seletor de idioma (pt-BR / en-US) | — | ✅ |
| Onboarding (criar ou importar) | M-07 | ✅ |
| Auto-save via IndexedDB (debounce 300ms) | — | ✅ |
| Log de auditoria com política de retenção | — | ✅ |
| Badge de sync (contagem de não sincronizados) | — | ✅ |
| Cold start sync (FileHandle persiste no IDB) | M-07 | ✅ |
| Validação Zod na importação | M-08 | ✅ |
| Read-before-write com merge por UUID | M-09 | ✅ |
| Detecção e resolução de conflito | M-10 | ✅ |
| Recuperação de arquivo perdido (NotFoundError) | M-11 | ✅ |
| Re-permissão de FileHandle no startup | M-14 | ✅ |
| Rejeição de JSON corrompido + exportação de emergência | M-12 | ✅ |
| Detecção de múltiplas abas (BroadcastChannel) | M-13 | ✅ |
| Toast de erro em falha de escrita, ícone de sync em alerta | M-15 | ✅ |
| Banner persistente de quota excedida no IndexedDB + exportação de emergência | M-16 | ✅ |
| Persistência do `unsyncedCount` no IDB; badge restaurado após reload | M-19 | ✅ |
| Versionamento do `data.json` (`schemaVersion`); rejeição de arquivos de versão futura | M-01 | ✅ |
| Separação semântica import vs. sync (`importFileToIdb` / `syncToFile`) | M-17 | ✅ |
| Fallback para browsers sem FSA: sync oculto, import via `<input>`, create via download, aviso dismissível | M-18 | ✅ |
| TransactionDrawer: foco automático no campo de valor ao abrir (criar ou editar) | M-20 | ✅ |
| `parseDateLocal()` em `utils.ts` — parsing de datas sem bug de fuso UTC | refactor | ✅ |
| Analytics: correção de filtro `includeUnpaid` (padrão `true`) e parsing de datas | B-02/B-03 | ✅ |
| Settings aba Contas: saldo calculado a partir de transações (não `acc.balance`) | B-04 | ✅ |
| Settings modal conta: labels de tipo traduzidos via i18n (não enum bruto) | B-05 | ✅ |
| CREDIT closingDay/dueDay: limite máximo corrigido de 28 para 31 | B-06/B-07 | ✅ |
| CreditCard: botão "›" de navegação para frente desbloqueado | B-08 | ✅ |
| Dashboard: despesas CREDIT projetadas para o mês do vencimento da fatura (não data da compra) | B-09 | ✅ |
| TransactionDrawer: toggle isPaid restaurado para INCOME e EXPENSE | B-10 | ✅ |
| Sync: tombstone `deletedIds` previne re-aparecimento de entidades deletadas após merge | B-11 | ✅ |

### Bugs resolvidos

| ID | Descrição | Causa raiz | Fix |
|----|-----------|-----------|-----|
| B-01 | Dashboard: gráfico de cash flow não exibia dados | (1) `new Date("YYYY-MM-DD")` cria UTC midnight → `.getMonth()` retorna mês errado em UTC−; (2) empty-check `length > 0` sempre true | `parseDateLocal()` + empty-check corrigido |
| B-02 | Analytics: gráfico de Receitas por Categoria vazio | `includeUnpaid` defaultava `false` → todas as transações criadas com `isPaid:false` eram filtradas | Default alterado para `true` + `parseDateLocal()` |
| B-03 | Analytics: gráfico de Despesas por Categoria vazio | Mesma causa raiz que B-02 | Mesma correção que B-02 |
| B-04 | Settings aba Contas: saldo sempre zero | `acc.balance` é campo estático sempre `0`; saldo real deve ser derivado de transações | `accountBalances` useMemo (INCOME+, EXPENSE−, TRANSFER−) |
| B-05 | Modal Adicionar/Editar Conta: tipos exibiam enum inglês (RETAIL, SAVINGS…) | `{t_}` renderizava o enum bruto em vez de chamar `t(...)` | `{t(\`accounts.${t_.toLowerCase()}\`)}` |
| B-06 | Modal conta CREDIT: campos closingDay/dueDay rejeitavam valores 29–31 | `CreditMetadataSchema` e inputs com `.max(28)` | `.max(31)` no schema + `max={31}` nos inputs |
| B-07 | CreditCard: datas de fechamento/vencimento não exibidas quando closingDay/dueDay > 28 | Schema rejeitava o valor → campos `undefined` → datas não calculadas | Resolvido como side-effect de B-06 |
| B-08 | CreditCard: botão "›" (avançar período) não respondia ao clique | `disabled={periodOffset >= 0}` bloqueava navegação para o futuro | Removido o guard de `disabled` do botão direito |
| B-09 | Dashboard: despesas CREDIT somadas no mês da compra, não do vencimento | `useMemo` de income/expenses usava `parseDateLocal(tx.date)` sem `getEffectiveCashFlowDate` | Substituído por `parseDateLocal(getEffectiveCashFlowDate(tx, accounts))`; `CREDIT_PAYMENT` excluído |
| B-10 | TransactionDrawer: toggle "Pago" (`isPaid`) sumiu do formulário | Campo removido acidentalmente durante refatoração do CC; hardcoded a `false` | Restaurado com estado `isPaid` dedicado, visível para INCOME e EXPENSE |
| B-11 | Sync: entidades deletadas reapareciam após merge com disco | `mergeDataFiles` recuperava por UUID sem distinguir "nunca existiu" de "foi deletado" | Campo `deletedIds: string[]` no DataFile; mutações de delete registram tombstones; `mergeById` filtra por tombstones |

### Melhorias — todas resolvidas até aqui

| ID | Descrição | Status |
|----|-----------|--------|
| ~~M-01~~ | ~~Versionar data.json para compatibilidade de schema~~ | ✅ |
| ~~M-02~~ | ~~Editar/remover transação ao clicar~~ | ✅ |
| ~~M-03~~ | ~~Modal de criação/edição de contas~~ | ✅ |
| ~~M-04~~ | ~~Modal de criação/edição de categorias~~ | ✅ |
| ~~M-05~~ | ~~Modal de criação/edição de tags~~ | ✅ |
| ~~M-06~~ | ~~Edição e remoção de contas/categorias/tags~~ | ✅ |
| ~~M-07~~ | ~~Cold Start sync + FileHandle no IDB~~ | ✅ |
| ~~M-08~~ | ~~Hidratação via importação~~ | ✅ |
| ~~M-09~~ | ~~Read-before-write com merge~~ | ✅ |
| ~~M-10~~ | ~~Detecção e resolução de conflito~~ | ✅ |
| ~~M-11~~ | ~~Arquivo perdido (NotFoundError)~~ | ✅ |
| ~~M-12~~ | ~~Arquivos corrompidos + export de emergência~~ | ✅ |
| ~~M-13~~ | ~~Múltiplas abas (BroadcastChannel)~~ | ✅ |
| ~~M-14~~ | ~~Re-permissão do FileHandle no startup~~ | ✅ |
| ~~M-15~~ | ~~Falha de escrita: toast + ícone de alerta~~ | ✅ |
| ~~M-16~~ | ~~Quota excedida no IndexedDB~~ | ✅ |
| ~~M-17~~ | ~~Separar semântica import vs. sync~~ | ✅ |
| ~~M-18~~ | ~~Fallback sem File System Access API~~ | ✅ |
| ~~M-19~~ | ~~Persistir unsyncedCount no IndexedDB~~ | ✅ |
| ~~M-21~~ | ~~Card "Minhas Contas" no Dashboard (substituiu gráfico de cash flow)~~ | ✅ |

### Módulo de Cartão de Crédito — Em Desenvolvimento

Planejamento concluído em 2026-04-14. Decisões arquiteturais e desafios técnicos em `plan/CREDIT_CARD.md`. 30 tarefas (CC-01 a CC-30) detalhadas em `plan/BACKLOG.md`.

**5 decisões de produto consolidadas:**
1. Faturas computadas em runtime (virtual) — sem entidade `Invoice` no `data.json`
2. `CREDIT_PAYMENT` como `TransactionType` distinto (não reutiliza `TRANSFER`)
3. Estornos/chargebacks out-of-scope neste ciclo (mapeados como M-22)
4. Parcelas como N transações independentes com sufixo `" (X/N)"` na descrição
5. Deleção de parcelas via modal de 2 opções ("só esta" / "todas")

**Sequência de implementação (9 fases):**
```
✅ Fase 1 — Schema v2: CC-01 a CC-05  (types/index.ts + schema.ts + migração v1→v2)
✅ Fase 2 — Motor virtual: CC-06 a CC-09  (getInvoicePeriod, getInvoiceDueDate, getCurrentInvoiceBalance, getEffectiveCashFlowDate)
✅ Fase 3 — Conta CREDIT: CC-10 a CC-12  (modal creditMetadata + includeInBalance padrão false + store)
✅ Fase 4 — Saldo CREDIT: CC-13 a CC-15  (Dashboard + Settings: bifurcação de cálculo e label)
✅ Fase 5 — Analytics: CC-16 a CC-18  (getEffectiveCashFlowDate no cash flow + exclusão CREDIT_PAYMENT)
✅ Fase 6 — CREDIT_PAYMENT: CC-19 a CC-22  (drawer + store + exibição no extrato + página /credit-card/:accountId)
✅ Fase 7 — Parcelamentos criação: CC-23 a CC-25  (drawer + store gera N txs + audit log agrupado)
✅ Fase 8 — Parcelamentos deleção: CC-26 a CC-27  (modal 2 opções + deleteInstallmentGroup)
✅ Fase 9 — Testes/Fixtures: CC-28 a CC-30  (makeDataFile v2 + fixture E2E + creditCard.spec.ts)
```

**Módulo de Cartão de Crédito concluído** — todas as 9 fases (CC-01 a CC-30) implementadas e cobertas por testes unitários e E2E.

---

### Melhorias em aberto

| ID | Descrição | Prioridade |
|----|-----------|-----------|
| M-22 | Estornos e chargebacks em contas CREDIT: suporte a reversões contábeis com tipo e UX dedicados. Out-of-scope neste ciclo — usuário registra manualmente. | baixa |

---

## Restrições — O Que NUNCA Fazer

### Código

- **Nunca** usar `as SomeType` para contornar validação Zod — dados externos sempre passam por `validateDataFile()`
- **Nunca** mutar estado Zustand diretamente — sempre usar `mutate()` que faz `structuredClone`
- **Nunca** chamar `syncToFile()` ou `saveDataFile()` fora do método `persist()` do store
- **Nunca** chamar `importFileToIdb()` no fluxo de sync recorrente — é exclusivo do onboarding/import
- **Nunca** incrementar `unsyncedCount` manualmente — `mutate()` faz isso automaticamente
- **Nunca** adicionar `TODO` no código — bugs e melhorias vão para `BACKLOG.md`
- **Nunca** usar `console.log` em código de produção

### Testes

- **Nunca** substituir o mock de File System API dos testes E2E por mocks em memória — a integração real é o ponto
- **Nunca** pular testes que estejam falhando com `skip` sem registrar no BACKLOG

### Git/CI

- **Nunca** fazer merge com CI vermelho
- **Nunca** usar `--no-verify` para pular hooks
- **Nunca** commitar com mensagens genéricas (`fix`, `ajuste`, `wip`)

### Dependências

- Não adicionar dependências sem justificativa explícita
- Verificar `npm audit` a cada 3–5 features

---

## Início de Sessão — Checklist

Antes de propor qualquer implementação:

1. Ler este arquivo (`CLAUDE.md`) integralmente
2. Ler `plan/BACKLOG.md` para entender o estado atual de bugs e melhorias
3. Ler `plan/PRD.md` se a tarefa envolver produto/features novas
4. Ler `plan/SPEC.md` se a tarefa envolver sync, persistência ou recuperação de erros
5. Ler os arquivos-fonte relevantes **antes** de propor mudanças (nunca propor sem ler)
6. Confirmar escopo da sessão com o humano (1–3 itens, no máximo)

---

## Princípios do Workflow (resumo de `plan/RULES.md`)

1. **O CI é o árbitro** — se passa no pipeline, está pronto
2. **IA propõe, humano decide** — nunca o contrário
3. **Documentação ativa** — `BACKLOG.md` e `PRD.md` atualizados a cada ciclo
4. **CI falhou? Sessão para.** Não acumula dívida de pipeline
5. **Fim de sessão:** commit descritivo → `BACKLOG.md` atualizado → push

---

## Localização de Documentação Completa

| Documento | Caminho | Conteúdo |
|-----------|---------|---------|
| Requisitos de produto | `plan/PRD.md` | Features F-1 a F-20, critérios de aceite |
| Especificação técnica | `plan/SPEC.md` | Detalhes de implementação por milestone |
| Backlog | `plan/BACKLOG.md` | Bugs B-XX e melhorias M-XX com status |
| Workflow IA+humano | `plan/RULES.md` | SDLC, cerimônias, divisão de responsabilidades |
| Cenários de sync | `plan/SYNC_SCENARIOS.md` | Casos de borda para persistência |
| Sistema de design | `design/design_system.md` | Cores, tipografia, componentes, do's & don'ts |
