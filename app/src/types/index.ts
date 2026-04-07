// ─── Enums ────────────────────────────────────────────────────────────────────

export type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD'
export type CategoryType = 'INCOME' | 'EXPENSE'
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER'

// ─── Entities ─────────────────────────────────────────────────────────────────

export interface User {
  name: string
  email: string
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

export interface Settings {
  fileCreatedAt: string // ISO 8601
  fileUpdatedAt: string // ISO 8601
}

export interface Account {
  id: string // UUID
  name: string
  type: AccountType
  balance: number
}

export interface Category {
  id: string       // UUID
  parentId: string | null
  name: string
  icon: string
  color: string
  type: CategoryType
}

export interface Tag {
  id: string // UUID
  name: string
  color: string
}

export interface Transaction {
  id: string // UUID
  accountId: string
  categoryId: string
  amount: number
  type: TransactionType
  date: string // ISO 8601
  description: string
  isPaid: boolean
  tags: string[] // UUID[]
}

// ─── Root data.json shape ─────────────────────────────────────────────────────

export interface DataFile {
  user: User
  settings: Settings
  accounts: Account[]
  categories: Category[]
  tags: Tag[]
  transactions: Transaction[]
}

// ─── workspace.json shape ─────────────────────────────────────────────────────

export type Theme = 'light' | 'dark' | 'system'
export type Locale = 'pt-BR' | 'en-US'

export interface WorkspaceFile {
  theme: Theme
  locale: Locale
  defaultView: string
}
