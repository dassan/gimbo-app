# Sincronização Local: IndexedDB ↔ File System (JSON)

Como o Gimbo possui uma premissa **100% offline e local**, a arquitetura de armazenamento depende de dois pilares:
1. **IndexedDB:** Armazenamento primário, de altíssima performance para consultas e modificações, que faz o app ser "instantâneo".
2. **File System Access API (Arquivo JSON):** O "Single Source of Truth" (Fonte da Verdade) tangível para o usuário, permitindo o backup via nuvem (Google Drive, Dropbox) e controle total dos dados.

Abaixo estão os cenários de orquestração para garantir a resiliência dos dados e uma experiência de usuário sem frustrações.

---

## 1. O Usuário "Zero" (Cold Start)
**Contexto:** Primeira vez que o usuário abre o aplicativo no navegador. O IndexedDB está vazio e não há permissão para nenhum arquivo.
**Fluxo Ideal:**
- O app exibe a tela de Setup/Onboarding.
- Oferece duas opções: **"Criar novo controle financeiro"** ou **"Abrir arquivo existente"**.
- **Se "Criar novo":** O app pede permissão para salvar um novo arquivo `data.json` no computador. Ao conceder, inicializa a estrutura básica no IndexedDB e faz o primeiro "flush" (escrita) para o disco. [Comentário do Fábio]: O arquivo pode ter um nome diferente de data.json, o usuário pode escolher o nome do arquivo. Considerar isso no planejamento.
- **Se "Abrir existente":** O sistema abre o File Picker.

## 2. O Usuário Retornando de Outro Dispositivo (Hydration)
**Contexto:** O IndexedDB está vazio (usuário limpou o cache ou trocou de PC), mas ele possui o `data.json` salvo.
**Fluxo Ideal:**
- O usuário clica em "Abrir arquivo existente" e seleciona o `data.json`.
- O app lê o arquivo, valida o *schema* (Zod), e hidrata completamente o IndexedDB.
- A aplicação inteira é renderizada instantaneamente a partir daí.

## 3. O "Caminho Feliz" (Sessões Recorrentes)
**Contexto:** O usuário usa o app frequentemente no mesmo navegador. O IndexedDB tem dados e o navegador possui o *handle* (referência) do arquivo.
**Fluxo Ideal:**
- Como permissões do *File System Access API* expiram (especialmente quando a aba é fechada), o IndexedDB assume o papel principal: **o app carrega imediatamente** com os dados do IndexedDB, não deixando o usuário esperando.
- Em segundo plano, o app detecta que perdeu a permissão silenciosa de escrita no arquivo. Ele exibe um banner ou ícone discreto: *"Clique aqui para sincronizar com o seu arquivo"*. [Comentário do Fábio]: este ícone já existe, é um círculo com duas setas. Ele fica no canto superior direito da tela. Ele serve para indicar quantas ações precisam ser sincronizadas com o arquivo. Talvez seja interessante adicionar um "tooltip" para explicar o que ele significa.
- Ao clicar, o navegador mostra um popup rápido pedindo permissão de escrita. Todos os dados alterados no IndexedDB são então descarregados (*flushed*) para o JSON. [Comentário do Fábio]: Qual será o comportamento desse flush? Iremos sobrescrever o arquivo original, ou criar alguma lógica para realizar o "merge" adequado? Meu receio é de sobrescrever, porém não existirem todos os dados no IndexedDB (Perda de dados)

## 4. O Sistema de Nuvem Modificou o Arquivo (Conflito Externo)
**Contexto:** O usuário usa o app no PC do trabalho e no PC de casa, sincronizando o `data.json` via Google Drive. Ele modificou dados no PC de casa. Ao abrir no trabalho, o IndexedDB local é mais antigo.
**Fluxo Ideal:**
- O app ganha a permissão de leitura do arquivo.
- Verifica-se a data de modificação (`lastModified`) do arquivo no disco e do estado salvo no IndexedDB.
- **Detecção:** O arquivo no disco é mais novo.
- **Resolução:** Se o IndexedDB local *não tem* alterações pendentes, o app se atualiza automaticamente com os dados do arquivo. Se o IndexedDB local *tem* alterações não salvas que conflitariam com o arquivo, exibe-se um modal de resolução:
   > *"O seu arquivo data.json foi atualizado externamente. Você deseja carregar as novas modificações (descartando as alterações locais não salvas) ou sobrescrever o arquivo com os dados desta tela?"* [Comentário do Fábio]: esta abordagem é ótima, mas parece complexa. Conto com sua ajuda.

## 5. Arquivo Movido ou Apagado pelo Usuário
**Contexto:** O IndexedDB tem todos os dados recentes, mas, ao tentar fazer o backup para o arquivo, o sistema operacional informa que o `data.json` sumiu ou foi renomeado.
**Fluxo Ideal:**
- O aplicativo continua funcionando perfeitamente, usando o IndexedDB. O usuário não perde nada que acabou de digitar.
- O ícone de sincronização fica vermelho/alerta. Ao clicar, a mensagem explica: *"Não conseguimos encontrar o arquivo original. Ele pode ter sido movido ou excluído. Escolha um novo local para salvar."*
- O app reabre o prompt do sistema para o usuário salvar um novo arquivo.

## 6. Arquivo Corrompido
**Contexto:** O usuário modificou o JSON num editor de texto e quebrou a sintaxe, ou o sync do Dropbox mesclou conflitos erroneamente.
**Fluxo Ideal:**
- O app tenta ler o JSON (seja via importação ou ao iniciar) e o `JSON.parse` falha.
- **Proteção Crítica:** O aplicativo rejeita o arquivo categoricamente para evitar corromper o IndexedDB. Exibe-se o banner: *"O arquivo data.json parece corrompido ou inválido. O aplicativo está rodando com seus dados locais guardados recentemente."* (e oferece um botão para exportar um JSON fresco a partir do IndexedDB para consertar o estrago).

## 7. Versionamento e Migração de Dados (Upgrade Schema)
**Contexto:** O usuário importa um `data.json` da v1.0. Mas atualmente o app está na v2.0 (exemplo referenciado no item M-01 do seu `BACKLOG.md`).
**Fluxo Ideal:**
- Ao importar o arquivo, o aplicativo detecta o `version: 1` no JSON, mas o app espera `version: 2`.
- O código intercepta os dados, passa por funções de migração que preenchem novos campos exigidos na versão mais recente, insere no IndexedDB, atualiza a chave global de versão e já força a re-escrita (*flush*) do JSON com a nova versão atualizada.
- A experiência para o usuário é invisível e segura; ele apenas sabe que os dados carregaram com sucesso.

## 8. Múltiplas Abas Abertas Simultaneamente
**Contexto:** O usuário abre o app em duas abas do mesmo browser. Ambas leem do IndexedDB e podem gravar mutações de forma concorrente.
**Risco:** As duas abas competem para escrever no IndexedDB e fazer flush para o mesmo arquivo JSON. A segunda aba pode sobrescrever mutações da primeira, corrompendo silenciosamente o `auditLog` e o estado das entidades.
**Fluxo Ideal:**
- O app detecta que já existe uma aba ativa (via `BroadcastChannel` ou `localStorage` com timestamp de "liveness").
- A segunda aba exibe um banner de aviso: *"O Gimbo já está aberto em outra aba. Para evitar conflitos de dados, use apenas uma aba por vez."*
- A segunda aba pode operar em modo leitura (sem botão de save) ou simplesmente bloquear toda mutação até a outra aba ser fechada.

## 9. Re-solicitação de Permissão do FileHandle (Sessão Recorrente)
**Contexto:** O usuário retorna ao app após fechar o browser. O FileHandle foi salvo no IndexedDB (M-07), mas a File System Access API expira permissões de escrita quando o browser é fechado — mesmo com o handle armazenado.
**Fluxo Ideal:**
- Ao iniciar, o app recupera o FileHandle do IndexedDB e chama `handle.queryPermission({ mode: 'readwrite' })`.
- **Se `'granted'`:** Usa o handle diretamente, sem interação do usuário.
- **Se `'prompt'`:** O app carrega normalmente do IndexedDB (sem bloquear a UI), e o ícone de sync exibe estado "aguardando permissão". Ao primeiro clique do usuário no ícone, chama `handle.requestPermission({ mode: 'readwrite' })` — o browser exibe o popup nativo e, se aprovado, faz o flush imediato.
- **Se `'denied'`:** Trata igual ao Cenário 5 (arquivo perdido/inacessível).

## 10. Falha de Escrita Durante o Sync (Disco Cheio / Permissão Revogada)
**Contexto:** O usuário clica no ícone de sync, a permissão é concedida, mas a escrita no arquivo falha a meio caminho (disco cheio, antivírus bloqueou, permissão de SO foi revogada externamente).
**Risco:** O `unsyncedCount` seria zerado incorretamente, dando ao usuário a falsa impressão de que os dados foram salvos.
**Fluxo Ideal:**
- O app envolve toda a operação de escrita num bloco `try/catch`.
- **Em caso de erro:** O `unsyncedCount` **não** é decrementado. O ícone de sync exibe estado de erro (vermelho). Um toast visível informa: *"Falha ao salvar o arquivo. Verifique o espaço em disco e tente novamente."*
- O IndexedDB permanece íntegro. O usuário pode tentar novamente sem perda de dados.

## 11. Quota do IndexedDB Excedida
**Contexto:** O browser recusa escritas no IndexedDB com `QuotaExceededError` — mais comum em mobile com armazenamento limitado ou após uso prolongado com retenção ilimitada do audit log.
**Risco:** Mutações do usuário são perdidas silenciosamente; o auto-save simplesmente falha sem qualquer feedback.
**Fluxo Ideal:**
- O auto-save detecta o `QuotaExceededError` no `catch` do write no IDB.
- Exibe um banner persistente (não um toast): *"Armazenamento local cheio. Exporte seus dados agora para evitar perda de informações."* com botão de exportação direta.
- Sugere ao usuário limpar o histórico do audit log (se a retenção ilimitada estiver ativa) nas Configurações.

## 12. Semântica de Import vs. Sync (Replace vs. Merge)
**Contexto:** Existem dois fluxos distintos de leitura de arquivo que não devem ser confundidos, pois têm comportamentos opostos em relação ao estado local.
**Definições:**
- **Import (Onboarding / M-08):** Operação destrutiva e intencional. O arquivo JSON substitui completamente o IndexedDB. Usado quando o usuário chega a um dispositivo novo sem dados locais. Não há risco de perda porque o IDB está vazio ou o usuário explicitamente escolheu "carregar da nuvem".
- **Sync — Read-Before-Write (M-09):** Operação não-destrutiva. Antes de fazer o flush do IDB para o arquivo, o app lê o arquivo atual, compara entidade a entidade por UUID, faz merge em memória, e só então escreve o JSON resultante. Garante que dados inseridos em outro dispositivo (e sincronizados via cloud drive) não sejam perdidos.
**Fluxo Ideal:**
- O código deve ter dois caminhos explicitamente separados: `importFileToIdb(file)` (replace) e `syncIdbToFile(handle)` (merge + write).
- Nunca chamar `importFileToIdb` durante uma operação de sync em sessão recorrente.

## 13. Browser Sem Suporte à File System Access API (Modo Fallback)
**Contexto:** Firefox e Safari não suportam `showSaveFilePicker` / `showOpenFilePicker`. O app deve funcionar plenamente nestes browsers, sacrificando apenas a conveniência do sync automático com um arquivo fixo.
**Fluxo Ideal:**
- **Detecção:** Ao iniciar, o app verifica `'showSaveFilePicker' in window`.
- **Se não suportado:** O conceito de FileHandle e `unsyncedCount` não existe. O app opera 100% via IndexedDB.
- **Export:** Substituído por `<a href={objectUrl} download="data.json">` — gera um download toda vez.
- **Import:** Substituído por `<input type="file" accept=".json">` — o usuário seleciona o arquivo manualmente.
- **UI:** O ícone de sync na Navbar é ocultado ou substituído por botões explícitos de "Exportar" e "Importar" num banner ou nas Configurações. O usuário é informado na primeira vez que o modo de sync automático não está disponível no seu browser.

## 14. Persistência do `unsyncedCount` Entre Recarregamentos de Página
**Contexto:** O `unsyncedCount` vive atualmente apenas em memória no Zustand. Se o usuário recarregar a página após fazer mutações sem sincronizar, o badge volta a zero — dando a impressão falsa de que os dados estão salvos.
**Fluxo Ideal:**
- O `unsyncedCount` (ou um campo `lastSyncedAt: ISO_Date`) deve ser persistido no IndexedDB junto com os dados.
- Ao hidratar o store no startup, o app recalcula ou recupera o número de mutações pendentes desde o último sync bem-sucedido.
- O badge na Navbar reflete corretamente o estado real mesmo após um reload.

---

### Resumo do Comportamento Alvo
*   **A UI sempre conversa com o IndexedDB** (Rápido, Reativo).
*   **O File System é apenas o "Storage Secundário/Backup Ciente"**.
*   Escrevemos no JSON de forma otimizada (via *debounce*), para não sobrecarregar testes de disco a cada letra que o usuário digita no formulário.
