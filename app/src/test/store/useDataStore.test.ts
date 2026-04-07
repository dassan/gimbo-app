import { describe, it, expect, beforeEach } from 'vitest'
import { useDataStore } from '@/store/useDataStore'
import { makeDataFile } from '../fixtures/dataFile'
import type { Account, Category, Tag, Transaction } from '@/types'

function makeAccount(overrides: Partial<Account> = {}): Account {
  return { id: 'acc-1', name: 'Checking', type: 'CHECKING', balance: 0, ...overrides }
}

function makeCategory(overrides: Partial<Category> = {}): Category {
  return { id: 'cat-1', parentId: null, name: 'Food', icon: 'utensils', color: '#FF0000', type: 'EXPENSE', ...overrides }
}

function makeTag(overrides: Partial<Tag> = {}): Tag {
  return { id: 'tag-1', name: 'urgent', color: '#FF0000', ...overrides }
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1', accountId: 'acc-1', categoryId: 'cat-1', amount: 100, type: 'EXPENSE',
    date: new Date().toISOString().slice(0, 10), description: 'Test', isPaid: true, tags: [],
    ...overrides,
  }
}

beforeEach(() => {
  useDataStore.setState({ data: null, unsyncedCount: 0 })
})

describe('mutate guard', () => {
  it('returns no state change when data is null', () => {
    useDataStore.getState().addAccount(makeAccount())
    expect(useDataStore.getState().data).toBeNull()
    expect(useDataStore.getState().unsyncedCount).toBe(0)
  })
})

describe('addAccount', () => {
  it('appends account and increments unsyncedCount', () => {
    useDataStore.setState({ data: makeDataFile(), unsyncedCount: 0 })
    useDataStore.getState().addAccount(makeAccount({ id: 'acc-1', name: 'Conta Corrente' }))
    const { data, unsyncedCount } = useDataStore.getState()
    expect(data?.accounts).toHaveLength(1)
    expect(data?.accounts[0].name).toBe('Conta Corrente')
    expect(unsyncedCount).toBe(1)
  })

  it('creates a CREATE audit entry', () => {
    useDataStore.setState({ data: makeDataFile(), unsyncedCount: 0 })
    useDataStore.getState().addAccount(makeAccount({ id: 'acc-1' }))
    const log = useDataStore.getState().data?.auditLog ?? []
    expect(log.some((e) => e.action === 'CREATE' && e.entityId === 'acc-1')).toBe(true)
  })
})

describe('deleteAccount', () => {
  it('removes account and creates DELETE audit entry', () => {
    useDataStore.setState({ data: makeDataFile({ accounts: [makeAccount({ id: 'acc-1' })] }) })
    useDataStore.getState().deleteAccount('acc-1')
    const { data } = useDataStore.getState()
    expect(data?.accounts).toHaveLength(0)
    expect(data?.auditLog.some((e) => e.action === 'DELETE' && e.entityId === 'acc-1')).toBe(true)
  })

  it('does not throw when deleting a non-existent id', () => {
    useDataStore.setState({ data: makeDataFile() })
    expect(() => useDataStore.getState().deleteAccount('ghost-id')).not.toThrow()
  })
})

describe('updateAccount', () => {
  it('updates existing account', () => {
    const acc = makeAccount({ id: 'acc-1', name: 'Old Name' })
    useDataStore.setState({ data: makeDataFile({ accounts: [acc] }) })
    useDataStore.getState().updateAccount({ ...acc, name: 'New Name' })
    expect(useDataStore.getState().data?.accounts[0].name).toBe('New Name')
  })

  it('does not crash on non-existent account', () => {
    useDataStore.setState({ data: makeDataFile() })
    expect(() => useDataStore.getState().updateAccount(makeAccount({ id: 'ghost' }))).not.toThrow()
  })
})

describe('categories', () => {
  it('addCategory appends and creates audit entry', () => {
    useDataStore.setState({ data: makeDataFile(), unsyncedCount: 0 })
    useDataStore.getState().addCategory(makeCategory({ id: 'cat-1' }))
    expect(useDataStore.getState().data?.categories).toHaveLength(1)
    expect(useDataStore.getState().data?.auditLog.some((e) => e.action === 'CREATE' && e.entityId === 'cat-1')).toBe(true)
  })

  it('updateCategory changes the category', () => {
    useDataStore.setState({ data: makeDataFile({ categories: [makeCategory({ id: 'cat-1', name: 'Old' })] }) })
    useDataStore.getState().updateCategory(makeCategory({ id: 'cat-1', name: 'New' }))
    expect(useDataStore.getState().data?.categories[0].name).toBe('New')
  })

  it('deleteCategory removes it', () => {
    useDataStore.setState({ data: makeDataFile({ categories: [makeCategory({ id: 'cat-1' })] }) })
    useDataStore.getState().deleteCategory('cat-1')
    expect(useDataStore.getState().data?.categories).toHaveLength(0)
  })
})

describe('tags', () => {
  it('addTag appends and creates audit entry', () => {
    useDataStore.setState({ data: makeDataFile(), unsyncedCount: 0 })
    useDataStore.getState().addTag(makeTag({ id: 'tag-1' }))
    expect(useDataStore.getState().data?.tags).toHaveLength(1)
    expect(useDataStore.getState().data?.auditLog.some((e) => e.action === 'CREATE' && e.entityId === 'tag-1')).toBe(true)
  })

  it('deleteTag removes it', () => {
    useDataStore.setState({ data: makeDataFile({ tags: [makeTag({ id: 'tag-1' })] }) })
    useDataStore.getState().deleteTag('tag-1')
    expect(useDataStore.getState().data?.tags).toHaveLength(0)
  })

  it('updateTag changes the tag name', () => {
    useDataStore.setState({ data: makeDataFile({ tags: [makeTag({ id: 'tag-1', name: 'old' })] }) })
    useDataStore.getState().updateTag(makeTag({ id: 'tag-1', name: 'new' }))
    expect(useDataStore.getState().data?.tags[0].name).toBe('new')
  })
})

describe('transactions', () => {
  it('addTransaction appends and creates audit entry', () => {
    useDataStore.setState({ data: makeDataFile({ categories: [makeCategory()] }), unsyncedCount: 0 })
    useDataStore.getState().addTransaction(makeTransaction({ id: 'tx-1' }))
    expect(useDataStore.getState().data?.transactions).toHaveLength(1)
    expect(useDataStore.getState().data?.auditLog.some((e) => e.action === 'CREATE' && e.entityId === 'tx-1')).toBe(true)
  })

  it('updateTransaction changes data', () => {
    useDataStore.setState({ data: makeDataFile({ transactions: [makeTransaction({ id: 'tx-1', amount: 100 })] }) })
    useDataStore.getState().updateTransaction(makeTransaction({ id: 'tx-1', amount: 200 }))
    expect(useDataStore.getState().data?.transactions[0].amount).toBe(200)
  })

  it('deleteTransaction removes it', () => {
    useDataStore.setState({ data: makeDataFile({ transactions: [makeTransaction({ id: 'tx-1' })] }) })
    useDataStore.getState().deleteTransaction('tx-1')
    expect(useDataStore.getState().data?.transactions).toHaveLength(0)
  })
})

describe('updateUser', () => {
  it('patches user fields and creates audit entry', () => {
    useDataStore.setState({ data: makeDataFile() })
    useDataStore.getState().updateUser({ name: 'New Name' })
    expect(useDataStore.getState().data?.user.name).toBe('New Name')
    expect(useDataStore.getState().data?.auditLog.some((e) => e.action === 'UPDATE' && e.entity === 'user')).toBe(true)
  })
})

describe('loadData / clearData', () => {
  it('loadData sets data and resets unsyncedCount', () => {
    useDataStore.setState({ unsyncedCount: 5 })
    useDataStore.getState().loadData(makeDataFile())
    expect(useDataStore.getState().data).not.toBeNull()
    expect(useDataStore.getState().unsyncedCount).toBe(0)
  })

  it('clearData resets to null', () => {
    useDataStore.setState({ data: makeDataFile() })
    useDataStore.getState().clearData()
    expect(useDataStore.getState().data).toBeNull()
  })
})

describe('setRetentionLimit', () => {
  it('applies new limit and trims audit log', () => {
    const manyEntries = Array.from({ length: 10 }, (_, i) => ({
      id: `e-${i}`,
      timestamp: new Date().toISOString(),
      action: 'CREATE' as const,
      entity: 'account' as const,
      entityId: 'acc-1',
      summary: 'x',
    }))
    useDataStore.setState({ data: makeDataFile({ auditLog: manyEntries }) })
    useDataStore.getState().setRetentionLimit(3)
    expect(useDataStore.getState().data?.auditLog.length).toBeLessThanOrEqual(3)
  })

  it('preserves all entries when limit is null', () => {
    const manyEntries = Array.from({ length: 10 }, (_, i) => ({
      id: `e-${i}`,
      timestamp: new Date().toISOString(),
      action: 'CREATE' as const,
      entity: 'account' as const,
      entityId: 'acc-1',
      summary: 'x',
    }))
    useDataStore.setState({ data: makeDataFile({ auditLog: manyEntries }) })
    useDataStore.getState().setRetentionLimit(null)
    expect(useDataStore.getState().data?.auditLog).toHaveLength(10)
  })
})
