# Épico: Módulo Analítico Avançado (Executive Dashboard)

## Visão Geral
Como parte da expansão corporativa e analítica do **Nexus Finance**, o antigo fluxo pontual da página `Analytics` precisa dar lugar a uma estrutura central de **Relatórios Avançados**. Inspirada inicialmente no minimalismo das soluções comuns do mercado (como o *Organizze*), esta arquitetura foi otimizada via conceitos de **UI/UX Pro Max** para apoiar usuários *power-users* capazes de cruzar tags, checar fluxos acumulativos e fazer o _drill-down_ do panorama generalista para a abstração micro-financeira.

---

## Estrutura Ágil (User Stories)

### 1. Navegação e Seletor de Período Global

**User Story:** Como um usuário avançado, eu quero navegar intuitivamente entre diferentes tipos de relatórios e manipular as datas no topo, para que minhas análises alterem imediatamente sem precisar recarregar toda a interface.

- **Acceptance Criteria (Critérios de Aceite):**
  - O cabeçalho deve expor uma **Sub-Navigation Bar** composta por quatro pilares: _Categorias_, _Cash Flow (Entradas x Saídas)_, _Contas_ e _Tags_.
  - Acima ou integrado à bar, deve haver um **Seletor Global de Período** ("De: Jan 2026 Até: Jun 2026").
  - A troca de abas deve preservar o filtro de período selecionado na Store.
  - A atual rota `/analytics` será totalmente desconstruída (ou transformada no ponto focal `Index`) orquestrando o roteamento destas 4 *Views* limpas.

---

### 2. Personalização Visual (Feature Toggle de Elevação)

**User Story:** Como um usuário sensível à densidade de informações gráficas, eu quero ativar ou desativar o efeito visual de profundidade ("Ambient Shadows") nos gráficos e contêineres, para que eu tenha desde uma UI totalmente sólida (`Flat`) até um ambiente flutuante de foco refinado.

- **Acceptance Criteria:**
  - A aplicação deve injetar o campo lógico de `useAmbientShadows` dentro da estrutura local persistida via Zod (`WorkspaceFile` em `schema.ts`).
  - O seu valor *default* de repouso no `store` deve ser `false` honrando o minimalismo sólido.
  - Apenas as *Wrappers* visuais deste dashboard e *Containers* complexos dos gráficos poderão utilizar a classe CSS geradora do efeito quando `useAmbientShadows` assumir a bandeira de `true`.

---

### 3. Visão: Cash Flow (Entradas x Saídas)

**User Story:** Como analista das minhas finanças, quero visualizar um comparativo imediato entre o que ganhei (Receita) e o que perdi (Despesa) temporalmente, mas fundamentalmente enxergando uma sobreposição linha contínua, para que eu visualize o "Saldo Acumulado" final perfeitamente.

- **Acceptance Criteria:**
  - **O Gráfico Principal (`ComposedChart`):** Barras verticais combinadas no eixo Y; Entrada na paleta `--color-primary-container` (#22C55E) e as Saídas no `--color-tertiary-container` (#FF8A83).
  - Um eixo em L com o renderizado Linear em tracking ponta a ponta informando o *Saldo Acumulado*.
  - **Tabela Relacional (Data Grid):** Abaixo dos gráficos, repousa uma tabela puramente estruturada. Cada linha condiz com 1 sub-período do eixo do gráfico, detalhando o delta matemático de "Resultado" absoluto (Entrada - Saída) e o Saldo temporal. 

---

### 4. Visão: Relatório de Categorias (Drill-Down Mode)

**User Story:** Como administrador das despesas centrais, quero enxergar grandes blocos de despesas através de representações setoriais (Doughnut charts) que me permitam explorar o miolo daquele agrupador para saber com exatamente o que o montante foi gasto.

- **Acceptance Criteria:**
  - **Layout Split:** Metade esquerdo da tela renderiza o gráfico Donut focando nos Créditos, a metade direita em cima dos Débitos.
  - **Legend & Tabela Setorial:** Categóricas listadas usando ícones + Nomes; Quantia R$ bruta gasta no respectivo período + o `%` do bolo total fatiada.
  - **Drill-Down:** Clicar num setor da Pizza deve despachar uma listagem condensada em Pop-up modal listando apenas as Transações (`transactions[]`) referentes à categoria clicada no exato período da requisição.

---

### 5. Visão: Relatório de Contas Isoladas

**User Story:** Como gestor de patrimônios diversos, eu desejo enxergar as finanças sob a ótica independente de uma carteira específica, varrendo suas rendas e desgastes no macro, descartando o comportamento isolado das minhas outras contas.

- **Acceptance Criteria:**
  - **Card Grid:** Exibição da contabilidade bancária unificada. Contas correntes exibidas em blocos separados. 
  - Dentro de cada cartão, expor o Resumo de Resultado apenas do Filtro Global. O saldo que importará é temporal.
  - Se selecionado (drill-down clicado), o sistema espelha as capacidades do `CashFlow` (Entradas x Saídas), mas travando toda a filtragem matemática de transações para ler apenas a Chave Primária correspondente ao id dessa conta particular.

---

### 6. Visão: Análise de Labels e Tags Cruzadas

**User Story:** Como usuário trabalhando com grandes orçamentos flutuantes em projetos reais (Ex: Obras e Reformas), desejo verificar o avanço material de despesas em diferentes *Tags* que lancei nas transações esparsas, para visualizar como o custo de grandes projetos se ramifica fora dos domínios das categorias fixas da vida cotidiana.

- **Acceptance Criteria:**
  - **Ranked Horizontal Bar Chart:** Gráficos com barras horizontais listadas. Tag com mais despesas financeiras encabeça o ranking `[0]`.
  - Diferentemente dos players casuais, é requerido permitir Multi-Tag query: Possibilidade do Analista combinar filtros para exibir sobreposição analítica e soma entre (exemplo) `#Construção` & `#Ferragens`.

---

> _Plano consolidado como design master blueprint do Módulo._
