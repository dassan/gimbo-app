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
│   │   │   ├── utils.ts           # cn(), uuid(), formatCurrency(), now()
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
│   │   │   ├── Dashboard/         # Resumo mensal + gráficos
│   │   │   ├── Transactions/      # Ledger com filtros e agrupamento
│   │   │   ├── Analytics/         # Projeção de fluxo de caixa + breakdown por categoria
│   │   │   ├── Accounts/          # CRUD de contas (página dedicada — não confundir com aba de Settings)
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
}
```

### Entidades

```typescript
interface User       { name, email, createdAt, updatedAt }  // datas ISO 8601

interface Settings   { fileCreatedAt, fileUpdatedAt,        // datas ISO 8601
                       auditLogRetentionLimit: number | null } // null = ilimitado

interface Account    { id, name, type: AccountType, balance, includeInBalance }
// AccountType: 'RETAIL' | 'SAVINGS' | 'CREDIT' | 'CRYPTO' | 'FOREX' | 'ASSET' | 'STOCKS' | 'OTHER'

interface Category   { id, parentId: string | null, name, icon, color,
                       type: CategoryType }
// CategoryType: 'INCOME' | 'EXPENSE'

interface Tag        { id, name, color }

interface Transaction { id, accountId, categoryId, amount, type: TransactionType,
                        date, description, isPaid, tags: string[] }
// TransactionType: 'INCOME' | 'EXPENSE' | 'TRANSFER'

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

- `CURRENT_SCHEMA_VERSION = 1` (constante em `schema.ts`)
- Arquivos sem `schemaVersion` são tratados como v1 (Zod `.default(1)`)
- Arquivos com versão futura lançam `SchemaVersionError` com mensagem i18n `settings.importVersionError`
- Para evoluir o schema: incrementar `CURRENT_SCHEMA_VERSION`, adicionar migração em `validateDataFile()`

---

## API de cada módulo de storage

### `schema.ts` — exports públicos

| Export | Tipo | Descrição |
|--------|------|-----------|
| `CURRENT_SCHEMA_VERSION` | `number` (1) | Versão atual do schema |
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

### Cobertura atual (2026-04-12)

- **221 testes unitários passando** — 19 arquivos de teste
- Cobertura: **97.44% statements**, 95.56% branches, 95.31% funções
- Arquivos críticos (schema, merge, sync, indexedDb, store): 97–100% de cobertura

### Testes unitários (Vitest)

- Ambiente: `jsdom`
- Setup: `src/test/setup.ts` importa `@testing-library/jest-dom`
- Factories em `src/test/fixtures/`: `makeDataFile()` (inclui `schemaVersion: 1`)
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

## Estado Atual do Projeto (2026-04-12)

### Funcionalidades implementadas

| Feature | Milestone | Status |
|---------|-----------|--------|
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

### Bugs abertos

Todos os bugs B-01 a B-04 foram resolvidos. Nenhum bug aberto no momento.

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
