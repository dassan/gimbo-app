# Backlog

## Bugs

| ID   | Descrição                                                                 | Severidade | Status |
|------|---------------------------------------------------------------------------|------------|--------|
| B-01 | Tela de Relatórios: gráfico de projeção de fluxo de caixa não exibe dados | alta       | aberto |
| B-02 | Tela de Relatórios: gráfico de Receitas por Categoria não exibe dados     | alta       | aberto |
| B-03 | Tela de Relatórios: gráfico de Despesas por Categoria não exibe dados     | alta       | aberto |
| B-04 | Na página de Configurações, na aba Contas, o saldo de cada conta não está sendo calculado corretamente | alta       | aberto |

## Melhorias

| ID   | Descrição                                                                                                                                                  | Prioridade | Status    |
|------|------------------------------------------------------------------------------------------------------------------------------------------------------------|------------|-----------|
| M-01 | Versionar o arquivo `data.json` para validar compatibilidade ao alterar o modelo de dados                                                                  | média      | aberto    |
| M-02 | Tela de Lançamentos: ao clicar em uma transação, abrir o modal de criação com os dados pré-preenchidos para permitir edição ou remoção                     | alta       | aberto    |
| M-03 | Tela de Configurações > Contas: modal de criação e edição com nome, 8 tipos de conta (grid de ícones) e toggle "Incluir no saldo total"                    | alta       | resolvido |
| M-04 | Tela de Configurações > Categorias: modal de criação e edição com nome, icon picker (12 ícones Lucide), categoria-pai e toggle RECEITA/DESPESA             | alta       | resolvido |
| M-05 | Tela de Configurações > Tags: modal de criação e edição com nome e paleta de 8 cores de destaque                                                           | alta       | resolvido |
| M-06 | Tela de Configurações: permitir edição e remoção de contas, categorias e tags                                                                              | alta       | resolvido |
| M-07 | Sincronização (Cold Start): Tela de Setup com "Criar novo" (usando FilePicker flexível para nome do arquivo, ex: `.json`) ou "Abrir". Salvar FileHandle no IndexedDB. | crítica    | resolvido |
| M-08 | Sincronização (Hidratação): "Abrir existente" lê o arquivo, valida via Zod, popula 100% o IndexedDB (mesmo após limpeza de cache) e renderiza app sem loading. | crítica    | aberto    |
| M-09 | Sincronização (Read-Before-Write): Adicionar tooltip de "X alterações" no ícone de sync superior direito. Ao ganhar permissão para salvar, DEVE ler o arquivo da nuvem, fazer MERGE em memória usando UUIDs das entidades, e só então sobrescrever o JSON, evitando perda de dados por eviction do IndexedDB parcial. | crítica    | aberto    |
| M-10 | Sincronização (Conflitos): `SyncManager` interno detecta `lastModified` mais novo no arquivo. Exibir modal de conflito: "Arquivo externo mais recente. Sobrescrever com dados atuais ou carregar da nuvem (descarta edição atual)?" | crítica    | aberto    |
| M-11 | Sincronização (Arquivo Perdido): Tratar erro "NotFoundError" do File System Access. Manter app funcionando. Deixar ícone de sync vermelho/alerta. Clique reabre `showSaveFilePicker`. | alta       | aberto    |
| M-12 | Sincronização (Arquivos Corrompidos): Se JSON importado falhar no parse/Zod, rejeitar. Proteger os dados atuais no IndexedDB. Exibir botão "Exportar base local" para resgate de emergência. | alta       | aberto    |
| M-13 | Sincronização (Múltiplas Abas): Detectar se o app já está aberto em outra aba (via `BroadcastChannel`). Exibir banner de aviso e bloquear mutações na segunda aba para evitar conflitos de escrita no IndexedDB e no arquivo JSON. | alta       | aberto    |
| M-14 | Sincronização (Re-permissão do FileHandle): Ao retornar ao app, chamar `handle.queryPermission()` no handle salvo no IDB. Se `'granted'`, usar diretamente. Se `'prompt'`, carregar do IDB sem bloquear UI e solicitar permissão apenas no primeiro clique do usuário no ícone de sync. Se `'denied'`, tratar como M-11. | crítica    | aberto    |
| M-15 | Sincronização (Falha de Escrita): Envolver toda operação de flush em `try/catch`. Em caso de erro (disco cheio, permissão revogada pelo SO), não decrementar `unsyncedCount`, exibir toast de erro e manter o ícone de sync em estado de alerta. | alta       | aberto    |
| M-16 | Sincronização (Quota do IndexedDB): Capturar `QuotaExceededError` no auto-save do IDB. Exibir banner persistente de alerta com botão de exportação direta e sugestão de limpar o audit log nas Configurações. | alta       | aberto    |
| M-17 | Sincronização (Import vs. Sync — Semântica): Separar explicitamente dois caminhos no código: `importFileToIdb(file)` (replace total, usado no onboarding) e `syncIdbToFile(handle)` (merge por UUID + write, usado no sync recorrente). Nunca misturar os dois fluxos. | crítica    | aberto    |
| M-18 | Sincronização (Fallback sem File System Access API): Detectar ausência de `showSaveFilePicker` (Firefox/Safari). No modo fallback: ocultar ícone de sync da Navbar, substituir export por `<a download>` e import por `<input type="file">`, e informar o usuário na primeira sessão que o sync automático não está disponível no seu browser. | média      | aberto    |
| M-19 | Sincronização (Persistência do `unsyncedCount`): Persistir `unsyncedCount` ou `lastSyncedAt` no IndexedDB. Recalcular o badge ao hidratar o store no startup para que o número de alterações pendentes sobreviva a recarregamentos de página. | alta       | aberto    |
