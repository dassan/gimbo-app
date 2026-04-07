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
- Enums: `AccountType`, `CategoryType`, `TransactionType`
- `DataFile` (root de `data.json`) e `WorkspaceFile` (root de `workspace.json`)
- `Theme` e `Locale` para o workspace

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

### TASK-06: Utilitários (`src/lib/utils.ts`)
- `cn(...classes)` → merge Tailwind com `clsx` + `tailwind-merge`
- `uuid()` → `crypto.randomUUID()`
- `now()` → ISO 8601 timestamp
- `formatCurrency(value, locale)` → `Intl.NumberFormat` (BRL / USD)

---

## Fase 3 — Estado Global

### TASK-07: Store de dados (`src/store/useDataStore.ts`)
Store Zustand com todo o CRUD do `DataFile`:
- `data: DataFile | null` + `isDirty: boolean`
- `loadData(data)` / `clearData()`
- `addAccount` / `updateAccount` / `deleteAccount`
- `addCategory` / `updateCategory` / `deleteCategory`
- `addTag` / `updateTag` / `deleteTag`
- `addTransaction` / `updateTransaction` / `deleteTransaction`
- `persist()` → chama `saveDataFile`, atualiza `settings.fileUpdatedAt`
- Mutações via `structuredClone` para imutabilidade

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
- Lista de contas com ícone, nome, tipo e saldo
- Botão "Nova Conta" (cria conta com valores padrão via `addAccount`)

**Seção Categorias:**
- Pro Tip card em `bg-primary` com texto branco
- Hierarquia pai/filho: filhos recuados com `ml-6` e dot indicator
- Botão "Nova Categoria"

**Seção Tags:**
- Chips coloridos com `#nome`
- Botão "Nova Tag"

**Seção Perfil:**
- Inputs de Nome e E-mail com "Salvar Perfil" → atualiza `data.user` via `loadData`

**Seção Preferências:**
- Seletor de Idioma (muda `i18n.changeLanguage` imediatamente)
- Seletor de Tema (sistema/claro/escuro)

**Seção Arquivo de Dados:**
- Card de aviso de privacidade (local-first)
- Grid 2 colunas: "Exportar Dados" (`downloadDataFile`) + "Importar Dados" (`openDataFile`)

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

---

## Fora do Escopo (alinhado ao PRD)

- `X-1` Criptografia do `data.json`
- `X-2` Sincronização via Open Banking
- `X-3` App nativo mobile
- `X-4` Autenticação com servidor / modo partilhado
- "Planejamento" (4ª aba do nav do design) — implementação futura
- Code splitting do bundle (otimização pós-MVP)
- Exportação real de PDF nos Relatórios
