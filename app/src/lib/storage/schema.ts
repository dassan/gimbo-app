import type { DataFile, WorkspaceFile } from '@/types'
import { uuid, now } from '@/lib/utils'

export function createEmptyDataFile(name: string, email: string): DataFile {
  const ts = now()
  return {
    user: { name, email, createdAt: ts, updatedAt: ts },
    settings: { fileCreatedAt: ts, fileUpdatedAt: ts },
    accounts: [],
    categories: getDefaultCategories(),
    tags: [],
    transactions: [],
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
    // Income
    { id: uuid(), parentId: null, name: 'Salário', icon: 'briefcase', color: '#22C55E', type: 'INCOME' as const },
    { id: uuid(), parentId: null, name: 'Freelance', icon: 'laptop', color: '#22C55E', type: 'INCOME' as const },
    // Expense
    { id: uuid(), parentId: null, name: 'Alimentação', icon: 'utensils', color: '#FF8A83', type: 'EXPENSE' as const },
    { id: uuid(), parentId: null, name: 'Transporte', icon: 'car', color: '#FF8A83', type: 'EXPENSE' as const },
    { id: uuid(), parentId: null, name: 'Saúde', icon: 'heart-pulse', color: '#FF8A83', type: 'EXPENSE' as const },
    { id: uuid(), parentId: null, name: 'Lazer', icon: 'smile', color: '#FF8A83', type: 'EXPENSE' as const },
    { id: uuid(), parentId: null, name: 'Moradia', icon: 'home', color: '#FF8A83', type: 'EXPENSE' as const },
  ]
}
