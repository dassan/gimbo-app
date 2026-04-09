# [PRD] Nexus - App de Finanças Pessoais (Client-Side)

Este documento atua como a Fonte da Verdade para o desenvolvimento do Nexus.

## User Review Required
> [!IMPORTANT]
> Aprovação Final: O PRD foi ajustado com as suas revisões finais (Nome-código Nexus, internacionalização desde o dia 1, padronização `workspace.json` e `data.json`). Se estiver de acordo, por favor conceda a aprovação formal para pularmos para a execução e setup.

---

## 1. Resumo Executivo (TL;DR)
O Nexus é um aplicativo web (PWA Client-side) de gestão de finanças pessoais focado em extrema privacidade, velocidade de uso diário e planejamento avançado. Ele combina uma UX simples e rápida — inspirada em ferramentas comerciais — com uma arquitetura local (100% de leitura de arquivo JSON) que isenta a dependência de servidores terceiros e devolve ao usuário a propriedade de seus dados, enquanto também provê ferramentas sofisticadas para análise e previsão de fluxo de caixa.

## 2. Visão Geral e Problema
**Declaração do Problema:** Usuários rigorosos com suas finanças sofrem com a falta de privacidade de ferramentas comuns (que armazenam dados em nuvens corporativas), além de esbarrarem na limitação analítica dessas plataformas, não conseguindo ter clareza de como seu fluxo de passivo/ativo se comportará num horizonte temporal de curto/médio prazo.
**Objetivo (Por que agora?):** Construir uma plataforma de uso estritamente local (JSON) com zero instalação exigida (basta abrir um link), que consiga unir entrada rápida de dados diários com poderosos painéis de análise de "3 meses para trás e 3 meses para frente".
**Público-alvo:** Usuários organizados da área de finanças e tech, que demandam UX premium mas não abrem mão de privacidade e análises detalhadas.

## 3. Metas e Métricas de Sucesso (KPIs)
* **Tempo de Inserção de Despesa:** Lançamentos em < 6 segundos e no máximo 2 cliques da tela principal.
* **Performance e Latência de Renderização:** Troca instantânea entre telas e abas do aplicativo (< 100ms) visto que não há chamadas a backends.
* **Latência de Salvamento:** O motor de armazenamento vai gravar as mutações no arquivo em disco (em background) em < 300ms, sem congelamentos na UI.

## 4. Histórias de Usuário
* **US-1:** "Como usuário zeloso com dados, quero guardar meu histórico em um arquivo JSON puramente local para que bancos ou empresas terceiras não acessem ou comercializem meu padrão de vida."
* **US-2:** "Como planejador, quero um gráfico no dashboard agrupado por semanas que me mostre meus ganhos e projeções negativas nos próximos três meses, utilizando transações não-pagas, para eu visualizar a viabilidade do meu caixa."
* **US-3:** "Como observador, quero analisar um gráfico de pizza filtrado por período para analisar as proporções de gastos nas minhas categorias (e subcategorias)."
* **US-4:** "Como usuário diário do sistema, quero adicionar despesas, vincular tags e categorias com rapidez e sem passos confusos para manter minha adoção do produto consistente."

## 5. Escopo e Funcionalidades

### Dentro do Escopo (Must-have - Construiremos agora)
* **F-1:** Criação simples de perfil de usuário (Apenas metadados de Nome, E-mail, com rastreio de datas de edição).
* **F-2:** Sistema completo de Gestão de Contas com 8 tipos (Banco/Corrente, Poupança, Cartão de Crédito, Criptomoedas, Câmbio/Forex, Ativos/Fundo, Ações, Outros) e flag `includeInBalance` por conta.
* **F-3:** Gestão de Categorias com suporte a hierarquia de Sub-categorias via "ParentId".
* **F-4:** Sistema de Tags personalizáveis e associáveis a múltiplas transações.
* **F-5:** CRUD rápido de Transações (Receitas, Despesas, Transferências).
* **F-6:** Visão Geral Simples (Dashboard do mês atual indicando total de receitas, despesas e Saldo Consolidado).
* **F-7:** Painel Analítico 1: Gráfico de linha/barra (Fluxo de Caixa ±3 Meses da data corrente), agregável por semanas ou mês, com as contas não-pagas.
* **F-8:** Painel Analítico 2: Gráfico de pizza indicando as Despesas por Categoria.
* **F-9:** Motor de Arquivo Client-Side PWA (Exportar/Importar `data.json` local).
* **F-10:** A capacidade de escolher/alterar o idioma da aplicação através de um seletor visual na interface.
* **F-11:** Modal de Onboarding/Setup Inicial: Ponto de entrada do PWA onde o usuário decide entre "Criar Novo Arquivo" (informando Nome, Email e Idioma) ou "Importar data.json Existente" (ocultando os formulários e carregando os dados logados).
* **F-12:** Auto-save via IndexedDB: toda mutação de dados é persistida automaticamente no IndexedDB do browser (debounced ~300ms), eliminando risco de perda de dados por fechamento acidental da aba. O IndexedDB é o banco de dados primário em tempo de execução; o `data.json` é o formato de exportação/portabilidade.
* **F-13:** Audit Log: registro imutável de todas as alterações feitas pelo usuário (criação, edição e exclusão de qualquer entidade). Armazenado dentro do `data.json` para que o histórico viaje com o arquivo. Retenção padrão: **200 entradas ou 90 dias** (o que ocorrer primeiro). Opt-in de retenção ilimitada disponível em Configurações, acompanhado de aviso sobre impacto potencial no desempenho no longo prazo.
* **F-14:** Indicador de Alterações Não Sincronizadas: ícone de sincronização (setas em círculo) na Navbar, ao lado do sino, exibindo em badge vermelho a contagem de mutações realizadas desde o último Export/Sync. Ao clicar, dispara a sincronização do estado atual do IndexedDB para o `data.json` (via File System Access API ou download fallback).
* **F-15:** Tela "Modificações Recentes" dentro da seção Aplicativo em Configurações: lista cronológica reversa das entradas do Audit Log, com ação, entidade, resumo legível e timestamp.
* **F-16:** Cold Start Sync — ao criar um novo perfil, o usuário escolhe o nome e o local do arquivo via file picker nativo (`showSaveFilePicker`); ao importar um arquivo existente via picker, o handle é persistido no IndexedDB. Em ambos os casos, o `FileSystemFileHandle` é armazenado no IDB (store `handles`) e restaurado automaticamente no próximo startup, permitindo que o sync subsequente reuse o handle sem abrir um novo picker. Fluxos com drag-and-drop funcionam sem handle (modo sem sincronização automática até o usuário fazer o primeiro sync manual). Feedback visual (inline error) para cancelamento do picker e arquivos inválidos.
* **F-17:** Hydration Sync — validação Zod completa do `DataFile` ao importar um arquivo existente (onboarding e Settings). Schemas Zod cobrem todas as entidades (`User`, `Settings`, `Account`, `Category`, `Tag`, `Transaction`, `AuditEntry`) e seus campos internos, incluindo enums de tipo. Arquivos com estrutura inválida, campos ausentes ou valores fora do enum são rejeitados com feedback visual ao usuário. A função `validateDataFile` é a única porta de entrada para dados externos. Gap corrigido: `handleImport` em Settings agora valida antes de gravar no IDB, protegendo o banco de dados local contra sobrescrita com dados corrompidos.
* **F-18:** Conflict Sync — ao clicar em sync, o app lê o `File.lastModified` do arquivo em disco e compara com o timestamp registrado após o último write da sessão (`_lastWrittenModified`). Se o arquivo foi modificado externamente (por outro dispositivo, cloud sync ou edição manual), exibe um modal de conflito com duas opções: "Sobrescrever arquivo" (mantém dados locais, descarta disco) ou "Carregar do arquivo" (descarta local, carrega disco). Nenhum dado é perdido sem escolha explícita do usuário. Não há conflito na primeira sync da sessão (sem baseline ainda) nem quando o arquivo não foi tocado desde o último write.
* **F-19:** Lost File Sync — quando a File System Access API lança `NotFoundError` (arquivo deletado, movido ou volume desmontado), o app detecta o erro no próximo sync, sinaliza o ícone de sync em vermelho com badge `!` e exibe tooltip explicativo. Um segundo clique no ícone de sync abre o file picker para o usuário re-associar um arquivo existente ou criar um novo, restaurando o fluxo normal de sincronização. O app continua funcional entre os dois cliques (dados locais preservados no IndexedDB).

### Fora do Escopo (Out of Scope - Futuro)
* **X-1:** Criptografia do arquivo JSON de dados.
* **X-2:** Sincronização automatizada via Open-Banking de extratos.
* **X-3:** Plataforma mobile nativa submetida as Lojas de Apps.
* **X-4:** Login de servidor online via senhas e banco em nuvem / Modo partilhado e Rateio de despesas em grupo.
* **X-5:** Backup do Audit Log em arquivo separado (`audit.json`): mover as entradas do `auditLog` para fora do `data.json`, mantendo o ledger financeiro enxuto e delegando o histórico de modificações a um arquivo dedicado, importável e exportável de forma independente.

## 6. Modelo de Dados e Arquitetura

Para preservar a arquitetura, utilizaremos **dois arquivos distintos:**
1. **App Configs (`workspace.json`):** Usado para armazenar o estado visual do aplicativo para o usuário no seu navegador ativo: Tema Escuro/Claro, preferência de idioma e visualizações padrão salvas, garantindo que o arquivo principal de dados fique limpo (Nota: *Não* utilizaremos o LocalStorage do navegador para isso, mas o arquivo fixo gerido pela State API local do PWA).
2. **Ledger Financeiro (`data.json`):** O arquivo portátil que será salvo localmente e que possui o verdadeiro banco de dados relacional. Abaixo seu esquema lógico de entidades:

```json
{
  "user": {
    "name": "String",
    "email": "String",
    "createdAt": "ISO_Date",
    "updatedAt": "ISO_Date"
  },
  "settings": {
    "fileCreatedAt": "ISO_Date",
    "fileUpdatedAt": "ISO_Date",
    "auditLogRetentionLimit": "Integer | null (null = ilimitado, opt-in)"
  },
  "accounts": [
    {
      "id": "UUID",
      "name": "String",
      "type": "Enum(RETAIL, SAVINGS, CREDIT, CRYPTO, FOREX, ASSET, STOCKS, OTHER)",
      "balance": "Float",
      "includeInBalance": "Boolean (default: true)"
    }
  ],
  "categories": [
    {
      "id": "UUID",
      "parentId": "UUID | null",
      "name": "String",
      "icon": "String",
      "color": "String",
      "type": "Enum(INCOME, EXPENSE)"
    }
  ],
  "tags": [
    {
      "id": "UUID",
      "name": "String",
      "color": "String"
    }
  ],
  "transactions": [
    {
      "id": "UUID",
      "accountId": "UUID",
      "categoryId": "UUID",
      "amount": "Float",
      "type": "Enum(INCOME, EXPENSE, TRANSFER)",
      "date": "ISO_Date",
      "description": "String",
      "isPaid": "Boolean",
      "tags": ["[UUID]"]
    }
  ],
  "auditLog": [
    {
      "id": "UUID",
      "timestamp": "ISO_Date",
      "action": "Enum(CREATE, UPDATE, DELETE)",
      "entity": "Enum(account, category, tag, transaction, user)",
      "entityId": "UUID",
      "summary": "String (descrição legível gerada no momento da mutação)"
    }
  ]
}
```

## 7. Requisitos Não Funcionais (NFRs)
* **Arquitetura PWA/Static:** Sistema operando em Javascript puro sem processamento Next.js API Routes no Cloud.
* **Internacionalização (i18n):** A aplicação deve suportar setup multi-idiomas desde o dia 1 de construção.
* **Performance Visual:** Renderizações sem spinners ou delays nas buscas das querys internas para os gráficos (Usar In-Memory State tipado).
* **UI/UX Moderno:** Design voltado fortemente à navegação responsiva mobile-first, paleta premium. O usuário espera a qualidade de experiência de benchmarks do mercado.

## 8. Critérios de Aceitação (Gherkin Style)
* **Cenário:** Projeção correta do painel e fluxo de caixa de longo prazo.
  * *Dado que* o usuário acessa o Painel Avançado de ±3 meses.
  * *Quando* ele possuir títulos grandes de despesas não-pagas para os próximos 60 dias.
  * *Então* o gráfico de barras exibirá esses impactos negativos de passivos nas colunas de projeção dos meses/semanas futuras corretamente e abaterá do saldo.

## 9. Riscos e Premissas
* **Risco (UX de Sync manual):** O uso intercalado exigirá que o usuário hospede seu "banco" num local como iCloud Folders ou GDrive e dê permissão para a aplicação mapear.
* **Risco (File API Access limits):** Se os browsers móveis restringirem a API (File System Access), o fallback (Ação de exportar/importar) pode ser a única saída.

## 10. Perguntas em Aberto
*(Nenhuma pergunta pendente no momento)*
