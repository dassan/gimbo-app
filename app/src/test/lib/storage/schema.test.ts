import { describe, it, expect } from 'vitest'
import {
  applyRetention,
  createEmptyDataFile,
  validateDataFile,
  DataFileSchema,
  AUDIT_RETENTION_DAYS,
} from '@/lib/storage/schema'
import type { AuditEntry, DataFile } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEntry(daysAgo: number): AuditEntry {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return {
    id: `id-${daysAgo}`,
    timestamp: d.toISOString(),
    action: 'CREATE',
    entity: 'account',
    entityId: 'acc-1',
    summary: 'test',
  }
}

const MINIMAL_VALID: DataFile = {
  user: { name: 'x', email: '', createdAt: '', updatedAt: '' },
  settings: { fileCreatedAt: '', fileUpdatedAt: '', auditLogRetentionLimit: 200 },
  accounts: [],
  categories: [],
  tags: [],
  transactions: [],
  auditLog: [],
}

// ─── applyRetention ───────────────────────────────────────────────────────────

describe('applyRetention', () => {
  it('returns log unchanged when limit is null (unlimited)', () => {
    const log = [makeEntry(200), makeEntry(100), makeEntry(10)]
    expect(applyRetention(log, null)).toHaveLength(3)
  })

  it('filters entries older than AUDIT_RETENTION_DAYS', () => {
    const log = [makeEntry(AUDIT_RETENTION_DAYS + 1), makeEntry(10)]
    const result = applyRetention(log, 200)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('id-10')
  })

  it('slices to the last N entries when limit is exceeded', () => {
    const log = Array.from({ length: 10 }, (_, i) => makeEntry(i))
    const result = applyRetention(log, 3)
    expect(result).toHaveLength(3)
  })

  it('applies both date filter and limit together', () => {
    const log = [
      makeEntry(AUDIT_RETENTION_DAYS + 1),
      ...Array.from({ length: 5 }, (_, i) => makeEntry(i)),
    ]
    const result = applyRetention(log, 3)
    expect(result).toHaveLength(3)
    expect(result.every((e) => !e.id.startsWith(`id-${AUDIT_RETENTION_DAYS + 1}`))).toBe(true)
  })
})

// ─── createEmptyDataFile ──────────────────────────────────────────────────────

describe('createEmptyDataFile', () => {
  it('returns a valid DataFile shape', () => {
    const file = createEmptyDataFile('Ana', 'ana@example.com')
    expect(file.user.name).toBe('Ana')
    expect(file.user.email).toBe('ana@example.com')
    expect(Array.isArray(file.accounts)).toBe(true)
    expect(Array.isArray(file.transactions)).toBe(true)
    expect(Array.isArray(file.auditLog)).toBe(true)
    expect(typeof file.settings.auditLogRetentionLimit).toBe('number')
  })

  it('creates default categories', () => {
    const file = createEmptyDataFile('x', '')
    expect(file.categories.length).toBeGreaterThan(0)
  })

  it('produces a DataFile that passes Zod validation', () => {
    const file = createEmptyDataFile('Alice', 'alice@example.com')
    expect(() => DataFileSchema.parse(file)).not.toThrow()
  })

  it('starts with empty accounts, tags and transactions', () => {
    const file = createEmptyDataFile('Bob', '')
    expect(file.accounts).toHaveLength(0)
    expect(file.tags).toHaveLength(0)
    expect(file.transactions).toHaveLength(0)
  })

  it('pre-populates default categories that each pass the category schema', () => {
    const file = createEmptyDataFile('Charlie', '')
    expect(file.categories.length).toBeGreaterThan(0)
    for (const cat of file.categories) {
      expect(() => DataFileSchema.shape.categories.element.parse(cat)).not.toThrow()
    }
  })
})

// ─── validateDataFile ─────────────────────────────────────────────────────────

describe('validateDataFile', () => {
  it('accepts a valid DataFile object', () => {
    expect(() => validateDataFile(MINIMAL_VALID)).not.toThrow()
    expect(validateDataFile(MINIMAL_VALID)).toEqual(MINIMAL_VALID)
  })

  it('accepts a DataFile with full nested entities', () => {
    const data: DataFile = {
      ...MINIMAL_VALID,
      accounts: [
        { id: 'a1', name: 'Checking', type: 'RETAIL', balance: 1000, includeInBalance: true },
      ],
      categories: [
        {
          id: 'c1',
          parentId: null,
          name: 'Food',
          icon: 'utensils',
          color: '#FF8A83',
          type: 'EXPENSE',
        },
      ],
      tags: [{ id: 't1', name: 'urgent', color: '#FF0000' }],
      transactions: [
        {
          id: 'tx1',
          accountId: 'a1',
          categoryId: 'c1',
          amount: 50,
          type: 'EXPENSE',
          date: '2024-01-15',
          description: 'Lunch',
          isPaid: true,
          tags: ['t1'],
        },
      ],
      auditLog: [
        {
          id: 'au1',
          timestamp: '2024-01-15T12:00:00',
          action: 'CREATE',
          entity: 'transaction',
          entityId: 'tx1',
          summary: 'Created transaction Lunch',
        },
      ],
    }
    expect(() => validateDataFile(data)).not.toThrow()
  })

  it('accepts null auditLogRetentionLimit (unlimited opt-in)', () => {
    const data = {
      ...MINIMAL_VALID,
      settings: { ...MINIMAL_VALID.settings, auditLogRetentionLimit: null },
    }
    expect(() => validateDataFile(data)).not.toThrow()
  })

  it('throws when root is not an object', () => {
    expect(() => validateDataFile('string')).toThrow()
    expect(() => validateDataFile(null)).toThrow()
    expect(() => validateDataFile(42)).toThrow()
    expect(() => validateDataFile([1, 2])).toThrow()
  })

  it('throws when "user" field is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user: _user, ...rest } = MINIMAL_VALID
    expect(() => validateDataFile(rest)).toThrow()
  })

  it('throws when "accounts" is not an array', () => {
    expect(() => validateDataFile({ ...MINIMAL_VALID, accounts: 'bad' })).toThrow()
  })

  it('throws when "transactions" is not an array', () => {
    expect(() => validateDataFile({ ...MINIMAL_VALID, transactions: null })).toThrow()
  })

  it('throws when an account has an invalid type enum', () => {
    const data = {
      ...MINIMAL_VALID,
      accounts: [
        { id: 'a1', name: 'Bad', type: 'INVALID_TYPE', balance: 0, includeInBalance: false },
      ],
    }
    expect(() => validateDataFile(data)).toThrow()
  })

  it('throws when a transaction has an invalid type enum', () => {
    const data = {
      ...MINIMAL_VALID,
      transactions: [
        {
          id: 'tx1',
          accountId: 'a1',
          categoryId: 'c1',
          amount: 10,
          type: 'PAYMENT',
          date: '2024-01-01',
          description: 'x',
          isPaid: false,
          tags: [],
        },
      ],
    }
    expect(() => validateDataFile(data)).toThrow()
  })

  it('throws when an audit entry has an invalid action enum', () => {
    const data = {
      ...MINIMAL_VALID,
      auditLog: [
        {
          id: 'au1',
          timestamp: '2024-01-01T00:00:00',
          action: 'MODIFY',
          entity: 'account',
          entityId: 'a1',
          summary: 'test',
        },
      ],
    }
    expect(() => validateDataFile(data)).toThrow()
  })

  it('throws when auditLogRetentionLimit is a string instead of number or null', () => {
    const data = {
      ...MINIMAL_VALID,
      settings: { ...MINIMAL_VALID.settings, auditLogRetentionLimit: 'unlimited' },
    }
    expect(() => validateDataFile(data)).toThrow()
  })

  it('throws when a category type is invalid', () => {
    const data = {
      ...MINIMAL_VALID,
      categories: [
        { id: 'c1', parentId: null, name: 'X', icon: 'x', color: '#000', type: 'OTHER' },
      ],
    }
    expect(() => validateDataFile(data)).toThrow()
  })
})
