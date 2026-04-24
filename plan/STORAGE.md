# Gimbo — Decisões Estratégicas de Storage

> **Documento gerado em:** 2026-04-22  
> **Contexto:** Discussão estratégica conduzida na interface web (claude.ai) para registro e continuidade no Claude Code.

---

## 1. Ponto de Partida: A Tensão Central

O Gimbo foi concebido como um app **local-first, privacy-focused**, usando **File System Access API (FSA) + IndexedDB** para manter os dados do usuário fora de qualquer serviço externo.

A discussão girou em torno de uma tensão real de produto:

> *A arquitetura atual é tecnicamente correta, mas cria fricção de adoção que limita o público a usuários tech.*

### Problemas identificados com o modelo FSA + JSON atual

- O usuário precisa entender o que é um arquivo JSON e por que ele importa
- FSA **não existe no Safari iOS nem no Firefox mobile** — os browsers mais usados em mobile
- Não há resposta satisfatória para "como acesso no celular?"
- Limpar cache do browser apaga o IndexedDB, mesmo que o arquivo JSON ainda exista
- Backup é responsabilidade do usuário — a maioria esquece
- JSON como dump completo do estado: qualquer alteração reescreve o arquivo inteiro
- Sem transações atômicas — uma escrita interrompida pode corromper tudo
- Sem migrations de schema controladas

---

## 2. Definição de Público-Alvo e Fluxo de Uso

### Público-alvo

Usuários preocupados com privacidade. Nicho por natureza, mas **heterogêneo em nível técnico**:
- Alguns são power-users e desenvolvedores
- Outros são leigos confortáveis com tecnologia do dia a dia (Google Drive, Dropbox), mas sem conhecimento avançado

O app deve ser **agradável para o perfil leigo** dentro desse nicho.

### Fluxo de uso esperado

```
Mobile (lançamento de transações) ←→ Web/PC (análises e relatórios)
```

Multi-device **não é um nice-to-have** — é o fluxo primário de uso.

---

## 3. Decisão Arquitetural: Avançar na Arquitetura de Storage Primeiro

### Justificativa

Features financeiras numa plataforma que não funciona no celular têm valor limitado. O fluxo primário (lançar no mobile → analisar no PC) está quebrado hoje. Adicionar budget/metas antes de resolver isso seria construir em cima de uma fundação incompleta.

### Princípio central adotado

> O problema não é privacidade — é complexidade operacional. A solução é tornar o backend de sync plugável.

### Modelo de criptografia adotado

```
[Device] → [Web Crypto API AES-256-GCM] → [Blob criptografado] → [Drive / Dropbox / WebDAV]
```

**Comunicação para o usuário leigo:** *"seus dados ficam no seu Google Drive, criptografados com uma senha que só você tem."*

O servidor (Drive ou Dropbox) vê apenas **blobs opacos** — nunca os dados em plaintext. Modelo similar ao Standard Notes e Obsidian Sync.

---

## 4. Decisão de Formato: SQLite WASM em vez de JSON

### Por que abandonar JSON

| Critério | JSON (atual) | SQLite WASM |
|---|---|---|
| Tolerância a falhas | ❌ Corrupção por escrita interrompida | ✅ Transações ACID |
| Performance com volume | ❌ Carrega tudo na memória | ✅ Queries sob demanda |
| Compatibilidade com OPFS | ✅ | ✅ |
| Portabilidade do arquivo | ✅ | ✅ (`.sqlite` é padrão aberto) |
| Migrations de schema | ❌ | ✅ via `PRAGMA user_version` |
| Integração com sync (blob) | ✅ | ✅ (mesma lógica, formato interno diferente) |

### Por que SQLite WASM e não outras alternativas

- **JSON melhorado (atomic write + checksum):** resolve corrupção, mas não resolve performance, migrations nem queries eficientes. Remedia sem evoluir.
- **Event Sourcing / CRDTs:** robusto para sync distribuído, mas complexidade desproporcional para uso pessoal/familiar neste momento.
- **SQLite WASM:** battle-tested, suporte nativo a OPFS, zero dependência de servidor, arquivo `.sqlite` é portátil e auditável.

---

## 5. Arquitetura da Camada de Persistência

### Fluxo completo

```
App (React)
    ↓ chamadas via StorageService
StorageService (abstração — interface tipada)
    ↓ postMessage
Worker Thread (SQLite WASM)
    ↓ persiste em
OPFS (Origin Private File System)
    ↓ exporta como blob
CryptoService (AES-256-GCM + PBKDF2)
    ↓ blob criptografado
SyncService → GoogleDriveAdapter | DropboxAdapter
```

### Por que SQLite roda em um Web Worker

SQLite WASM é síncrono e operações de I/O no OPFS bloqueiam a thread. Rodar no main thread travaria a UI. O Worker isola esse processamento. A biblioteca `wa-sqlite` tem suporte nativo a esse padrão com OPFS Shared Access.

### Estrutura de módulos

```
src/
  services/
    storage/
      worker.ts              ← instancia SQLite, expõe comandos via postMessage
      StorageService.ts      ← API pública consumida pelo app (abstração do worker)
      migrations/
        v1.sql               ← schema inicial (migrado do JSON atual)
        v2.sql               ← futuras alterações de schema
    crypto/
      CryptoService.ts       ← AES-256-GCM, derivação de chave via PBKDF2
    sync/
      SyncService.ts         ← interface comum (adapter pattern)
      adapters/
        GoogleDriveAdapter.ts
        DropboxAdapter.ts
```

### StorageService — API pública

O restante do app **nunca fala diretamente com SQLite**. Ele consome uma interface tipada. Isso garante que trocar o mecanismo de storage no futuro não impacte o app.

```typescript
interface StorageService {
  // Transações
  getTransactions(filters?: TransactionFilters): Promise<Transaction[]>
  createTransaction(data: CreateTransactionDTO): Promise<Transaction>
  updateTransaction(id: string, data: UpdateTransactionDTO): Promise<Transaction>
  deleteTransaction(id: string): Promise<void>

  // Contas
  getAccounts(): Promise<Account[]>
  createAccount(data: CreateAccountDTO): Promise<Account>

  // Categorias
  getCategories(): Promise<Category[]>

  // Utilitários de storage
  exportBlob(): Promise<Blob>           // para sync e backup manual
  importBlob(blob: Blob): Promise<void> // restore ou onboarding em novo device
  getDatabaseVersion(): Promise<number>
}
```

---

## 6. Schema Inicial (v1)

Mapeado a partir da estrutura do JSON atual. A coluna `metadata TEXT` em transactions é intencional — permite campos extras futuros sem migration imediata.

```sql
-- migrations/v1.sql

CREATE TABLE accounts (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,  -- 'checking' | 'savings' | 'credit_card'
  currency    TEXT NOT NULL DEFAULT 'BRL',
  balance     REAL NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,  -- 'income' | 'expense'
  color       TEXT,
  icon        TEXT,
  parent_id   TEXT REFERENCES categories(id),
  created_at  TEXT NOT NULL
);

CREATE TABLE transactions (
  id            TEXT PRIMARY KEY,
  account_id    TEXT NOT NULL REFERENCES accounts(id),
  category_id   TEXT REFERENCES categories(id),
  amount        REAL NOT NULL,
  type          TEXT NOT NULL,  -- 'income' | 'expense' | 'transfer'
  description   TEXT,
  date          TEXT NOT NULL,  -- ISO 8601
  is_recurring  INTEGER NOT NULL DEFAULT 0,
  metadata      TEXT,           -- JSON para campos extras sem quebrar schema
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX idx_transactions_date     ON transactions(date);
CREATE INDEX idx_transactions_account  ON transactions(account_id);
CREATE INDEX idx_transactions_category ON transactions(category_id);

CREATE TABLE credit_card_invoices (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id),
  due_date    TEXT NOT NULL,
  close_date  TEXT NOT NULL,
  status      TEXT NOT NULL,  -- 'open' | 'closed' | 'paid'
  created_at  TEXT NOT NULL
);

PRAGMA user_version = 1;
```

### Sistema de migrations

```typescript
// worker.ts (simplificado)
const CURRENT_VERSION = 1

async function runMigrations(db: SQLiteDB) {
  const { version } = await db.get('PRAGMA user_version')

  if (version < 1) {
    await db.exec(await fetch('/migrations/v1.sql').then(r => r.text()))
    await db.run('PRAGMA user_version = 1')
  }
  // Futuro: if (version < 2) { ... }
}
```

---

## 7. Integração com Sync (Fase 2)

O ponto de integração é o mesmo independentemente do formato interno. O sync sempre opera sobre um blob opaco criptografado:

```typescript
// Exportar para sync
const blob      = await storageService.exportBlob()       // dump do .sqlite
const encrypted = await cryptoService.encrypt(blob)       // AES-256-GCM
await syncAdapter.upload(encrypted)                       // Drive ou Dropbox

// Importar (restore ou novo device)
const encrypted = await syncAdapter.download()
const blob      = await cryptoService.decrypt(encrypted)
await storageService.importBlob(blob)                     // substitui DB local
```

---

## 8. Migração dos Dados Legados (JSON → SQLite)

Para usuários com dados no formato JSON atual, rodar na primeira inicialização ao detectar dados legados no IndexedDB:

```typescript
async function migrateFromJSON(jsonData: LegacyData) {
  for (const account of jsonData.accounts) {
    await db.run('INSERT INTO accounts VALUES (?)', [mapAccount(account)])
  }
  for (const transaction of jsonData.transactions) {
    await db.run('INSERT INTO transactions VALUES (?)', [mapTransaction(transaction)])
  }
  await db.run('PRAGMA user_version = 1')
  // Limpar IDB legado após migração confirmada
}
```

---

## 9. Plano de Execução em Fases

### Fase 1 — Fundação (desbloqueia mobile)

- [ ] Instalar e configurar `wa-sqlite` com backend OPFS
- [ ] Implementar `worker.ts` (SQLite no Web Worker)
- [ ] Implementar `StorageService.ts` (interface tipada sobre o worker)
- [ ] Criar `migrations/v1.sql` com schema mapeado do JSON atual
- [ ] Implementar `CryptoService.ts` — AES-256-GCM + PBKDF2 (item X-1 do backlog)
- [ ] Implementar migração automática JSON → SQLite para usuários existentes
- [ ] Remover dependência de FSA do fluxo principal; manter Export como ação explícita de backup

**UX resultante:** o app abre e os dados já estão lá. Onboarding vira:
1. Acesse o app
2. Crie uma senha mestra
3. Pronto

> ⚠️ OPFS tem o mesmo risco do IndexedDB — limpar dados do browser apaga tudo. A Fase 2 é o que torna esse modelo confiável a longo prazo.

### Fase 2 — Sync E2EE

- [ ] Integração Google Drive API (OAuth + upload/download do blob criptografado)
- [ ] Integração Dropbox API (mesmo contrato, adapter diferente)

### Fase 3 — UX do Sync

- [ ] Detecção de conflito com UI clara (*"versão do celular é mais recente — qual usar?"*)
- [ ] Indicador de status de sync (sincronizado / pendente / erro)
- [ ] Suporte a WebDAV/Nextcloud como opção adicional para power-users

### Fase 4 — Features Financeiras (retomar backlog)

Com fundação sólida: Budget mensal, Metas financeiras, Recorrências automáticas, etc.

---

## 10. Próximo Passo Imediato

Mapear no código do projeto os pontos de alteração para a Fase 1:

1. Identificar todos os pontos onde FSA é utilizado hoje
2. Identificar onde o JSON é lido/escrito (módulo de persistência atual)
3. Mapear tipos/interfaces existentes para validar compatibilidade com o schema v1
4. Definir estratégia de coexistência durante a migração (feature flag ou hard cutover)

**Ação:** abrir o repositório no Claude Code e iniciar o mapeamento técnico.
