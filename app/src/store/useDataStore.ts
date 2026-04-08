import { create } from 'zustand'
import type {
  DataFile,
  Account,
  Category,
  Tag,
  Transaction,
  AuditEntry,
  AuditAction,
  AuditEntity,
} from '@/types'
import { saveDataFile } from '@/lib/storage/fileSystem'
import { saveToIdb } from '@/lib/storage/indexedDb'
import { applyRetention } from '@/lib/storage/schema'
import { uuid, now } from '@/lib/utils'

// ─── Debounce helper ──────────────────────────────────────────────────────────

let _idbTimer: ReturnType<typeof setTimeout> | null = null

function debouncedSaveToIdb(data: DataFile) {
  if (_idbTimer) clearTimeout(_idbTimer)
  _idbTimer = setTimeout(() => {
    void saveToIdb(data)
  }, 300)
}

// ─── Audit summary builders ───────────────────────────────────────────────────

function buildSummary(
  action: AuditAction,
  entity: AuditEntity,
  name: string,
  extra?: string
): string {
  const entityLabel: Record<AuditEntity, string> = {
    account: 'Conta',
    category: 'Categoria',
    tag: 'Tag',
    transaction: 'Transação',
    user: 'Perfil',
  }
  const actionLabel: Record<AuditAction, string> = {
    CREATE: 'criada',
    UPDATE: 'atualizada',
    DELETE: 'removida',
  }
  const label = `${entityLabel[entity]} ${actionLabel[action]}: ${name}`
  return extra ? `${label} — ${extra}` : label
}

function makeEntry(
  action: AuditAction,
  entity: AuditEntity,
  entityId: string,
  summary: string
): AuditEntry {
  return { id: uuid(), timestamp: now(), action, entity, entityId, summary }
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface DataStore {
  data: DataFile | null
  unsyncedCount: number

  loadData: (data: DataFile) => void
  clearData: () => void

  addAccount: (account: Account) => void
  updateAccount: (account: Account) => void
  deleteAccount: (id: string) => void

  addCategory: (category: Category) => void
  updateCategory: (category: Category) => void
  deleteCategory: (id: string) => void

  addTag: (tag: Tag) => void
  updateTag: (tag: Tag) => void
  deleteTag: (id: string) => void

  addTransaction: (tx: Transaction) => void
  updateTransaction: (tx: Transaction) => void
  deleteTransaction: (id: string) => void

  updateUser: (patch: Partial<DataFile['user']>) => void
  setRetentionLimit: (limit: number | null) => void

  persist: () => Promise<boolean>
}

export const useDataStore = create<DataStore>((set, get) => ({
  data: null,
  unsyncedCount: 0,

  loadData: (data) => set({ data, unsyncedCount: 0 }),
  clearData: () => set({ data: null, unsyncedCount: 0 }),

  // ── Accounts ──────────────────────────────────────────────────────────────

  addAccount: (account) =>
    set((s) =>
      mutate(s, (d) => {
        d.accounts.push(account)
        addAudit(
          d,
          makeEntry(
            'CREATE',
            'account',
            account.id,
            buildSummary('CREATE', 'account', account.name)
          )
        )
      })
    ),

  updateAccount: (account) =>
    set((s) =>
      mutate(s, (d) => {
        const i = d.accounts.findIndex((a) => a.id === account.id)
        if (i !== -1) d.accounts[i] = account
        addAudit(
          d,
          makeEntry(
            'UPDATE',
            'account',
            account.id,
            buildSummary('UPDATE', 'account', account.name)
          )
        )
      })
    ),

  deleteAccount: (id) =>
    set((s) =>
      mutate(s, (d) => {
        const name = d.accounts.find((a) => a.id === id)?.name ?? id
        d.accounts = d.accounts.filter((a) => a.id !== id)
        addAudit(d, makeEntry('DELETE', 'account', id, buildSummary('DELETE', 'account', name)))
      })
    ),

  // ── Categories ────────────────────────────────────────────────────────────

  addCategory: (category) =>
    set((s) =>
      mutate(s, (d) => {
        d.categories.push(category)
        addAudit(
          d,
          makeEntry(
            'CREATE',
            'category',
            category.id,
            buildSummary('CREATE', 'category', category.name)
          )
        )
      })
    ),

  updateCategory: (category) =>
    set((s) =>
      mutate(s, (d) => {
        const i = d.categories.findIndex((c) => c.id === category.id)
        if (i !== -1) d.categories[i] = category
        addAudit(
          d,
          makeEntry(
            'UPDATE',
            'category',
            category.id,
            buildSummary('UPDATE', 'category', category.name)
          )
        )
      })
    ),

  deleteCategory: (id) =>
    set((s) =>
      mutate(s, (d) => {
        const name = d.categories.find((c) => c.id === id)?.name ?? id
        d.categories = d.categories.filter((c) => c.id !== id)
        addAudit(d, makeEntry('DELETE', 'category', id, buildSummary('DELETE', 'category', name)))
      })
    ),

  // ── Tags ──────────────────────────────────────────────────────────────────

  addTag: (tag) =>
    set((s) =>
      mutate(s, (d) => {
        d.tags.push(tag)
        addAudit(
          d,
          makeEntry('CREATE', 'tag', tag.id, buildSummary('CREATE', 'tag', `#${tag.name}`))
        )
      })
    ),

  updateTag: (tag) =>
    set((s) =>
      mutate(s, (d) => {
        const i = d.tags.findIndex((t) => t.id === tag.id)
        if (i !== -1) d.tags[i] = tag
        addAudit(
          d,
          makeEntry('UPDATE', 'tag', tag.id, buildSummary('UPDATE', 'tag', `#${tag.name}`))
        )
      })
    ),

  deleteTag: (id) =>
    set((s) =>
      mutate(s, (d) => {
        const name = d.tags.find((t) => t.id === id)?.name ?? id
        d.tags = d.tags.filter((t) => t.id !== id)
        addAudit(d, makeEntry('DELETE', 'tag', id, buildSummary('DELETE', 'tag', `#${name}`)))
      })
    ),

  // ── Transactions ──────────────────────────────────────────────────────────

  addTransaction: (tx) =>
    set((s) =>
      mutate(s, (d) => {
        d.transactions.push(tx)
        const catName = d.categories.find((c) => c.id === tx.categoryId)?.name ?? ''
        const extra = `R$ ${tx.amount.toFixed(2).replace('.', ',')}${catName ? ` — ${catName}` : ''}`
        addAudit(
          d,
          makeEntry(
            'CREATE',
            'transaction',
            tx.id,
            buildSummary('CREATE', 'transaction', tx.description || catName, extra)
          )
        )
      })
    ),

  updateTransaction: (tx) =>
    set((s) =>
      mutate(s, (d) => {
        const i = d.transactions.findIndex((t) => t.id === tx.id)
        if (i !== -1) d.transactions[i] = tx
        const catName = d.categories.find((c) => c.id === tx.categoryId)?.name ?? ''
        addAudit(
          d,
          makeEntry(
            'UPDATE',
            'transaction',
            tx.id,
            buildSummary('UPDATE', 'transaction', tx.description || catName)
          )
        )
      })
    ),

  deleteTransaction: (id) =>
    set((s) =>
      mutate(s, (d) => {
        const tx = d.transactions.find((t) => t.id === id)
        const name =
          tx?.description ?? d.categories.find((c) => c.id === tx?.categoryId)?.name ?? id
        d.transactions = d.transactions.filter((t) => t.id !== id)
        addAudit(
          d,
          makeEntry('DELETE', 'transaction', id, buildSummary('DELETE', 'transaction', name))
        )
      })
    ),

  // ── User / Settings ───────────────────────────────────────────────────────

  updateUser: (patch) =>
    set((s) =>
      mutate(s, (d) => {
        d.user = { ...d.user, ...patch, updatedAt: now() }
        addAudit(
          d,
          makeEntry('UPDATE', 'user', 'user', buildSummary('UPDATE', 'user', d.user.name))
        )
      })
    ),

  setRetentionLimit: (limit) =>
    set((s) => {
      if (!s.data) return {}
      const data = structuredClone(s.data)
      data.settings.auditLogRetentionLimit = limit
      // Apply new policy immediately
      data.auditLog = applyRetention(data.auditLog, limit)
      debouncedSaveToIdb(data)
      return { data, unsyncedCount: s.unsyncedCount + 1 }
    }),

  // ── Persistence ───────────────────────────────────────────────────────────

  persist: async () => {
    const { data } = get()
    if (!data) return false
    const updated = { ...data, settings: { ...data.settings, fileUpdatedAt: now() } }
    const ok = await saveDataFile(updated)
    if (ok) set({ unsyncedCount: 0 })
    return ok
  },
}))

// ─── Internal helpers ─────────────────────────────────────────────────────────

function addAudit(data: DataFile, entry: AuditEntry) {
  data.auditLog.push(entry)
  data.auditLog = applyRetention(data.auditLog, data.settings.auditLogRetentionLimit)
}

function mutate(state: DataStore, fn: (data: DataFile) => void): Partial<DataStore> {
  if (!state.data) return {}
  const data = structuredClone(state.data)
  fn(data)
  debouncedSaveToIdb(data)
  return { data, unsyncedCount: state.unsyncedCount + 1 }
}
