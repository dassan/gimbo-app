import { describe, it, expect } from 'vitest'
import {
  applyRetention,
  createEmptyDataFile,
  validateDataFile,
  AUDIT_RETENTION_DAYS,
} from '@/lib/storage/schema'
import type { AuditEntry, DataFile } from '@/types'

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
    const log = [makeEntry(AUDIT_RETENTION_DAYS + 1), ...Array.from({ length: 5 }, (_, i) => makeEntry(i))]
    const result = applyRetention(log, 3)
    expect(result).toHaveLength(3)
    expect(result.every((e) => !e.id.startsWith(`id-${AUDIT_RETENTION_DAYS + 1}`))).toBe(true)
  })
})

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
})

describe('validateDataFile', () => {
  it('accepts a valid DataFile object', () => {
    const valid: DataFile = {
      user: { name: 'x', email: '', createdAt: '', updatedAt: '' },
      settings: { fileCreatedAt: '', fileUpdatedAt: '', auditLogRetentionLimit: 200 },
      accounts: [],
      categories: [],
      tags: [],
      transactions: [],
      auditLog: [],
    }
    expect(() => validateDataFile(valid)).not.toThrow()
  })

  it('throws when root is not an object', () => {
    expect(() => validateDataFile('string')).toThrow('root must be an object')
    expect(() => validateDataFile(null)).toThrow('root must be an object')
    expect(() => validateDataFile([1, 2])).toThrow('root must be an object')
  })

  it('throws when required array fields are missing', () => {
    expect(() => validateDataFile({ user: {}, settings: {}, accounts: 'bad', categories: [], tags: [], transactions: [], auditLog: [] })).toThrow('"accounts" must be an array')
  })

  it('throws when user field is missing', () => {
    expect(() => validateDataFile({ accounts: [], categories: [], tags: [], transactions: [], auditLog: [], settings: {} })).toThrow('missing "user"')
  })
})
