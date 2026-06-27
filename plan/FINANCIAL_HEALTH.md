# Saúde Financeira — F-29

> Histórico de produto e design da tela de Saúde Financeira (`/health`).
> Estado atual: **design inicial mockado** (sem motores reais). Implementação dos motores e testes: épico `HE` em `plan/BACKLOG.md`.
> Última atualização: 2026-06-26.

---

## 1. Objetivo

Dar ao usuário a visão do **total de dívidas que ele assumiu** (tudo o que parcelou ou contratou) e do **peso desse número no seu orçamento mensal**, para que consiga tomar decisões.

O insight central: **uma compra parcelada no cartão é dívida real, não apenas "a parcela do mês".** O marketing leva a pessoa a absorver a parcela no orçamento e a perder de vista o total comprometido para o futuro. A tela torna esse total visível e o contextualiza contra a renda.

### Reframe (2026-06-19 → 2026-06-20)

A ideia inicial era uma variação da tela de Patrimônio mostrando ativos (saldos + bens móveis/imóveis) e passivos (compromissos de cartão). Após discussão, o objetivo foi **estreitado para dívida + orçamento**:

- **Foco em dívida**, não em patrimônio. A página de Patrimônio (`/net-worth`, F-24) permanece intocada e responde pelo patrimônio.
- **Bens ilíquidos saíram** (imóvel, carro): baixa liquidez, pouco impacto na gestão de dívida líquida.
- **Saldos líquidos entram** apenas como contexto da reserva de emergência (ver card 2), não como "patrimônio".

---

## 2. Escopo

**Dentro:** dívida total comprometida (parcelas + contratos), peso no orçamento (renda × comprometimento mensal), reserva de emergência (atual vs. recomendado), detalhamento expansível das dívidas por cartão/empréstimo.

**Fora:** bens ilíquidos (imóvel, carro); patrimônio líquido (é a tela F-24); qualquer cálculo de "quitação à vista hoje" (descartado — ver §4.2).

---

## 3. Anatomia da tela

Navbar desktop: item **"Saúde"** entre "Patrimônio" e "Configurações" (rota `/health`). Não entra no bottom nav mobile (5 slots cheios), espelhando a decisão de Patrimônio.

Linha de resumo: **três cards de mesma altura**, na ordem `Peso no orçamento | Reserva de Emergência | Dívida total comprometida`, empilhados em < `lg`. Todos compartilham a mesma anatomia (título → números → medidor com %), para ritmo visual consistente. Abaixo: detalhamento expansível e callout educativo.

### Card 1 — Peso no seu orçamento
- Dois números: **Renda mensal** (editável no futuro) e **Comprometido por mês** (Σ das parcelas ativas).
- Número-herói: **% da renda comprometida** = comprometido/renda.
- Legenda: **compromisso mais longo** (maior horizonte em meses).
- Régua de cor (comprometimento da renda): < 30% verde, 30–50% âmbar, > 50% vermelho.

### Card 2 — Reserva de Emergência
- Dois números: **Saldo da Reserva** (atual) e **Valor Recomendado** (`RESERVE_TARGET_MONTHS × custo mensal médio`, padrão 6×).
- Número-herói: **% do recomendado** = saldo/recomendado.
- Legenda: **quanto falta** para o recomendado ("Faltam R$ X") ou "Reserva completa".
- Régua de cor: ≥ 100% verde, 50–99% âmbar, < 50% vermelho.
- Conceito de Reserva de Emergência a aprofundar (ver §5).

### Card 3 — Dívida total comprometida
- **Número único, grande (`text-4xl`) e centralizado** no corpo do card = Σ do que ainda falta pagar (parcelas + contratos). **Não** é a parcela do mês.
- Número-herói (no lugar da barra): **alavancagem pessoal** = dívida total ÷ renda mensal, exibida como múltiplo (`2,6×`).
- Legenda: **janela temporal** = "Impacta seu orçamento por N meses" (maior horizonte).
- **Esquema escuro grafite** (Bambu 900 `#1A1F2E`) — ver §5.
- Régua de alavancagem (tons claros p/ contraste no fundo escuro): ≤ 3× verde `#3D9E82`, 3–6× âmbar `#D4A017`, > 6× vermelho `#F1948A`.

### Detalhamento das dívidas (expansível)
Um card por cartão/empréstimo. Cabeçalho: nome, badge da emissora (cor da marca), valor/mês e **total restante** (vermelho). Expande para a lista de parcelamentos: descrição, "Parcela X/N · restam K", valor da parcela e **total restante** em âmbar (ênfase no custo real). Todos os totais derivam das parcelas, então **sempre reconciliam** com o agregado.

### Callout educativo
Caixa âmbar (`#FEF3DC`, borda-esquerda `#D4A017`): "O valor acima é o total que você ainda deve pagar em parcelas e contratos — não apenas a parcela deste mês."

---

## 4. Conceitos e fórmulas

Valores entre parênteses = mock atual (`MOCK_*` em `pages/Health/index.tsx`).

### 4.1 Derivações da dívida
- `remainingCount(parcela)` = `total − current + 1`.
- `installmentRemaining` = `remainingCount × valor_parcela`.
- `debtTotal` = Σ `installmentRemaining` das parcelas → **R$ 30.280**.
- `monthlyCommitted` = Σ valor das parcelas ativas → **R$ 2.750**.
- `longestHorizon` = maior `remainingCount` → **19 meses**.
- `commitmentPct` = `monthlyCommitted / renda` → **24%** (renda R$ 11.500).
- `leverage` = `debtTotal / renda` → **2,6×**.

### 4.2 Reserva de emergência
- `recommendedReserve` = `RESERVE_TARGET_MONTHS × custo_mensal_médio` → 6 × R$ 6.000 = **R$ 36.000**.
- `reserveRatio` = `saldo / recomendado` → 22.700 / 36.000 = **63%**.

> **Conceito descartado — "Se quitasse tudo hoje" / dívida líquida (`reserva − dívida total`).** Era incoerente: misturava o passivo *nominal futuro* (soma das parcelas) com um ato *à vista hoje* (que pagaria o saldo devedor atual, não a soma nominal). Substituído pela métrica de cobertura e, na sequência, pela visão de Reserva de Emergência (atual vs. recomendado), que usa réguas comparáveis.

---

## 5. Decisões de design

- **Hero grafite, não verde (2026-06-20).** O card de dívida é escuro para servir de âncora visual da linha, mas usar Floresta 800 (a cor de "dinheiro/positivo" da marca) num passivo passava viés positivo errado. Princípio adotado: **o fundo do card não julga o número — quem julga é o indicador.** Fundo neutro (grafite Bambu 900 `#1A1F2E`) transmite gravidade sem viés; a única cor avaliativa é a alavancagem. Registrado no `design/DESIGN.md` (Floresta 800 = saldo/positivo; Bambu 900 = passivo/gravidade).
- **Tom calmo, nunca alarmista.** Mesmo o estado crítico é diagnóstico, não sirene. Sem vermelho de fundo por padrão.
- **Réguas comparáveis.** Toda métrica compara dois números de mesma natureza (renda × comprometido; saldo × recomendado; dívida × renda).
- **Consistência de anatomia.** Os três cards seguem título → números → medidor; o card de detalhamento reusa o padrão de linha/badge da emissora do Patrimônio.

---

## 6. Decisões de produto (sessão 2026-06-21)

Os pontos que estavam em aberto foram decididos numa sessão de produto. As tarefas correspondentes estão no épico `HE` em `plan/BACKLOG.md`.

### D0 — Escopo do v1: dívida primeiro
O primeiro corte funcional liga os motores de **Dívida total comprometida** e **Peso no orçamento** (renda). A **Reserva de Emergência sai do v1** e vira um épico próprio (custo mensal médio, contas da reserva, reserva-entidade — antigos pontos 1, 2 e 4). Motivo: o *job* central da tela é consciência de dívida; a reserva é um *job* distinto (preparação para imprevistos) e travava o v1 nas decisões mais espinhosas.

### D1 — Renda mensal: híbrido derivar + override
Denominador do "Peso no orçamento". **Derivar uma sugestão, o usuário confirma/ajusta, o valor persiste.**
- **Renda qualificada** = transações `INCOME` **excluindo conta CREDIT** (estornos da B-16 são `INCOME` em cartão e inflariam a renda) **e excluindo transferências**.
- **Janela** = até **6 meses completos** (o mês corrente fica de fora — a renda dele ainda não entrou inteira).
- **Piso de 3 meses** com renda qualificada → usa a **mediana** (mês típico, resiste a meses atípicos como 13º/resgate). **1–2 meses** → usa o disponível, mas rotulado como *"estimativa de N meses — confirme"*. **0 meses** → sem número; campo manual com CTA.
- O **valor definido pelo usuário sempre vence** e **nunca é sobrescrito em silêncio**. A derivação só sugere; um "recalcular pelo histórico" fica opt-in.
- **Requisito de UI:** o rótulo de confiança ("baseado em N meses") aparece **no card**, não só no input — senão o usuário lê o % como verdade absoluta (falsa precisão).
- Esse cold start fixa o **mesmo padrão** para o "custo mensal médio" do épico da Reserva.
- **Persistência do valor confirmado (decidido na HE-09, 2026-06-21):** `workspace.monthlyIncomeOverride` (local, mesmo padrão de `netWorthIncludeHidden`), **não** `Settings`/SQLite. Motivo: evita nova coluna SQLite + migration + bump de `CURRENT_SCHEMA_VERSION` para uma única figura cujo pior caso de "perda" (troca de dispositivo, restore de backup) já é coberto pelo próprio design do D1 — sem override, a tela volta a sugerir pelo histórico ou pede confirmação manual; não é perda de dado financeiro real.

### D5 — Dívida não-cartão: entidade de passivo de primeira classe (`LOAN`), no v1
Novo tipo de conta para empréstimos/financiamentos não-cartão (empréstimo pessoal, consignado, financiamento de carro/imóvel). **Incluído no primeiro corte** porque enriquece duas telas:
- **Saúde Financeira (F-29):** saldo devedor entra na Dívida total; parcela entra no Comprometido por mês; prazo restante no maior horizonte.
- **Patrimônio (F-24):** passa a contribuir como **passivo** ao lado de CREDIT (hoje o net worth só conta cartões como passivo).
- **Modelo v1 (confirmado na HE-06, 2026-06-21):** saldo devedor é figura **mantida pelo usuário**, atualizada por **edição direta no modal de conta** (`pages/Settings/index.tsx`) — não um histórico de snapshots como o `Valuation` de STOCKS/CRYPTO/ASSET. Motivo: o `Valuation` existe para registrar a evolução de um valor de mercado externo (preço de ação, cripto); o saldo devedor de um empréstimo não tem "preço de mercado" para snapshot — é só um número que o usuário corrige periodicamente. Sem amortização automática de juros/principal nesta fase. Juros como campo opcional para um insight futuro de "custo dos juros".

### Premissas a validar (pós-lançamento)
- A maioria dos usuários terá histórico rico (import Organizze). Se muitos começarem do zero, o caminho manual de D1 vira regra, não exceção.
- O modelo de saldo devedor mantido pelo usuário (`LOAN`) é suficiente; amortização automática pode ser demandada depois.

### Nota de escopo
Ao incluir `LOAN` no v1, a F-29 deixou de ser "ligar motores num mock": virou um épico que cruza schema + Settings + Patrimônio. Decisão consciente. **Sequenciar `LOAN` como a primeira fatia** do épico para não virar gargalo do resto.

---

## 7. Decisões de produto (sessão 2026-06-25) — família de empréstimos

Sessão de produto desencadeada por uma pergunta sobre como o usuário registra/converte um empréstimo, já que não havia caminho óbvio na UI. A investigação revelou que o problema não era "falta de cadastro" (a entidade `LOAN` já tinha modal e edição) — era o **motor de dívida ignorar o formato de dado mais comum**: um empréstimo lançado **parcela a parcela** numa conta comum. Isso foi resolvido no HE-15. A discussão seguinte desenhou o modelo conceitual que organiza os próximos passos (HE-16 a HE-18 no `BACKLOG.md`).

### D6 — Empréstimo é uma família com dois *backings*, não duas features

Existe **um** conceito ("dívida não-cartão") com **dois backings**, distinguidos por uma única pergunta: **as parcelas existem como transações no ledger ou não?**

| | Conta `LOAN` (backing **opaco**) | Série marcada (backing **rastreado**) |
|---|---|---|
| Natureza | dívida sem parcelas rastreáveis | parcelas lançadas como `Transaction` |
| Exemplos | consignado descontado na fonte; financiamento de banco não importado; **dívida informal** ("devo R$ 11k pro meu pai") | financiamento/empréstimo lançado parcela a parcela (ex.: "Refinanciamento Itaú", 84x) |
| Fonte do saldo/parcela/prazo | declarado pelo usuário | **derivado do ledger** |
| Existe como | `Account` | anotação leve apontando pra uma série (`parentId`) |

**Por que a `LOAN` opaca não é redundante:** há dívidas que **só** podem ser opacas — não há transação de parcela pra marcar (consignado na fonte, conta não importada, dívida informal). A série-rastreada é estruturalmente impossível nesses casos. Além disso, hoje a `LOAN` é a única que entra como passivo no Patrimônio (F-24).

**Unificação na apresentação, não nos dados:** ambos os backings afloram como `kind: 'loan'` no breakdown (mesmo ícone/selo/semântica). A distinção fica só na origem do dado. **Rejeitada** a unificação "pesada" (marca criar uma conta `LOAN` linkada que auto-deriva): contradiz o modelo da HE-06 e abre risco de dupla contagem (estático + installment), forçando exclusões frágeis.

### D7 — Princípio comum: pedir o principal, derivar o tempo

Os dois backings convergem num princípio único: **pedir ao usuário só o que não dá pra derivar; derivar tudo que é função do tempo.**

- **Pedir `principal`, não a taxa de juros.** A taxa em `% a.m.` é precisa mas inverificável (enterrada no contrato; a "nominal" nem inclui seguro/IOF/tarifas embutidos na parcela). O **principal** ("caiu R$ 50.000 na conta") é concreto e memorável. Pede-se o que o usuário *sabe*.
- **Derivar o custo, *estimar* a taxa.** Com principal + parcelas materializadas:
  - **Custo do crédito** = Σ parcelas − principal (exato dado o principal; Σ via `installment.total × parcela`, robusto a parcelas antigas fora da janela de import).
  - **Multiplicador** = total pago ÷ principal → *"pra cada R$ 1 que entrou, você devolve R$ 1,57"*. **É o número-herói** — inegável e alinhado à tese da §1.
  - **Taxa estimada** (`≈ X% a.m.`) — secundária e caveateada. Como cada parcela é transação real (data + valor), dá pra calcular o IRR do fluxo *real* (Newton/bisseção), não um "Price ideal". Ainda é *estimativa* porque: parcelas antigas podem faltar na janela; seguro/tarifas inflam a taxa implícita; o t0/principal é aproximado. **O verbo é "estimar", não "calcular".**
- **Aplicar o mesmo princípio à `LOAN` opaca (set-once):** em vez de exigir atualização mensal do `outstandingBalance` (que desatualiza — um número velho é pior que nenhum), pedir principal + parcela + data de início e **derivar o saldo corrente pelo tempo decorrido**. Transforma "mantida à mão" em "set-once". É a amortização automática que a HE-06 adiou, na forma mais simples.

### D8 — Marca leve mora numa anotação por `parentId`

A série é identificada por `installment.parentId`. A marca guarda o mínimo: `{ parentId, principal, name? }` — **`interestRate` deixa de ser armazenado** (vira derivado/estimado). Caminho recomendado: **coleção leve nova** em `DataFile` (ex.: `installmentLoans`), keyed por `parentId` (sobrevive ao sync por UUID, não polui `Transaction`). Rejeitados: Tag de sistema (não carrega `principal`, é por-tx) e campo no parent da série (mistura classificação em `Transaction`). A marca é **reversível** e **nunca** altera as transações.

### Ponta solta reconhecida

Uma série parcelada (marcada ou não) entra na **Saúde** mas **não** como passivo no **Patrimônio** (F-24) — lá só a `LOAN` conta, via `getLoanLiability`. Tornar séries passivo no net worth é decisão **própria** (vale pra marcadas e não-marcadas) → HE-18, fora do escopo da marca.

### Premissa a validar
- Quantas dívidas reais são rastreadas (parcelas no ledger) vs. opacas? Se quase todas forem rastreadas, a `LOAN` opaca é nicho — mas não zero (cobre consignado na fonte e dívida informal). Mantida, na forma derivada (D7).

---

## 8. Decisões de produto (sessão 2026-06-26) — LOAN como entidade central de empréstimos longos

Sessão desencadeada por uma pergunta sobre parcelamentos muito longos (ex.: financiamento imobiliário em 420 meses): lançados parcela a parcela, eles materializam centenas de `Transaction` desde a criação da série, degradando `data.json`, `audit_log`, diff de sync e listagens. Avaliou-se um mecanismo genérico de geração *lazy* no motor de `installment` (materializar N ocorrências, prever o resto) e descartou-se em favor de consolidar esses casos na entidade `LOAN` (HE-04/HE-06), que já existe e nunca pré-materializa parcelas. Isto **reverte parte do modelo da D6** (§7): em vez de dois *backings* permanentes (opaco + rastreado), `LOAN` passa a absorver também o caso hoje cobrido pela marca rastreada (HE-16).

### D9 — Consolidação: `LOAN` é o único caminho para empréstimo/financiamento; marca (HE-16) é descontinuada

- A D6 justificava os dois *backings* por haver dívidas estruturalmente impossíveis de rastrear (consignado na fonte, dívida informal) — isso continua verdadeiro. O que muda é o caso **rastreável mas de prazo longo** (financiamento lançado parcela a parcela numa conta comum, ex. "Refinanciamento Itaú" 84x): em vez de marcar a série existente (HE-16), o caminho recomendado passa a ser cadastrar um `LOAN` desde o início, que **gera** as transações em vez de depender do usuário lançá-las manualmente.
- Motivo: manter dois caminhos para o mesmo conceito (lançar parcela a parcela + marcar, vs. cadastrar `LOAN`) duplicava esforço de manutenção e não escalava para prazos muito longos — exatamente o problema que motivou esta sessão.
- **Depreciação:** a UI de marca em `TransactionDrawer.tsx` (HE-16) é removida. Em seu lugar, um CTA no fluxo de criação de transação parcelada ("isso parece um financiamento longo? cadastre como Empréstimo") aponta para a nova seção em Configurações (D13). O destino dos dados já marcados (`DataFile.installmentLoans`) é uma ponta solta (ver abaixo) — migração automática para `LOAN` não é direta, pois a marca não carrega conta pagadora nem valor de parcela fixo garantido.

### D10 — Motor de geração: transações reais, nunca pré-materializadas

- Cada parcela de um `LOAN` é uma `Transaction` real, debitando a conta pagadora definida no cadastro — preserva o sinal de fluxo de caixa e mantém Dashboard/Relatórios funcionando sem lógica nova (decisão do ponto 2 da revisão de complexidade: transação de verdade, não bookkeeping abstrato).
- Geração ocorre conforme o tempo passa (mês corrente, via job no carregamento do app), **nunca** a série inteira de uma vez — é isso que resolve o problema original de escala (um financiamento de 420 meses nunca tem mais que algumas dezenas de `Transaction` reais em qualquer momento).
- **ID determinístico** (`uuid5(loanId + período)`, mesmo padrão do script `sync_gimbo.py`) evita duplicação quando dois dispositivos offline geram a parcela do mesmo período antes de sincronizar — o merge por UUID deduplica sozinho.

### D11 — Saldo devedor: planejado − pago, sem amortização

- `saldoDevedor = (parcelasRestantesPlanejadas × valorDaParcela)` ajustado pela diferença entre o que foi efetivamente pago e o que seria pago seguindo o plano original. Quando o pago diverge do planejado (parcela maior/menor, atraso), o ajuste recai sobre o **prazo restante** (recalculado a cada lançamento como `saldo ÷ valorDaParcela`), não sobre o valor da próxima parcela.
- **Sem método de amortização** (Tabela Price/SAC) e **sem correção monetária** — fora de escopo deliberadamente, em troca de simplicidade. Consequência aceita: **projeção de juros sai do v1** (pode voltar como demanda futura, já que IRR sobre o fluxo real de um `LOAN` com transações reais seria possível do mesmo jeito que `getInstallmentLoanInsight` faz hoje para séries marcadas).

### D12 — Cadastro de empréstimo já em andamento: backfill é escolha do usuário

- Ao cadastrar um `LOAN` cujo início é anterior a hoje, o usuário escolhe explicitamente entre **(a) backfill** das parcelas já vencidas como transações históricas reais, ou **(b) começar a contar a partir de hoje** (saldo inicial = o que falta, sem histórico). Aviso de impacto explícito na escolha (b): relatórios e fluxo de caixa passados não refletirão pagamentos já feitos.

### D13 — UI: seção dedicada em Configurações

- Nova seção "Empréstimos", abaixo de "Contas e Cartões" em `pages/Settings/index.tsx`. Um card por `LOAN`: valor do empréstimo (principal), número de parcelas, total pago, saldo devedor.
- Drawer de criação/edição: saldo inicial (principal), número de parcelas, valor da parcela, conta pagadora, data de início, escolha de backfill (D12).

### Impacto em outras telas

- **Relatórios/Analytics:** pouco impacto — a geração nunca pré-materializa o futuro, então um intervalo de relatório acima de 10 anos simplesmente não vê parcelas que ainda não aconteceram (correto). Projeção *futura* (ex. "este empréstimo será quitado em tal mês" em Patrimônio/Saúde) é caso especial, fora de escopo por ora.
- **Saúde (F-29):** saldo devedor e parcela mensal do `LOAN` passam a vir do motor de geração (D11) em vez de `loanMetadata` estático editado à mão (HE-06) — `getTotalCommittedDebt`/`getMonthlyCommitment`/`getDebtHorizon`/`getDebtBreakdown` trocam a fonte do dado, mantendo a mesma forma de agregação.
- **Patrimônio (F-24):** `getLoanLiability` segue valendo; só troca a fonte do saldo (derivado do motor em vez de editado).

### D14 — Empréstimo "frio" (sem cronograma): flag explícita, não inferida (sessão 2026-06-26, follow-up)

- Nem todo `LOAN` tem parcela fixa — ex. uma dívida informal ("devo R$ 11k pro meu pai"), sem cronograma de pagamento. O motor de geração (D10) já degradava de volta ao modelo estático quando faltavam `principal`/`installmentAmount`/`startDate`/`payerAccountId`, mas isso era **inferido pela ausência de campos**, indistinguível de "usuário esqueceu de preencher" ou "conta legada ainda não migrada".
- **Decisão:** `loanMetadata.schedule: 'fixed' | 'none'` explícito. `'fixed'` aciona o motor (D10/D11); `'none'` é o empréstimo frio — mantém o modelo `outstandingBalance` editado à mão (HE-06), nunca gera transação. `undefined` (contas legadas migradas pela HE-19, `legacy: true`) é tratado como `'none'` até o usuário decidir na UI (D13).
- `isLoanGenerationReady` passa a checar `schedule === 'fixed'` em vez de inferir pela presença dos 4 campos — resolve a ponta solta original sem reabrir o desenho da HE-19.

### D15 — Destino dos dados HE-16: remoção completa, não leitura histórica (sessão 2026-06-26, HE-21)

- A marca (`DataFile.installmentLoans`) foi adicionada e superseded pela `LOAN` dentro da mesma sessão de trabalho, sem indício de uso real em dados de usuário — escolhida a opção mais simples das três em aberto: **remoção completa** (tipo, schema, tabela SQLite, actions, `getInstallmentLoanInsight`, UI) em vez de manter um caminho de leitura legado. Schema bump v12→v13 só formaliza a remoção; nenhuma migração assistida foi necessária.
- HE-17 (LOAN opaca *set-once*, D7) e HE-18 (série rastreada como passivo no Patrimônio) ficam **supersedidos** por este desenho — fechados no `BACKLOG.md`.

---

## 9. Estado atual

**v1 (dívida + orçamento) ligado aos motores reais (HE-04 a HE-11, 2026-06-21).** `pages/Health/index.tsx` lê `useDataStore`/`useWorkspaceStore`: dívida total, comprometido mensal e horizonte vêm de `getTotalCommittedDebt`/`getMonthlyCommitment`/`getDebtHorizon` (HE-08); o detalhamento expansível vem de `getDebtBreakdown` (HE-10), que agrupa por conta CREDIT (itens de parcela aberta) e LOAN (item único a partir de `loanMetadata`), sempre reconciliando com os agregados. Renda mensal usa `deriveMonthlyIncome` (HE-09) com override do usuário em `workspace.monthlyIncomeOverride`, editável inline (lápis → input → confirmar) e rotulada por confiança (`confirmedByYou`/`basedOnMonths`/`estimateConfirm`/CTA manual). Rota, navbar e i18n (`nav.health`, `health.*`) ligados. Testes: `Health.test.tsx` (HE-11, 9 testes de componente) + 5 testes unitários de `getDebtBreakdown` em `utils.test.ts`.

**Dívida não-cartão lançada parcela a parcela (HE-15, 2026-06-25).** Um empréstimo/financiamento registrado como **série `installment` numa conta comum** (ex.: "Refinanciamento Itaú", 84x numa conta RETAIL) — nem `CREDIT`, nem entidade `LOAN` — passou a ser contado como dívida. Os 4 motores (`getTotalCommittedDebt`/`getMonthlyCommitment`/`getDebtHorizon`/`getDebtBreakdown`) reconhecem séries abertas de **qualquer conta não-`LOAN`**, com `DebtGroup.kind: 'installments'` próprio no detalhamento. Decisão consciente de **não** oferecer "converter para conta `LOAN`": a `LOAN` (HE-06) é um saldo estático sem transações, voltada a dívidas *não* lançadas parcela a parcela; converter a série descartaria as transações e o impacto no fluxo de caixa. São dois formatos válidos de passivo não-cartão, e o motor conta cada um uma vez. Escopo "contar tudo"; marcação opt-in "marcar série como empréstimo" (nome + juros) fica como incremento futuro.

**Marca leve "marcar série como empréstimo" (HE-16, 2026-06-25).** Backing rastreado da família de empréstimos (D6): qualquer série `installment` pode ser opt-in marcada com `{ parentId, principal, name? }` (`DataFile.installmentLoans`), via uma seção em `TransactionDrawer.tsx` visível ao editar uma ocorrência parcelada — CTA → form inline → `setInstallmentLoan`/`unmarkInstallmentLoan`. `getInstallmentLoanInsight` (`lib/utils.ts`) deriva `totalPaid`, `cost`, `multiplier` (número-herói) e `estimatedRate` (IRR via bisseção sobre o fluxo real das parcelas), seguindo D7 — só o principal é pedido, o resto é derivado/estimado. `getDebtBreakdown` anota o item correspondente com `loanMark`; a Saúde renderiza um selo de empréstimo + a linha de multiplicador/custo/taxa no item expandido. **Desvio do desenho inicial:** anotação **por item**, não promoção do `DebtGroup.kind` — uma conta pode ter séries marcadas e não-marcadas misturadas, e o agrupamento do HE-15 é por conta. Schema v10→v11 (`installmentLoans: []`) com mirror SQLite completo (a base OPFS é a persistência efetiva lida no boot, não um cache).

**Reserva de Emergência ainda mockada** (`MOCK_EMERGENCY_RESERVE`/`MOCK_MONTHLY_COST`), com selo visual "Em breve" no card — fica para o épico próprio HE-12 a HE-14 (§4 Fase 4 do `BACKLOG.md`). Referência de design inicial (Stitch): `design/saude-financeira.png`.
