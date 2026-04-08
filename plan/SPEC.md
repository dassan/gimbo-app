# [SPEC] Nexus — Especificação Técnica de Implementação

> **Contexto:** Este documento define as tarefas de implementação do Nexus, derivadas do [PRD.md](./PRD.md) e do [Design System](../design/design_system.md). Serve como fonte da verdade para o desenvolvimento, complementando o PRD com decisões técnicas concretas.
>
> **Stack aprovada:** React + Vite + TypeScript · Tailwind CSS v4 · Zustand · i18next · Recharts · vite-plugin-pwa

---

## Fase 1 — Scaffold e Infraestrutura

### TASK-01: Scaffolding do projeto
- Criar o projeto com `npm create vite@latest app -- --template react-ts`
- Localização: `MyFinanceApp/app/` (preservando `plan/` e `design/` na raiz)
- Configurar alias de path `@/` → `src/` em `vite.config.ts` e `tsconfig.app.json`

### TASK-02: Instalação de dependências
| Pacote | Propósito |
|--------|-----------|
| `tailwindcss` + `@tailwindcss/vite` | Estilização via Tailwind v4 |
| `zustand` | Estado global em memória (in-memory store) |
| `i18next` + `react-i18next` | Internacionalização (i18n desde o dia 1) |
| `recharts` + `react-is` | Gráficos de fluxo de caixa e pizza |
| `lucide-react` | Ícones thin-stroke (1.5pt), alinhados ao design system |
| `clsx` + `tailwind-merge` | Utilitário `cn()` para classes condicionais |
| `react-router-dom` | Roteamento SPA |
| `vite-plugin-pwa` | Service worker + Web App Manifest |
| `idb` | Wrapper Promise-based para IndexedDB (auto-save e contagem de não-sincronizados) |

### TASK-03: Design System — tokens Tailwind
Mapear as cores, sombras e fontes do design system para variáveis CSS via `@theme` no Tailwind v4, em `src/index.css`:

```
--color-primary:                  #006E2F   (Growth / Inflow)
--color-primary-container:        #22C55E
--color-tertiary:                 #B91A24   (Outflow / Alerts)
--color-tertiary-container:       #FF8A83
--color-surface:                  #F8F9FA   (Level 0 Foundation)
--color-surface-container-low:    #F3F4F5   (Level 1 Sections)
--color-surface-container-high:   #E8E9EA   (Level 2 Cards)
--color-on-surface:               #191C1D
--color-outline-variant:          rgba(25, 28, 29, 0.15)
--shadow-ambient:                 0px 20px 40px rgba(25, 28, 29, 0.06)
--font-sans:                      'Inter' (Google Fonts)
```

**Regra do design system:** Nenhuma borda `1px solid` para separação. Hierarquia por contraste de superfície (`surface` → `surface-container-low` → `white`).

---

## Fase 2 — Modelo de Dados e Persistência

### TASK-04: Tipos TypeScript (`src/types/index.ts`)
Definir todas as entidades do `data.json` e `workspace.json` conforme o PRD:
- `User`, `Settings`, `Account`, `Category`, `Tag`, `Transaction`
- Enums:
  - `AccountType`: `'RETAIL' | 'SAVINGS' | 'CREDIT' | 'CRYPTO' | 'FOREX' | 'ASSET' | 'STOCKS' | 'OTHER'`
  - `CategoryType`, `TransactionType`
- `Account` inclui `includeInBalance: boolean` — indica se a conta entra no saldo consolidado do dashboard
- `DataFile` (root de `data.json`) e `WorkspaceFile` (root de `workspace.json`)
- `Theme` e `Locale` para o workspace
- `AuditEntry` e `AuditAction` / `AuditEntity` (F-13):

```typescript
type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'
type AuditEntity = 'account' | 'category' | 'tag' | 'transaction' | 'user'

interface AuditEntry {
  id: string          // UUID
  timestamp: string   // ISO 8601
  action: AuditAction
  entity: AuditEntity
  entityId: string
  summary: string     // descrição legível, gerada no momento da mutação
}
```

- `Settings` atualizado para incluir `auditLogRetentionLimit: number | null`
  - `number` → limite padrão de entradas (default: `200`)
  - `null` → retenção ilimitada (opt-in pelo usuário)

### TASK-05: Camada de storage (`src/lib/storage/`)

**`schema.ts`:**
- `createEmptyDataFile(name, email)` → gera `DataFile` com categorias padrão
- `createDefaultWorkspace()` → `WorkspaceFile` com `theme: 'system'` e `locale: 'pt-BR'`
- Categorias padrão pré-definidas (Salário, Alimentação, Transporte, Saúde, Lazer, Moradia)

**`fileSystem.ts`:**
- `openDataFile()` → File System Access API (`showOpenFilePicker`)
- `saveDataFile(data)` → persiste via `showSaveFilePicker` na primeira chamada, reutiliza handle nas seguintes
- `downloadDataFile(data)` → fallback via `<a download>` para browsers sem suporte à API
- `loadWorkspace()` / `saveWorkspace()` → `localStorage` (persistência de preferências visuais)
- Augmentação de `Window` para tipagem de `showOpenFilePicker` / `showSaveFilePicker`

**`indexedDb.ts`** *(novo — F-12):*
- Banco: `nexus-db`, store: `ledger`
- `saveToIdb(data: DataFile)` → serializa e grava o estado completo (debounced 300ms)
- `loadFromIdb()` → desserializa e retorna `DataFile | null`
- `clearIdb()` → chamado ao importar um arquivo externo (evita estado híbrido)
- Chave única fixa (`'current'`) — apenas um ledger ativo por browser
- Utiliza `idb` para API Promise-based sem callbacks

**Fluxo de inicialização do app (atualizado):**
1. Tentar `loadFromIdb()` → se encontrar dados, carregar direto (sem Onboarding)
2. Se vazio → exibir Onboarding (criar novo ou importar arquivo)
3. Em Onboarding "Importar": após `loadData()`, chamar `clearIdb()` + `saveToIdb()` imediatamente

### TASK-06: Utilitários (`src/lib/utils.ts`)
- `cn(...classes)` → merge Tailwind com `clsx` + `tailwind-merge`
- `uuid()` → `crypto.randomUUID()`
- `now()` → ISO 8601 timestamp
- `formatCurrency(value, locale)` → `Intl.NumberFormat` (BRL / USD)

---

## Fase 3 — Estado Global

### TASK-07: Store de dados (`src/store/useDataStore.ts`)
Store Zustand com todo o CRUD do `DataFile`:
- `data: DataFile | null` + `unsyncedCount: number`
- `loadData(data)` / `clearData()`
- `addAccount` / `updateAccount` / `deleteAccount`
- `addCategory` / `updateCategory` / `deleteCategory`
- `addTag` / `updateTag` / `deleteTag`
- `addTransaction` / `updateTransaction` / `deleteTransaction`
- `persist()` → chama `saveDataFile`, atualiza `settings.fileUpdatedAt`, zera `unsyncedCount`
- Mutações via `structuredClone` para imutabilidade

**Comportamento pós-mutação (F-12, F-13, F-14):**
Toda função de mutação (`add*`, `update*`, `delete*`) deve, após atualizar o estado:
1. Acrescentar uma `AuditEntry` ao `data.auditLog` com action, entity, entityId e summary
2. Aplicar a política de retenção: se `settings.auditLogRetentionLimit !== null`, truncar o log mantendo apenas as N entradas mais recentes
3. Incrementar `unsyncedCount` em 1
4. Chamar `saveToIdb(data)` (debounced) para persistir o estado no IndexedDB

**Resumo (`summary`) das entradas do audit log:**
- Gerado em português no momento da mutação (não traduzido retroativamente)
- Exemplos: `"Conta criada: Nubank"`, `"Transação removida: R$ 142,50 — Supermercado"`, `"Categoria atualizada: Alimentação"`

### TASK-08: Store de workspace (`src/store/useWorkspaceStore.ts`)
Store Zustand para preferências visuais:
- `workspace: WorkspaceFile`
- `init()` → carrega do `localStorage` na inicialização do app
- `setTheme(theme)` / `setLocale(locale)` / `setDefaultView(view)` → persiste automaticamente

---

## Fase 4 — Internacionalização

### TASK-09: Configuração i18n (`src/lib/i18n/`)
- Inicializar `i18next` com `react-i18next` em `index.ts`
- `fallbackLng: 'pt-BR'`
- Importar em `main.tsx` antes do CSS

**Estrutura dos namespaces (`locales/pt-BR.json` e `locales/en-US.json`):**
```
app, nav, onboarding, dashboard, transactions, analytics, settings, accounts, common
```

**Regra:** Toda string visível ao usuário deve passar por `t()`. Nenhum texto hardcoded nos componentes.

---

## Fase 5 — Layout e Navegação

### TASK-10: Estrutura de rotas (`src/App.tsx`)
- Rota pública: `/onboarding` → mostrada quando `data === null`
- Rotas protegidas (requerem `data !== null`): `/dashboard`, `/transactions`, `/analytics`, `/settings`
- Redirect automático: sem dados → `/onboarding`, com dados → `/dashboard`

**Estrutura da navbar (conforme design do Dashboard):**
```
[Nexus Finance]  [Visão Geral] [Lançamentos] [Relatórios]      [🔔] [⚙️] [Avatar]
```
- "Planejamento" omitido (fora do escopo inicial)
- Seção "Contas" acessada via ⚙️ (Settings), não na navbar principal
- ⚙️ navega para `/settings`
- 🔔 e Avatar são decorativos no escopo inicial

### TASK-11: Navbar (`src/components/Navbar.tsx`)
- Barra horizontal fixa no topo (`position: fixed`, `z-50`)
- Fundo `bg-white/80` com `backdrop-blur-[24px]` (glassmorphism)
- Indicador de aba ativa: barra `2px` na cor `primary` na borda inferior do item
- Avatar exibe iniciais do nome do usuário (calculadas no `AppLayout`)
- Props: `initials: string`

**Ícone de Sync (F-14):**
- Ícone `RefreshCw` (Lucide) posicionado entre o sino e a engrenagem
- Badge vermelho sobreposto com `unsyncedCount` quando `> 0`; oculto quando `=== 0`
- Badge exibe `99+` quando a contagem exceder 99
- `onClick` → chama `persist()` do `useDataStore` (File System Access API ou download fallback)
- Durante o save: ícone gira (`animate-spin`) até a Promise resolver
- Props: `unsyncedCount: number`, `onSync: () => Promise<void>`

### TASK-12: AppLayout (`src/components/AppLayout.tsx`)
- Monta `Navbar`, `<Outlet />` e `TransactionDrawer`
- Controla estado `drawerOpen` (boolean)
- FAB não exibido em `/settings` (lista `NO_FAB_ROUTES`)
- Passa `initials` para `Navbar` (derivadas de `data.user.name`)

### TASK-13: FAB (`src/components/FAB.tsx`)
- Botão pill fixo `bottom: 24px; right: 24px` (`z-40`)
- Cor `bg-primary`, ícone `Plus`, texto via `t('transactions.new')`
- `active:scale-95` para feedback tátil
- Props: `onClick: () => void`

---

## Fase 6 — Componente Global: Transaction Drawer

### TASK-14: TransactionDrawer (`src/components/TransactionDrawer.tsx`)
Sheet deslizante da direita. Comportamento conforme design `nova_transacao.png`.

**Estrutura:**
- Backdrop semitransparente com `backdrop-blur-sm` (clica para fechar)
- Painel `w-full max-w-[480px]` com `translate-x` animado (300ms ease-out)
- Header: título + botão X

**Campos do formulário:**
1. **Valor** — input numérico grande (`text-5xl`), máscara de centavos (`R$ 0,00`)
2. **Tipo** — tabs Despesa / Receita / Transf. (segmented control); CTA muda de cor conforme tipo
3. **Data** — `<input type="date">` com ícone de calendário
4. **Conta** — `<select>` com contas do store
5. **Categoria** — `<select>` filtrado por tipo (INCOME/EXPENSE); oculto em Transferência
6. **Tags** — chips clicáveis coloridos; botão "+ Adicionar"
7. **Descrição** — input de texto

**CTA:**
- Desabilitado se `amount === 0`
- Cor muda: vermelho (Despesa), verde (Receita), preto (Transferência)
- Texto: "Salvar Despesa →", "Salvar Receita →", "Salvar Transferência →"

**Reset:** Ao abrir, restaura todos os campos ao estado inicial.

---

## Fase 7 — Telas

### TASK-15: Onboarding (`src/pages/Onboarding/`)
Layout conforme `onboarding_setup.png` e `onboarding_importar.png`.

**Estrutura (lg+):**
- **Esquerda (45%):** Badge "Segurança Ativa", headline editorial (`whitespace-pre-line`), subtítulo, bullet de privacidade com ícone de cadeado, footer com links
- **Direita (55%):** card branco com sombra `ambient`, tabs "Novo Perfil" / "Importar Dados"

**Tab Novo Perfil:**
- Campos: Nome Completo, E-mail, Idioma (com flag emoji)
- Ao trocar idioma: `i18n.changeLanguage()` imediato (preview instantâneo)
- CTA "Criar Cofre de Dados →": cria `DataFile` via `createEmptyDataFile`, navega para `/dashboard`

**Tab Importar Dados:**
- Drop zone com dashed border, ícone `FileJson`, suporte a drag-and-drop + clique
- CTA "Importar e Iniciar ↺": abre `showOpenFilePicker` como fallback
- Parsing do JSON importado → `loadData()` → navega para `/dashboard`

### TASK-16: Dashboard (`src/pages/Dashboard/`)
Layout assimétrico conforme `dashboard_principal.png`.

**Stat cards (grid 3 colunas):**
- Receitas: `bg-white`, valor `text-primary`, ícone `TrendingUp` em badge verde
- Despesas: `bg-white`, valor `text-tertiary`, ícone `TrendingDown` em badge vermelho
- Saldo: `bg-primary`, valor e texto em branco (destaque máximo)

**Gráfico de Fluxo de Caixa (col-span-2):**
- `AreaChart` do Recharts com 2 séries: `income` e `expenses`
- Gradiente de preenchimento (`linearGradient`) em verde e vermelho suaves
- Toggle Semanal (14 semanas) / Mensal (7 meses): ±3 meses em torno do mês atual
- Sem grid lines visíveis, eixos sem borda (`axisLine={false}`)

**Donut de Despesas por Categoria (col-span-1):**
- `PieChart` com `innerRadius` (donut) + label central com total
- Legenda: até 4 categorias com dot colorido e percentual
- Paleta de cores pré-definida (`DONUT_COLORS`)

**Últimos Lançamentos:**
- 5 transações mais recentes por data
- Cada row: ícone de categoria (inicial + cor), nome/categoria/conta/data, valor colorido, ícone de status (pago/pendente)
- Link "Ver Tudo" navega para `/transactions`

**Lógica de dados:**
- Filtragem de transações por mês corrente para os cards
- Helper `buildMonthlySlots` / `buildWeeklySlots` para o gráfico

### TASK-17: Transactions / Ledger (`src/pages/Transactions/`)
Layout conforme `historico_lancamentos.png`.

**Filtros (topo):**
- Dropdowns: Contas, Status (Pago/Pendente), Tags
- Campo de busca por texto (`description`)
- Todos os filtros são compostos (AND)

**Tabs de período:**
- Hoje / Esta Semana / Este Mês / Personalizado
- Pill ativo em `bg-primary text-white`

**Lista agrupada por data:**
- Agrupamento: `Map<dateKey, Transaction[]>` ordenado por data desc
- Label do grupo: "Hoje", "Ontem" ou data formatada por extenso
- Separação entre grupos por espaço (`space-y-6`), sem linhas

**Transaction row (`TxRow`):**
- Ícone de categoria (inicial + cor de fundo)
- Tipo em label uppercase, nome, chips de tags coloridas, conta e horário
- Valor com sinal (+/-) e cor semântica
- Botão de status (ícone toggle pago/pendente)
- Separador entre rows: `border-b border-surface-container-low` (sem linha no último)

**Rodapé:**
- Contagem de transações listadas
- Resultado consolidado (positivo em verde / negativo em vermelho)

### TASK-18: Analytics / Relatórios (`src/pages/Analytics/`)
Layout conforme `paineis_analiticos.png`.

**Controles de período:**
- Navegação com `ChevronLeft` / `ChevronRight` (incrementa `offset` em meses)
- Label dinâmico: `"MMM YYYY – MMM YYYY"`
- Tabs: Mês (1 mês) / Semestre (±3 meses em torno do mês de referência) / Personalizado
- Toggle "Incluir Não-Pagos" (filtra `isPaid === true` quando desativado)
- Botão "Exportar PDF" (placeholder, sem implementação no escopo inicial)

**Gráfico de Projeção de Fluxo de Caixa:**
- `LineChart` com 2 séries: `generalFlow` (fluxo mensal) e `consolidatedBalance` (acumulado)
- `CartesianGrid` horizontal suave (`strokeDasharray="3 3"`, sem linhas verticais)
- Série acumulada em `strokeDasharray="4 2"` (linha tracejada)
- `Legend` com formatação via `t()`

**Donuts por Categoria (grid 2 colunas):**
- `CategoryDonut`: componente reutilizável com título, donut e tabela de valores
- Receitas por Categoria (paleta verde) e Despesas por Categoria (paleta vermelha)
- Máximo de 5 itens na tabela; valor formatado em BRL

**Lógica de dados:**
- Transações filtradas pelo intervalo `[startDate, endDate]`
- `consolidatedBalance` calculado como acumulado mês a mês (running total)

### TASK-19: Settings / Configurações (`src/pages/Settings/`)
Layout conforme `workspace.png` e `gestao_estruturas.png`, unificados em uma única página.

**Sidebar esquerda (duas seções):**
```
GESTÃO DE DADOS          APLICATIVO
  📁 Contas                👤 Perfil
  🗂 Categorias             ⚙️ Preferências
  🏷 Tags                  💾 Arquivo de Dados
```
- Item ativo: `bg-primary/10 text-primary`
- Ícones Lucide thin-stroke

**Seção Contas:**
- Lista de contas como `<button>` clicáveis: ícone do tipo + nome + tipo (i18n) + saldo
- Botão "Nova Conta" abre `AddAccountModal` em modo criação; clicar numa conta abre em modo edição
- **`AddAccountModal`:** campo nome, grid 4×2 com os 8 tipos de conta (cada tipo mapeado a um ícone Lucide; selecionado com `border-primary bg-primary/5`), toggle "Incluir no saldo total", botão Salvar/Cancelar e link "Excluir Conta" com confirmação de 2 cliques
- Estado modal: `type ModalState = { open: false } | { open: true; account: Account | null }` — `null` = criar, `Account` = editar

**Seção Categorias:**
- Pro Tip card em `bg-primary` com texto branco
- Lista de categorias top-level como `<button>` com ícone Lucide + nome + tipo; subcategorias recuadas com `ml-6` e dot indicator, também clicáveis
- Botão "Nova Categoria" abre `AddCategoryModal` em modo criação; clicar numa categoria abre em modo edição
- **`AddCategoryModal`:** campo nome, icon picker (grid 6 colunas, 12 ícones Lucide; selecionado com `bg-primary text-white`), dropdown Categoria Pai (populado com top-levels; ao selecionar pai, herda tipo automaticamente), toggle DESPESA/RECEITA (visível apenas quando `parentId === null`), botão Salvar/Cancelar e link "Excluir Categoria" com confirmação de 2 cliques
- Ícone na lista renderizado via helper `categoryIcon(name)` com fallback para `TagIcon`
- `TAG_COLORS` constante de módulo com 12 nomes de ícones mapeados a componentes Lucide

**Seção Tags:**
- Pills coloridos como `<button>` clicáveis com `#nome`; clicar abre `AddTagModal` em modo edição
- Botão "Nova Tag" abre `AddTagModal` em modo criação
- **`AddTagModal`:** campo nome, paleta de 8 círculos de cor (selecionado com `outline` inline na própria cor + `outlineOffset: 3px`), botões Cancel/Save horizontais, botão Delete à esquerda (2 cliques), rodapé informativo com bullet verde

**Seção Perfil:**
- Inputs de Nome e E-mail com "Salvar Perfil" → atualiza `data.user` via `loadData`

**Seção Preferências:**
- Seletor de Idioma (muda `i18n.changeLanguage` imediatamente)
- Seletor de Tema (sistema/claro/escuro)

**Seção Arquivo de Dados:**
- Card de aviso de privacidade (local-first)
- Grid 2 colunas: "Exportar Dados" (`downloadDataFile`) + "Importar Dados" (`openDataFile`)

**Seção Modificações Recentes (F-15)** *(nova, dentro de Aplicativo):*
- Lista cronológica reversa das entradas de `data.auditLog`
- Cada item: ícone por tipo de ação (+ verde / ✎ amarelo / × vermelho), entidade, summary, timestamp relativo ("há 2 horas", "ontem")
- Agrupamento por data (Hoje / Ontem / DD MMM)
- Estado vazio: mensagem "Nenhuma modificação registrada"

**Seção Preferências — opção de retenção do Audit Log (F-13 opt-in):**
- Toggle: "Retenção ilimitada do histórico"
  - Desativado (padrão): mantém as últimas 200 entradas ou 90 dias
  - Ativado: `settings.auditLogRetentionLimit = null`; exibir aviso inline: *"O histórico ilimitado pode impactar o desempenho com o uso prolongado."*

---

## Fase 8 — PWA

### TASK-20: Configuração PWA (`vite.config.ts`)
- `vite-plugin-pwa` com `registerType: 'autoUpdate'`
- Manifest: `name`, `short_name`, `theme_color: #006E2F`, `display: standalone`, `orientation: portrait`
- Ícones: `icon-192.png` e `icon-512.png` em `public/icons/`

---

## Decisões Técnicas Registradas

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Persistência de workspace | `localStorage` | File System Access API não suporta escrita sem interação do usuário; localStorage é síncrono e adequado para preferências |
| Mutações no store | `structuredClone` | Garante imutabilidade sem dependência de Immer |
| Separação de arquivos | `data.json` + `workspace.json` | Mantém o ledger financeiro limpo e portátil, separado de preferências visuais |
| FAB posição | Fixo `bottom-right` | Mais consistente entre telas do que o posicionamento centralizado do design original |
| "Planejamento" na navbar | Omitido | Fora do escopo inicial (Out of Scope no PRD) |
| Contas na navegação | Via ⚙️ Settings | Decisão de UX: toda gestão de dados (contas, categorias, tags) numa seção dedicada |
| Notificações / Avatar | Decorativos | Funcionalidade fora do escopo inicial |
| Banco de dados primário em runtime | IndexedDB (via `idb`) | File System Access API perde o handle ao fechar o browser e tem suporte inconsistente em Firefox/Safari; IndexedDB é universal e sem limite de tamanho relevante para uso pessoal |
| `data.json` como formato de portabilidade | Export/Import explícito | O arquivo continua sendo o formato canônico e portátil; o sync é controlado pelo usuário via ícone na Navbar |
| Audit log dentro do `data.json` | Incluído na exportação | O histórico de modificações tem valor informacional e deve viajar com o ledger entre dispositivos |
| Retenção padrão do audit log | 200 entradas ou 90 dias | Equilibra rastreabilidade e tamanho do arquivo; usuários avançados podem optar por retenção ilimitada com aviso de performance |
| `summary` do audit log gerado em pt-BR | String fixa no momento da mutação | Evita complexidade de tradução retroativa; o idioma do summary reflete o idioma ativo no momento da ação |
| `unsyncedCount` | Estado Zustand (não exportado) | É estado de UI, não dado financeiro; zera ao sincronizar e ao importar |
| `FileSystemFileHandle` persistido no IDB | Object store `handles` no `nexus-db` | Handles não são serializáveis como JSON (não cabem em `localStorage`); IDB é o único mecanismo de persistência que suporta o structured clone algorithm necessário para handles nativos |
| Nome do arquivo padrão | `nexus-finances.json` | Nome mais descritivo que o `data.json` original; o usuário sempre pode alterar no picker |
| `openDataFile()` retorna `{ handle, data }` | Tupla em vez de só `DataFile` | O chamador precisa do handle para persistir no IDB; retornar ambos elimina a necessidade de uma segunda chamada ou estado global extra |
| CRUD de contas/categorias/tags | Modal com discriminated union (`{ open: false } \| { open: true; entity \| null }`) | `null` = criar, objeto = editar — uma única estrutura de estado para os dois modos, sem flags extras |
| Confirmação de exclusão | Two-click inline (sem dialog separado) | Mantém a árvore de componentes plana; primeiro clique muda o texto/cor, segundo executa a ação |
| Ícones de tipo de conta | Array `ACCOUNT_TYPES` constante de módulo | Compartilhado entre o grid do modal e o helper `accountTypeIcon()` da lista — fonte única de verdade |
| Ícones de categoria | Nomes string (`'utensils'`, `'car'` …) armazenados no `data.json` | Desacopla o dado do componente; `categoryIcon(name)` resolve o Lucide no runtime |
| Cores de tags | Paleta fixa de 8 hex no front-end | Simplifica a UX e garante coerência visual sem color picker genérico |
| `AccountType` expandido | 8 valores vs. 3 originais | Cobre os principais instrumentos financeiros do público-alvo (investidores/tech); extensível no futuro |
| `includeInBalance` em `Account` | Campo boolean por conta | Permite excluir cartões de crédito ou contas de investimento do saldo consolidado exibido no dashboard |

---

## Fase 9 — Sincronização: Cold Start (M-07)

### TASK-21: Cold Start Sync

#### `src/lib/storage/indexedDb.ts` — DB v2 + handles store
- `DB_VERSION` bumped de `1` → `2`
- Novo object store `handles` criado no `upgrade` callback (sem `keyPath`)
- Novas funções exportadas:
  - `saveFileHandle(handle: FileSystemFileHandle): Promise<void>` — persiste com chave `'data'`
  - `loadFileHandle(): Promise<FileSystemFileHandle | null>`
  - `clearFileHandle(): Promise<void>`
- `FileSystemFileHandle` é serializável para IDB por spec (structured clone algorithm)

#### `src/lib/storage/fileSystem.ts` — novas funções
- `setDataHandle(handle)` — injeta o handle no cache em memória do módulo; chamado no startup
- `openDataFile()` — retorno alterado para `{ handle, data } | null` (expõe o handle ao chamador)
- `createNewDataFile(data, suggestedName?)` — abre `showSaveFilePicker`, escreve o JSON inicial, retorna o handle; suggestedName padrão: `'nexus-finances.json'`
- `downloadDataFile(data, filename?)` — `filename` agora aceita parâmetro opcional (padrão `'nexus-finances.json'`)

#### `src/App.tsx` — restauração de handle no startup
- `loadFromIdb()` e `loadFileHandle()` executados em paralelo via `Promise.all`
- Se handle existir, `setDataHandle(handle)` é chamado antes do render para que `saveDataFile` reuse o handle sem abrir um novo picker

#### `src/pages/Onboarding/index.tsx` — dois fluxos com file picker
- **"Criar novo":** `createNewDataFile()` é chamado dentro do handler do botão (garante user gesture); se retornar `null` (usuário cancelou), exibe mensagem via `fileError` e permanece na tela; se confirmar, salva handle no IDB via `saveFileHandle()`, chama `loadData()` e navega
- **"Importar via picker":** usa o novo retorno de `openDataFile()`, chama `clearIdb()` antes de popular o IDB, persiste handle com `saveFileHandle()`
- **"Importar via drag-and-drop / file input":** mantém comportamento anterior + adiciona `clearIdb()` antes de popular o IDB; sem handle (File API não expõe FileSystemFileHandle)
- Estado `fileError` exibido em ambas as abas para feedback de cancelamento/arquivo inválido

#### `src/lib/i18n/locales/{pt-BR,en-US}.json` — novas chaves
```
onboarding.createFilePickerHint  — hint abaixo dos campos de criação
onboarding.createFileCancelled   — mensagem quando picker é cancelado
onboarding.importFileError       — mensagem quando arquivo é inválido
```

#### Testes
- `src/test/lib/storage/indexedDb.test.ts` — cobre `saveToIdb/loadFromIdb/clearIdb` (existentes) + `saveFileHandle/loadFileHandle/clearFileHandle` + isolamento entre stores
- `src/test/lib/storage/fileSystem.test.ts` — cobre `openDataFile`, `createNewDataFile`, `saveDataFile`, `setDataHandle` com mocks de `showSaveFilePicker` / `showOpenFilePicker`
- `app/e2e/onboarding.spec.ts` — 5 cenários: criação com mock do picker, cancelamento do picker, importação por arquivo, importação com arquivo inválido, importação via picker de abertura
- `vitest.config.ts` — `indexedDb.ts` e `fileSystem.ts` adicionados ao `coverage.include`

---

## Fase 10 — Sincronização: Hidratação (M-08)

### TASK-22: Hydration Sync — Validação Zod do DataFile

#### `package.json` — nova dependência
- `zod` adicionado como dependência de produção (validação em runtime)

#### `src/lib/storage/schema.ts` — schemas Zod
- Schemas individuais para cada entidade: `UserSchema`, `SettingsSchema`, `AccountSchema`, `CategorySchema`, `TagSchema`, `TransactionSchema`, `AuditEntrySchema`
- `DataFileSchema` compõe todos os schemas acima
- `validateDataFile(data: unknown): DataFile` reimplementado com `DataFileSchema.parse(data)` — mesma assinatura, lança `ZodError` em vez de `Error` manual
- `DataFileSchema` exportado para reutilização em testes (e.g. `.shape.categories.element` para validar entidades individuais)
- Todos os outros exports mantidos sem alteração: `createEmptyDataFile`, `createDefaultWorkspace`, `applyRetention`, constantes

#### `src/pages/Settings/index.tsx` — correção de gap de validação
- `handleImport` antes gravava no IDB sem validar o arquivo importado
- Agora: chama `validateDataFile(imported)` após `openDataFile()`; em caso de erro Zod, exibe mensagem via estado `importError` sem tocar o IDB
- `saveFileHandle` movido para dentro do bloco `try/catch` não-fatal (padrão alinhado com Onboarding)
- Novo estado: `const [importError, setImportError] = useState<string | null>(null)`
- Mensagem de erro renderizada abaixo do grid de export/import na seção "Arquivo de Dados"

#### `src/lib/i18n/locales/{pt-BR,en-US}.json` — nova chave
```
settings.importFileError  — mensagem exibida quando o arquivo importado falha na validação Zod
```

#### Testes
- `src/test/lib/storage/schema.test.ts` — reescrito para Zod:
  - `applyRetention` — 4 casos mantidos sem alteração
  - `createEmptyDataFile` — 5 casos: shape, categorias padrão, round-trip Zod, arrays vazios, cada categoria passa no schema individual
  - `validateDataFile` — 13 casos: DataFile válido mínimo, entidades aninhadas completas, `auditLogRetentionLimit` null, rejeição de não-objeto, campo `user` ausente, arrays com tipo errado, enum `AccountType` inválido, enum `TransactionType` inválido, enum `AuditAction` inválido, `auditLogRetentionLimit` como string, enum `CategoryType` inválido

#### Decisão técnica registrada
| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Biblioteca de validação | `zod` | Validação declarativa com inferência de tipos; eliminação do validador manual que só checava presença de campos top-level sem verificar tipos internos, enums ou estruturas aninhadas |
| Local da validação | Caller (Onboarding / Settings) | `fileSystem.ts` é responsável por acesso a arquivos, não por validação de domínio; mantém separação de responsabilidades clara |

---

## Fase 11 — Sincronização: Read-Before-Write (M-09)

### TASK-23: Read-before-write com merge por UUID

#### Problema resolvido
O `persist()` anterior fazia um overwrite cego do arquivo JSON no disco. Se o IndexedDB sofresse eviction parcial durante uma ausência do usuário, ao sincronizar o app sobrescreveria o arquivo com dados incompletos, destruindo entidades que existiam apenas no disco.

#### `src/lib/storage/fileSystem.ts` — nova função `readCurrentDataFile()`
```typescript
export async function readCurrentDataFile(): Promise<DataFile | null>
```
- Lê o arquivo do `_dataHandle` em cache sem abrir nenhum picker
- Reutiliza `validateDataFile()` do Zod para garantir que o arquivo lido é válido
- Retorna `null` em qualquer falha (sem handle, JSON inválido, falha Zod, arquivo movido)
- Falhas são não-fatais: o caller prossegue com o save sem merge

#### `src/lib/storage/merge.ts` — novo módulo com `mergeDataFiles()`
Função pura de merge em memória:
```typescript
export function mergeDataFiles(local: DataFile, disk: DataFile): DataFile
```

Estratégia de merge por entidade:
| Entidade | Regra |
|----------|-------|
| `user` | `local` vence |
| `settings` | `local` vence, exceto `fileCreatedAt` que vem do `disk` |
| `accounts`, `categories`, `tags`, `transactions` | union por `id`; item do `local` tem precedência em colisão; itens exclusivos do `disk` são adicionados (recovery path) |
| `auditLog` | union por `id`, ordenado por `timestamp` asc, `applyRetention` aplicado |

#### `src/store/useDataStore.ts` — `persist()` atualizado
```typescript
persist: async () => {
  const { data } = get()
  if (!data) return false
  const updated = { ...data, settings: { ...data.settings, fileUpdatedAt: now() } }
  const diskData = await readCurrentDataFile()              // lê o disco
  const toSave = diskData ? mergeDataFiles(updated, diskData) : updated  // merge
  const ok = await saveDataFile(toSave)
  if (ok) set({ data: toSave, unsyncedCount: 0 })          // store reflete o merge
  return ok
}
```
- O store em memória é atualizado com `toSave` após sucesso, para que um segundo sync imediato não perca os itens recuperados do disco

#### `src/components/Navbar.tsx` — tooltip no botão de sync
- Atributo `title` com `t('sync.tooltip', { count: unsyncedCount })` quando `unsyncedCount > 0`

#### `src/lib/i18n/locales/{pt-BR,en-US}.json` — novas chaves
```
sync.tooltip         — "{{count}} alteração não salva"
sync.tooltip_plural  — "{{count}} alterações não salvas"
```

#### Testes
- `src/test/lib/storage/merge.test.ts` — novo arquivo: 15 casos cobrindo user, settings, cada entidade (local-only, disk-only, colisão), auditLog (deduplicação, ordenação, retention), idempotência
- `src/test/lib/storage/fileSystem.test.ts` — 5 novos casos para `readCurrentDataFile`: handle válido retorna DataFile, sem handle não abre picker, JSON inválido retorna null, Zod inválido retorna null, `getFile()` throw retorna null
- `src/test/store/useDataStore.persist.test.ts` — novo arquivo com `vi.mock('@/lib/storage/fileSystem')` hoistado: 6 casos cobrindo guard (null data), reset de unsyncedCount, sem reset em falha de save, merge de disk-only em save, atualização do store em memória, fallback sem handle
- `app/e2e/persistence.spec.ts` — helper `seedIdb` extraído; novo teste de badge: sem mutação o badge não aparece; após edição o badge torna-se visível

#### Decisão técnica registrada
| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Merge no caller (`persist()`) vs. dentro de `saveDataFile()` | Caller | `fileSystem.ts` é responsável por I/O, não por lógica de domínio; `merge.ts` é função pura testável de forma isolada |
| `readCurrentDataFile` retorna `null` em falha vs. lança erro | Retorna `null` | O merge é um best-effort: se o disco não pode ser lido, o save local prossegue sem perda; evitar que falha de leitura bloqueie o fluxo de escrita |
| Atualizar store em memória após merge | Sim (`set({ data: toSave })`) | Garante que um segundo sync imediato não perde itens recuperados do disco; mantém IDB e store coerentes |

---

## Fora do Escopo (alinhado ao PRD)

- `X-1` Criptografia do `data.json`
- `X-2` Sincronização via Open Banking
- `X-3` App nativo mobile
- `X-4` Autenticação com servidor / modo partilhado
- `X-5` Backup do Audit Log em arquivo separado (`audit.json`) — mover `auditLog` para fora do `data.json` mantendo o ledger enxuto; arquivo importável/exportável de forma independente
- "Planejamento" (4ª aba do nav do design) — implementação futura
- Code splitting do bundle (otimização pós-MVP)
- Exportação real de PDF nos Relatórios
- `summary` do audit log multilíngue (geração retroativa por idioma)
