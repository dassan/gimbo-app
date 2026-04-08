import { describe, it, expect } from 'vitest'
import { mergeDataFiles } from '@/lib/storage/merge'
import { makeDataFile } from '@/test/fixtures/dataFile'
import type { Account, AuditEntry, Category, Tag, Transaction } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-1',
    name: 'Checking',
    type: 'RETAIL',
    balance: 0,
    includeInBalance: true,
    ...overrides,
  }
}

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    parentId: null,
    name: 'Food',
    icon: 'utensils',
    color: '#FF0000',
    type: 'EXPENSE',
    ...overrides,
  }
}

function makeTag(overrides: Partial<Tag> = {}): Tag {
  return { id: 'tag-1', name: 'urgent', color: '#FF0000', ...overrides }
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    accountId: 'acc-1',
    categoryId: 'cat-1',
    amount: 100,
    type: 'EXPENSE',
    date: '2024-01-15',
    description: 'Test',
    isPaid: true,
    tags: [],
    ...overrides,
  }
}

function makeAuditEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 'au-1',
    timestamp: new Date().toISOString(),
    action: 'CREATE',
    entity: 'account',
    entityId: 'acc-1',
    summary: 'Created account',
    ...overrides,
  }
}

// ─── user ─────────────────────────────────────────────────────────────────────

describe('mergeDataFiles — user', () => {
  it('keeps the local user', () => {
    const local = makeDataFile({
      user: { name: 'Local User', email: 'local@x.com', createdAt: '', updatedAt: '' },
    })
    const disk = makeDataFile({
      user: { name: 'Disk User', email: 'disk@x.com', createdAt: '', updatedAt: '' },
    })
    const result = mergeDataFiles(local, disk)
    expect(result.user.name).toBe('Local User')
  })
})

// ─── settings ─────────────────────────────────────────────────────────────────

describe('mergeDataFiles — settings', () => {
  it('keeps local settings fields', () => {
    const local = makeDataFile({
      settings: {
        fileCreatedAt: '2024-01-01',
        fileUpdatedAt: '2024-06-01',
        auditLogRetentionLimit: 100,
      },
    })
    const disk = makeDataFile({
      settings: {
        fileCreatedAt: '2023-01-01',
        fileUpdatedAt: '2023-12-01',
        auditLogRetentionLimit: 200,
      },
    })
    const result = mergeDataFiles(local, disk)
    expect(result.settings.fileUpdatedAt).toBe('2024-06-01')
    expect(result.settings.auditLogRetentionLimit).toBe(100)
  })

  it('preserves fileCreatedAt from disk', () => {
    const local = makeDataFile({
      settings: { fileCreatedAt: '2024-01-01', fileUpdatedAt: '', auditLogRetentionLimit: 200 },
    })
    const disk = makeDataFile({
      settings: { fileCreatedAt: '2023-05-20', fileUpdatedAt: '', auditLogRetentionLimit: 200 },
    })
    const result = mergeDataFiles(local, disk)
    expect(result.settings.fileCreatedAt).toBe('2023-05-20')
  })
})

// ─── accounts ─────────────────────────────────────────────────────────────────

describe('mergeDataFiles — accounts', () => {
  it('keeps local-only accounts', () => {
    const local = makeDataFile({ accounts: [makeAccount({ id: 'acc-local' })] })
    const result = mergeDataFiles(local, makeDataFile())
    expect(result.accounts.map((a) => a.id)).toContain('acc-local')
  })

  it('adds disk-only accounts not present in local', () => {
    const disk = makeDataFile({ accounts: [makeAccount({ id: 'acc-disk' })] })
    const result = mergeDataFiles(makeDataFile(), disk)
    expect(result.accounts.map((a) => a.id)).toContain('acc-disk')
  })

  it('local item wins when same id exists in both', () => {
    const local = makeDataFile({ accounts: [makeAccount({ id: 'acc-1', name: 'Local Name' })] })
    const disk = makeDataFile({ accounts: [makeAccount({ id: 'acc-1', name: 'Disk Name' })] })
    const result = mergeDataFiles(local, disk)
    expect(result.accounts).toHaveLength(1)
    expect(result.accounts[0].name).toBe('Local Name')
  })

  it('union contains items from both when ids differ', () => {
    const local = makeDataFile({ accounts: [makeAccount({ id: 'acc-local' })] })
    const disk = makeDataFile({ accounts: [makeAccount({ id: 'acc-disk' })] })
    const result = mergeDataFiles(local, disk)
    expect(result.accounts).toHaveLength(2)
  })
})

// ─── categories ───────────────────────────────────────────────────────────────

describe('mergeDataFiles — categories', () => {
  it('adds disk-only categories', () => {
    const disk = makeDataFile({ categories: [makeCategory({ id: 'cat-disk' })] })
    const result = mergeDataFiles(makeDataFile(), disk)
    expect(result.categories.map((c) => c.id)).toContain('cat-disk')
  })

  it('local wins for duplicate ids', () => {
    const local = makeDataFile({ categories: [makeCategory({ id: 'cat-1', name: 'Local Cat' })] })
    const disk = makeDataFile({ categories: [makeCategory({ id: 'cat-1', name: 'Disk Cat' })] })
    expect(mergeDataFiles(local, disk).categories[0].name).toBe('Local Cat')
  })
})

// ─── tags ─────────────────────────────────────────────────────────────────────

describe('mergeDataFiles — tags', () => {
  it('adds disk-only tags', () => {
    const disk = makeDataFile({ tags: [makeTag({ id: 'tag-disk' })] })
    expect(mergeDataFiles(makeDataFile(), disk).tags.map((t) => t.id)).toContain('tag-disk')
  })

  it('local wins for duplicate ids', () => {
    const local = makeDataFile({ tags: [makeTag({ id: 'tag-1', name: 'Local Tag' })] })
    const disk = makeDataFile({ tags: [makeTag({ id: 'tag-1', name: 'Disk Tag' })] })
    expect(mergeDataFiles(local, disk).tags[0].name).toBe('Local Tag')
  })
})

// ─── transactions ─────────────────────────────────────────────────────────────

describe('mergeDataFiles — transactions', () => {
  it('adds disk-only transactions', () => {
    const disk = makeDataFile({ transactions: [makeTransaction({ id: 'tx-disk' })] })
    expect(mergeDataFiles(makeDataFile(), disk).transactions.map((t) => t.id)).toContain('tx-disk')
  })

  it('local wins for duplicate ids', () => {
    const local = makeDataFile({
      transactions: [makeTransaction({ id: 'tx-1', description: 'Local Tx' })],
    })
    const disk = makeDataFile({
      transactions: [makeTransaction({ id: 'tx-1', description: 'Disk Tx' })],
    })
    expect(mergeDataFiles(local, disk).transactions[0].description).toBe('Local Tx')
  })
})

// ─── auditLog ─────────────────────────────────────────────────────────────────

describe('mergeDataFiles — auditLog', () => {
  it('deduplicates by id, keeping each entry once', () => {
    const entry = makeAuditEntry({ id: 'au-shared' })
    const local = makeDataFile({ auditLog: [entry] })
    const disk = makeDataFile({ auditLog: [entry] })
    expect(mergeDataFiles(local, disk).auditLog).toHaveLength(1)
  })

  it('adds disk-only audit entries', () => {
    const diskEntry = makeAuditEntry({ id: 'au-disk' })
    const disk = makeDataFile({ auditLog: [diskEntry] })
    expect(mergeDataFiles(makeDataFile(), disk).auditLog.map((e) => e.id)).toContain('au-disk')
  })

  it('keeps local-only audit entries', () => {
    const localEntry = makeAuditEntry({ id: 'au-local' })
    const local = makeDataFile({ auditLog: [localEntry] })
    expect(mergeDataFiles(local, makeDataFile()).auditLog.map((e) => e.id)).toContain('au-local')
  })

  it('sorts merged log ascending by timestamp', () => {
    const now = Date.now()
    const early = new Date(now - 2 * 86400_000).toISOString() // 2 days ago
    const late = new Date(now - 1 * 86400_000).toISOString() // 1 day ago
    const local = makeDataFile({
      auditLog: [makeAuditEntry({ id: 'au-late', timestamp: late })],
    })
    const disk = makeDataFile({
      auditLog: [makeAuditEntry({ id: 'au-early', timestamp: early })],
    })
    const result = mergeDataFiles(local, disk)
    expect(result.auditLog[0].id).toBe('au-early')
    expect(result.auditLog[1].id).toBe('au-late')
  })

  it('applies retention limit from local settings', () => {
    const now = Date.now()
    const localEntries = Array.from({ length: 5 }, (_, i) =>
      makeAuditEntry({
        id: `au-local-${i}`,
        timestamp: new Date(now - i * 86400_000).toISOString(), // recent days
      })
    )
    const local = makeDataFile({
      settings: { fileCreatedAt: '', fileUpdatedAt: '', auditLogRetentionLimit: 3 },
      auditLog: localEntries,
    })
    const result = mergeDataFiles(local, makeDataFile())
    expect(result.auditLog.length).toBeLessThanOrEqual(3)
  })
})

// ─── idempotency ──────────────────────────────────────────────────────────────

describe('mergeDataFiles — idempotency', () => {
  it('merging identical DataFiles returns equivalent result', () => {
    const file = makeDataFile({
      accounts: [makeAccount()],
      tags: [makeTag()],
      auditLog: [makeAuditEntry()],
    })
    const result = mergeDataFiles(file, file)
    expect(result.accounts).toHaveLength(1)
    expect(result.tags).toHaveLength(1)
    expect(result.auditLog).toHaveLength(1)
  })
})
