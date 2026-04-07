import type { DataFile, WorkspaceFile } from '@/types'
import { uuid, now } from '@/lib/utils'

export const AUDIT_RETENTION_DEFAULT = 200
export const AUDIT_RETENTION_DAYS = 90

export function createEmptyDataFile(name: string, email: string): DataFile {
  const ts = now()
  return {
    user: { name, email, createdAt: ts, updatedAt: ts },
    settings: {
      fileCreatedAt: ts,
      fileUpdatedAt: ts,
      auditLogRetentionLimit: AUDIT_RETENTION_DEFAULT,
    },
    accounts: [],
    categories: getDefaultCategories(),
    tags: [],
    transactions: [],
    auditLog: [],
  }
}

export function createDefaultWorkspace(): WorkspaceFile {
  return {
    theme: 'system',
    locale: 'pt-BR',
    defaultView: 'dashboard',
  }
}

function getDefaultCategories() {
  return [
    {
      id: uuid(),
      parentId: null,
      name: 'Salário',
      icon: 'briefcase',
      color: '#22C55E',
      type: 'INCOME' as const,
    },
    {
      id: uuid(),
      parentId: null,
      name: 'Freelance',
      icon: 'laptop',
      color: '#22C55E',
      type: 'INCOME' as const,
    },
    {
      id: uuid(),
      parentId: null,
      name: 'Alimentação',
      icon: 'utensils',
      color: '#FF8A83',
      type: 'EXPENSE' as const,
    },
    {
      id: uuid(),
      parentId: null,
      name: 'Transporte',
      icon: 'car',
      color: '#FF8A83',
      type: 'EXPENSE' as const,
    },
    {
      id: uuid(),
      parentId: null,
      name: 'Saúde',
      icon: 'heart-pulse',
      color: '#FF8A83',
      type: 'EXPENSE' as const,
    },
    {
      id: uuid(),
      parentId: null,
      name: 'Lazer',
      icon: 'smile',
      color: '#FF8A83',
      type: 'EXPENSE' as const,
    },
    {
      id: uuid(),
      parentId: null,
      name: 'Moradia',
      icon: 'home',
      color: '#FF8A83',
      type: 'EXPENSE' as const,
    },
  ]
}

/** Validate and cast an unknown JSON payload as DataFile. Throws with a descriptive message if invalid. */
export function validateDataFile(data: unknown): DataFile {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('Invalid data file: root must be an object')
  }
  const d = data as Record<string, unknown>
  if (typeof d['user'] !== 'object' || d['user'] === null)
    throw new Error('Invalid data file: missing "user"')
  if (!Array.isArray(d['accounts']))
    throw new Error('Invalid data file: "accounts" must be an array')
  if (!Array.isArray(d['categories']))
    throw new Error('Invalid data file: "categories" must be an array')
  if (!Array.isArray(d['tags'])) throw new Error('Invalid data file: "tags" must be an array')
  if (!Array.isArray(d['transactions']))
    throw new Error('Invalid data file: "transactions" must be an array')
  if (!Array.isArray(d['auditLog']))
    throw new Error('Invalid data file: "auditLog" must be an array')
  if (typeof d['settings'] !== 'object' || d['settings'] === null)
    throw new Error('Invalid data file: missing "settings"')
  return data as DataFile
}

/** Apply retention policy to the audit log in-place. */
export function applyRetention(
  log: DataFile['auditLog'],
  limit: number | null
): DataFile['auditLog'] {
  if (limit === null) return log // unlimited opt-in

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - AUDIT_RETENTION_DAYS)

  const withinWindow = log.filter((e) => new Date(e.timestamp) >= cutoff)
  return withinWindow.slice(-limit)
}
