import { describe, it, expect, beforeEach } from 'vitest'
import { useDataStore } from '@/store/useDataStore'
import { makeDataFile } from '../fixtures/dataFile'
import type { Account, Category, Tag, Transaction, CreditMetadata } from '@/types'

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
    date: new Date().toISOString().slice(0, 10),
    description: 'Test',
    isPaid: true,
    tags: [],
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
    expect(
      useDataStore
        .getState()
        .data?.auditLog.some((e) => e.action === 'CREATE' && e.entityId === 'cat-1')
    ).toBe(true)
  })

  it('updateCategory changes the category', () => {
    useDataStore.setState({
      data: makeDataFile({ categories: [makeCategory({ id: 'cat-1', name: 'Old' })] }),
    })
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
    expect(
      useDataStore
        .getState()
        .data?.auditLog.some((e) => e.action === 'CREATE' && e.entityId === 'tag-1')
    ).toBe(true)
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
    useDataStore.setState({
      data: makeDataFile({ categories: [makeCategory()] }),
      unsyncedCount: 0,
    })
    useDataStore.getState().addTransaction(makeTransaction({ id: 'tx-1' }))
    expect(useDataStore.getState().data?.transactions).toHaveLength(1)
    expect(
      useDataStore
        .getState()
        .data?.auditLog.some((e) => e.action === 'CREATE' && e.entityId === 'tx-1')
    ).toBe(true)
  })

  it('updateTransaction changes data', () => {
    useDataStore.setState({
      data: makeDataFile({ transactions: [makeTransaction({ id: 'tx-1', amount: 100 })] }),
    })
    useDataStore.getState().updateTransaction(makeTransaction({ id: 'tx-1', amount: 200 }))
    expect(useDataStore.getState().data?.transactions[0].amount).toBe(200)
  })

  it('deleteTransaction removes it', () => {
    useDataStore.setState({
      data: makeDataFile({ transactions: [makeTransaction({ id: 'tx-1' })] }),
    })
    useDataStore.getState().deleteTransaction('tx-1')
    expect(useDataStore.getState().data?.transactions).toHaveLength(0)
  })
})

describe('updateUser', () => {
  it('patches user fields and creates audit entry', () => {
    useDataStore.setState({ data: makeDataFile() })
    useDataStore.getState().updateUser({ name: 'New Name' })
    expect(useDataStore.getState().data?.user.name).toBe('New Name')
    expect(
      useDataStore
        .getState()
        .data?.auditLog.some((e) => e.action === 'UPDATE' && e.entity === 'user')
    ).toBe(true)
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

describe('creditMetadata handling (CC-12)', () => {
  const creditMeta: CreditMetadata = { limit: 5000, closingDay: 10, dueDay: 25 }

  it('addAccount with CREDIT type persists creditMetadata', () => {
    useDataStore.setState({ data: makeDataFile() })
    const creditAccount = makeAccount({
      id: 'acc-credit',
      type: 'CREDIT',
      creditMetadata: creditMeta,
    })
    useDataStore.getState().addAccount(creditAccount)
    const saved = useDataStore.getState().data?.accounts[0]
    expect(saved?.creditMetadata).toEqual(creditMeta)
  })

  it('updateAccount with CREDIT type updates creditMetadata', () => {
    const creditAccount = makeAccount({
      id: 'acc-credit',
      type: 'CREDIT',
      creditMetadata: creditMeta,
    })
    useDataStore.setState({ data: makeDataFile({ accounts: [creditAccount] }) })
    const updated: CreditMetadata = { limit: 10000, closingDay: 15, dueDay: 5 }
    useDataStore.getState().updateAccount({ ...creditAccount, creditMetadata: updated })
    const saved = useDataStore.getState().data?.accounts[0]
    expect(saved?.creditMetadata).toEqual(updated)
  })

  it('addAccount with non-CREDIT type does not include creditMetadata', () => {
    useDataStore.setState({ data: makeDataFile() })
    // Simulate a stale account object that erroneously carries creditMetadata
    const staleAccount = makeAccount({
      id: 'acc-retail',
      type: 'RETAIL',
      creditMetadata: creditMeta,
    })
    useDataStore.getState().addAccount(staleAccount)
    const saved = useDataStore.getState().data?.accounts[0]
    expect(saved?.creditMetadata).toBeUndefined()
    expect(Object.prototype.hasOwnProperty.call(saved, 'creditMetadata')).toBe(false)
  })

  it('updateAccount changing type away from CREDIT strips creditMetadata', () => {
    const creditAccount = makeAccount({ id: 'acc-1', type: 'CREDIT', creditMetadata: creditMeta })
    useDataStore.setState({ data: makeDataFile({ accounts: [creditAccount] }) })
    useDataStore
      .getState()
      .updateAccount({ ...creditAccount, type: 'SAVINGS', creditMetadata: creditMeta })
    const saved = useDataStore.getState().data?.accounts[0]
    expect(saved?.type).toBe('SAVINGS')
    expect(saved?.creditMetadata).toBeUndefined()
  })
})

describe('CREDIT_PAYMENT handling (CC-21)', () => {
  function makeCreditAccount() {
    return {
      id: 'acc-credit',
      name: 'Nubank Visa',
      type: 'CREDIT' as const,
      balance: 0,
      includeInBalance: false,
      creditMetadata: { limit: 5000, closingDay: 20, dueDay: 10 },
    }
  }

  function makeCheckingAccount() {
    return {
      id: 'acc-checking',
      name: 'Conta Corrente',
      type: 'RETAIL' as const,
      balance: 0,
      includeInBalance: true,
    }
  }

  it('addTransaction persists CREDIT_PAYMENT with transferAccountId', () => {
    const credit = makeCreditAccount()
    const checking = makeCheckingAccount()
    useDataStore.setState({
      data: makeDataFile({ accounts: [credit, checking] }),
      unsyncedCount: 0,
    })

    const tx: import('@/types').Transaction = {
      id: 'tx-cp',
      accountId: credit.id,
      categoryId: '',
      amount: 1200,
      type: 'CREDIT_PAYMENT',
      date: new Date().toISOString().slice(0, 10),
      description: 'Pagamento fatura',
      isPaid: true,
      tags: [],
      transferAccountId: checking.id,
    }
    useDataStore.getState().addTransaction(tx)

    const saved = useDataStore.getState().data?.transactions[0]
    expect(saved?.type).toBe('CREDIT_PAYMENT')
    expect(saved?.accountId).toBe(credit.id)
    expect(saved?.transferAccountId).toBe(checking.id)
  })

  it('addTransaction generates descriptive audit log for CREDIT_PAYMENT', () => {
    const credit = makeCreditAccount()
    const checking = makeCheckingAccount()
    useDataStore.setState({
      data: makeDataFile({ accounts: [credit, checking] }),
      unsyncedCount: 0,
    })

    const tx: import('@/types').Transaction = {
      id: 'tx-cp',
      accountId: credit.id,
      categoryId: '',
      amount: 500,
      type: 'CREDIT_PAYMENT',
      date: new Date().toISOString().slice(0, 10),
      description: '',
      isPaid: true,
      tags: [],
      transferAccountId: checking.id,
    }
    useDataStore.getState().addTransaction(tx)

    const entry = useDataStore.getState().data?.auditLog.find((e) => e.entityId === 'tx-cp')
    expect(entry).toBeDefined()
    expect(entry?.summary).toContain('Pagamento de fatura')
    expect(entry?.summary).toContain(credit.name)
    expect(entry?.summary).toContain(checking.name)
  })

  it('regular addTransaction still generates standard audit log', () => {
    const checking = makeCheckingAccount()
    const cat = {
      id: 'cat-1',
      parentId: null,
      name: 'Mercado',
      icon: 'cart',
      color: '#F00',
      type: 'EXPENSE' as const,
    }
    useDataStore.setState({
      data: makeDataFile({ accounts: [checking], categories: [cat] }),
      unsyncedCount: 0,
    })

    const tx: import('@/types').Transaction = {
      id: 'tx-exp',
      accountId: checking.id,
      categoryId: cat.id,
      amount: 100,
      type: 'EXPENSE',
      date: new Date().toISOString().slice(0, 10),
      description: 'Feira',
      isPaid: true,
      tags: [],
    }
    useDataStore.getState().addTransaction(tx)

    const entry = useDataStore.getState().data?.auditLog.find((e) => e.entityId === 'tx-exp')
    expect(entry?.summary).toContain('Feira')
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
