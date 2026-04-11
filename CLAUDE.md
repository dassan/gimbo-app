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
│   │   │   ├── i18n/              # Config i18next + locales (pt-BR, en-US)
│   │   │   └── storage/
│   │   │       ├── schema.ts      # Schemas Zod + factories + applyRetention()
│   │   │       ├── fileSystem.ts  # File System Access API + fallback download
│   │   │       ├── indexedDb.ts   # CRUD IndexedDB (stores: ledger, handles)
│   │   │       └── merge.ts       # Merge por UUID (read-before-write)
│   │   ├── store/
│   │   │   ├── useDataStore.ts    # Dados financeiros + persistência
│   │   │   └── useWorkspaceStore.ts # Preferências UI (tema, locale)
│   │   ├── components/
│   │   │   ├── AppLayout.tsx      # Shell: Navbar + Outlet + FAB + modais
│   │   │   ├── Navbar.tsx         # Nav com glassmorphism + badge de sync
│   │   │   ├── FAB.tsx            # Botão de ação flutuante
│   │   │   ├── TransactionDrawer.tsx # Formulário de transação (drawer)
│   │   │   ├── ConflictModal.tsx  # Modal de resolução de conflito
│   │   │   └── ErrorBoundary.tsx  # Boundary de erro com fallback UI
│   │   ├── pages/
│   │   │   ├── Onboarding/        # Criar perfil ou importar data.json
│   │   │   ├── Dashboard/         # Resumo mensal + gráficos
│   │   │   ├── Transactions/      # Ledger com filtros e agrupamento
│   │   │   ├── Analytics/         # Projeção de fluxo de caixa + breakdown
│   │   │   ├── Accounts/          # CRUD de contas
│   │   │   └── Settings/          # Contas, categorias, tags, perfil, log
│   │   └── test/
│   │       ├── setup.ts           # Setup Vitest (Testing Library matchers)
│   │       ├── fixtures/          # Factories: makeDataFile(), makeAccount(), etc.
│   │       ├── lib/               # Testes de storage e utilitários
│   │       ├── store/             # Testes de store (mutações, persistência)
│   │       └── components/        # Testes de componentes
│   ├── e2e/
│   │   ├── onboarding.spec.ts     # Fluxos de criação e importação
│   │   ├── persistence.spec.ts    # Persistência e badge de sync
│   │   ├── transaction.spec.ts    # CRUD de transações
│   │   └── fixtures/              # Dados para E2E (dataFile.json)
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

### Fluxo de dados

```
Ação do usuário
  → Método do store (ex: addTransaction())
  → mutate(): structuredClone + aplica mutação + incrementa unsyncedCount
  → debouncedSaveToIdb() em 300ms   ←── salva em background
  → Usuário clica em "Sync"
  → persist(): lê disco, faz merge por UUID, escreve, atualiza _lastWrittenModified
```

### Três camadas de persistência

| Camada | Tecnologia | Escopo | Chave |
|--------|-----------|--------|-------|
| Memória | Zustand (`useDataStore.data`) | Sessão atual | — |
| Cache | IndexedDB (`nexus-db`) | Sobrevive reload | `ledger/'current'`, `handles/'data'` |
| Disco | File System Access API (`data.json`) | Portável, permanente | Escolhido pelo usuário |
| Config UI | localStorage | Sobrevive reload | `nexus_workspace` |

### Máquina de estados de permissão do FileHandle

```
startup
  → queryPermission(handle)
      ├── 'granted'  → pronto para sync automático
      ├── 'prompt'   → armazena em _pendingHandle, aguarda gesto do usuário
      └── 'denied'   → trata como arquivo perdido (fileHandleLost = true)

clique no botão de sync
  ├── _pendingHandle existe → requestPermission() → sync
  ├── fileHandleLost = true → abre novo file picker
  └── normal → persist()
```

### Estratégia de merge (read-before-write)

- Ao salvar, lê o arquivo atual do disco
- Faz union por `id` (UUID): itens locais têm prioridade sobre disco em caso de duplicata
- Itens presentes só no disco são recuperados (proteção contra eviction do IndexedDB)
- Detecção de conflito: `File.lastModified > _lastWrittenModified` → exibe `ConflictModal`

### Validação de dados externos

- Todo JSON importado ou lido do disco passa por `validateDataFile()` em `schema.ts`
- Schemas Zod são a única entrada de dados externos (sem `as DataFile`)
- Falha na validação → rejeita silenciosamente, mantém dados locais intactos

---

## Formato dos Dados

### `data.json` (portável, exportado pelo usuário)

```json
{
  "user": { "name", "email", "createdAt", "updatedAt" },
  "settings": { "fileCreatedAt", "fileUpdatedAt", "auditLogRetentionLimit" },
  "accounts": [{ "id", "name", "type", "balance", "includeInBalance" }],
  "categories": [{ "id", "parentId", "name", "icon", "color", "type" }],
  "tags": [{ "id", "name", "color" }],
  "transactions": [{ "id", "accountId", "categoryId", "amount", "type", "date", "description", "isPaid", "tags" }],
  "auditLog": [{ "id", "timestamp", "action", "entity", "entityId", "summary" }]
}
```

### Workspace (localStorage `nexus_workspace`)

```json
{
  "theme": "light" | "dark" | "system",
  "locale": "pt-BR" | "en-US",
  "defaultView": "dashboard" | "transactions" | "analytics" | "settings"
}
```

### IndexedDB `nexus-db` (versão 2)

| Store | Chave | Conteúdo |
|-------|-------|---------|
| `ledger` | `'current'` | `DataFile` completo |
| `handles` | `'data'` | `FileSystemFileHandle` |

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
| Membros privados de módulo | prefixo `_` | `_lastWrittenModified` |

### TypeScript

- **Strict mode** ativo: `noUnusedLocals`, `noUnusedParameters`, `noImplicitAny`
- Type imports separados: `import type { DataFile } from '@/types'`
- Enums como string enums (ex: `AccountType`, `TransactionType`)
- Nunca usar `as SomeType` para contornar validação — use schemas Zod

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
- Interface de props exportada acima do componente
- Sem class components
- `useMemo` para dados derivados pesados (ex: cálculos de gráficos)

---

## Testes

### Testes unitários (Vitest)

- Ambiente: `jsdom`
- Setup: `src/test/setup.ts` importa `@testing-library/jest-dom`
- Factories em `src/test/fixtures/`: `makeDataFile()`, `makeAccount()`, `makeTransaction()`, etc.
- Reset de store no `beforeEach`: `useDataStore.setState({ data: null, unsyncedCount: 0 })`
- Mocks de módulos: `vi.mock('react-i18next')`, `vi.mock('react-router-dom')`
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
feat: implement M-14 — FileHandle Re-permission on Startup
fix: resolve E2E test failures introduced by M-07
style: apply Prettier formatting to useDataStore.test.ts
```

Referência obrigatória ao ID do milestone (M-XX) ou bug (B-XX) quando aplicável.

### Regras de branch/PR

- Uma feature por commit/PR — facilita revisão e rollback
- CI verde obrigatório antes de merge — sem exceções
- Nenhum `TODO` no código — vai para `BACKLOG.md`

---

## Estado Atual do Projeto (2026-04-10)

### Funcionalidades implementadas

| Feature | Milestone | Status |
|---------|-----------|--------|
| Perfil do usuário | — | ✅ |
| CRUD de contas (8 tipos) | M-03 | ✅ |
| CRUD de categorias (hierarquia pai/filho) | M-04 | ✅ |
| CRUD de tags (paleta de cores) | M-05 | ✅ |
| CRUD de transações (Income/Expense/Transfer) | — | ✅ |
| Editar/remover transação ao clicar na linha | M-02 | ✅ |
| Dashboard com cards mensais | — | ✅ |
| Gráfico de fluxo de caixa (±3 meses) | — | ⚠️ (B-01: sem dados) |
| Gráfico de despesas por categoria (donut) | — | ⚠️ (B-02, B-03: sem dados) |
| Exportar/Importar data.json | — | ✅ |
| Seletor de idioma (pt-BR / en-US) | — | ✅ |
| Onboarding (criar ou importar) | M-11 | ✅ |
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

### Bugs abertos

| ID | Descrição | Severidade |
|----|-----------|-----------|
| B-01 | Gráfico de fluxo de caixa no Dashboard não exibe dados | alta |
| B-02 | Gráfico de renda por categoria no Dashboard não exibe dados | alta |
| B-03 | Gráfico de despesas por categoria no Dashboard não exibe dados | alta |
| B-04 | Cálculo de saldo incorreto na página de contas (Settings) | alta |

### Melhorias abertas (próximas sessões)

| ID | Descrição | Prioridade |
|----|-----------|-----------|
| M-01 | Versionar data.json para compatibilidade de schema | média |
| ~~M-16~~ | ~~Tratamento de quota excedida no IndexedDB~~ | ~~média~~ ✅ |
| ~~M-17~~ | ~~Separar semântica de import vs. sync~~ | ~~média~~ ✅ |
| M-18 | Fallback para browsers sem File System Access API | baixa |
| M-19 | Persistir unsyncedCount no IndexedDB | baixa |

---

## Restrições — O Que NUNCA Fazer

### Código

- **Nunca** usar `as SomeType` para contornar validação Zod — dados externos sempre passam por `validateDataFile()`
- **Nunca** mutar estado Zustand diretamente — sempre usar `mutate()` que faz `structuredClone`
- **Nunca** acessar `data.json` sem passar pelo merge em `merge.ts`
- **Nunca** gravar no disco fora do método `persist()` do store
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

1. Ler este arquivo (`CLAUDE.md`)
2. Ler `plan/BACKLOG.md` para entender o estado atual de bugs e melhorias
3. Ler `plan/PRD.md` se a tarefa envolver produto/features
4. Ler `plan/SPEC.md` se a tarefa envolver sync, persistência ou recuperação de erros
5. Ler os arquivos relevantes para a tarefa antes de propor mudanças
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
