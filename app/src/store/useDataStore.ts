import { create } from 'zustand'
import type { DataFile, Account, Category, Tag, Transaction } from '@/types'
import { saveDataFile } from '@/lib/storage/fileSystem'
import { now } from '@/lib/utils'

interface DataStore {
  data: DataFile | null
  isDirty: boolean

  // Bootstrap
  loadData: (data: DataFile) => void
  clearData: () => void

  // Accounts
  addAccount: (account: Account) => void
  updateAccount: (account: Account) => void
  deleteAccount: (id: string) => void

  // Categories
  addCategory: (category: Category) => void
  updateCategory: (category: Category) => void
  deleteCategory: (id: string) => void

  // Tags
  addTag: (tag: Tag) => void
  updateTag: (tag: Tag) => void
  deleteTag: (id: string) => void

  // Transactions
  addTransaction: (tx: Transaction) => void
  updateTransaction: (tx: Transaction) => void
  deleteTransaction: (id: string) => void

  // Persistence
  persist: () => Promise<boolean>
}

export const useDataStore = create<DataStore>((set, get) => ({
  data: null,
  isDirty: false,

  loadData: (data) => set({ data, isDirty: false }),
  clearData: () => set({ data: null, isDirty: false }),

  addAccount: (account) => set((s) => mutate(s, (d) => { d.accounts.push(account) })),
  updateAccount: (account) => set((s) => mutate(s, (d) => {
    const i = d.accounts.findIndex((a) => a.id === account.id)
    if (i !== -1) d.accounts[i] = account
  })),
  deleteAccount: (id) => set((s) => mutate(s, (d) => {
    d.accounts = d.accounts.filter((a) => a.id !== id)
  })),

  addCategory: (category) => set((s) => mutate(s, (d) => { d.categories.push(category) })),
  updateCategory: (category) => set((s) => mutate(s, (d) => {
    const i = d.categories.findIndex((c) => c.id === category.id)
    if (i !== -1) d.categories[i] = category
  })),
  deleteCategory: (id) => set((s) => mutate(s, (d) => {
    d.categories = d.categories.filter((c) => c.id !== id)
  })),

  addTag: (tag) => set((s) => mutate(s, (d) => { d.tags.push(tag) })),
  updateTag: (tag) => set((s) => mutate(s, (d) => {
    const i = d.tags.findIndex((t) => t.id === tag.id)
    if (i !== -1) d.tags[i] = tag
  })),
  deleteTag: (id) => set((s) => mutate(s, (d) => {
    d.tags = d.tags.filter((t) => t.id !== id)
  })),

  addTransaction: (tx) => set((s) => mutate(s, (d) => { d.transactions.push(tx) })),
  updateTransaction: (tx) => set((s) => mutate(s, (d) => {
    const i = d.transactions.findIndex((t) => t.id === tx.id)
    if (i !== -1) d.transactions[i] = tx
  })),
  deleteTransaction: (id) => set((s) => mutate(s, (d) => {
    d.transactions = d.transactions.filter((t) => t.id !== id)
  })),

  persist: async () => {
    const { data } = get()
    if (!data) return false
    const updated = { ...data, settings: { ...data.settings, fileUpdatedAt: now() } }
    const ok = await saveDataFile(updated)
    if (ok) set({ isDirty: false })
    return ok
  },
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mutate(
  state: DataStore,
  fn: (data: DataFile) => void,
): Partial<DataStore> {
  if (!state.data) return {}
  const data = structuredClone(state.data)
  fn(data)
  return { data, isDirty: true }
}
