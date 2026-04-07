import type { DataFile } from '@/types'

export function makeDataFile(overrides: Partial<DataFile> = {}): DataFile {
  return {
    user: {
      name: 'Test User',
      email: 'test@example.com',
      createdAt: '2024-01-01T00:00:00',
      updatedAt: '2024-01-01T00:00:00',
    },
    settings: {
      fileCreatedAt: '2024-01-01T00:00:00',
      fileUpdatedAt: '2024-01-01T00:00:00',
      auditLogRetentionLimit: 200,
    },
    accounts: [],
    categories: [],
    tags: [],
    transactions: [],
    auditLog: [],
    ...overrides,
  }
}
