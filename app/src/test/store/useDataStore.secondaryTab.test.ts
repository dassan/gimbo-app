import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDataStore } from '@/store/useDataStore'
import { makeDataFile } from '../fixtures/dataFile'
import type { Transaction } from '@/types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/storage/indexedDb', () => ({ saveToIdb: vi.fn(), saveSyncMeta: vi.fn() }))
vi.mock('@/lib/storage/fileSystem', () => ({
  saveDataFile: vi.fn(),
  readCurrentDataFile: vi.fn().mockResolvedValue(null),
  getLastWrittenModified: vi.fn().mockReturnValue(null),
  isHandleLost: vi.fn().mockReturnValue(false),
  isPermissionNeeded: vi.fn().mockReturnValue(false),
  requestHandlePermission: vi.fn(),
}))
vi.mock('@/lib/storage/sync', () => ({ syncToFile: vi.fn() }))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    accountId: 'acc-1',
    categoryId: 'cat-1',
    amount: 100,
    type: 'EXPENSE',
    date: '2024-01-01',
    description: 'Test',
    isPaid: true,
    tags: [],
    ...overrides,
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useDataStore.setState({ data: makeDataFile(), unsyncedCount: 0, isSecondaryTab: false })
  vi.clearAllMocks()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useDataStore — secondary tab mutation guard (M-13)', () => {
  it('blocks addTransaction when isSecondaryTab is true', () => {
    useDataStore.setState({ isSecondaryTab: true })
    const before = useDataStore.getState().data!.transactions.length

    useDataStore.getState().addTransaction(makeTx())

    expect(useDataStore.getState().data!.transactions).toHaveLength(before)
    expect(useDataStore.getState().unsyncedCount).toBe(0)
  })

  it('does not increment unsyncedCount on any mutation when isSecondaryTab is true', () => {
    useDataStore.setState({ isSecondaryTab: true })

    useDataStore.getState().addTransaction(makeTx())
    useDataStore.getState().deleteTransaction('tx-1')

    expect(useDataStore.getState().unsyncedCount).toBe(0)
  })

  it('allows addTransaction when isSecondaryTab is false', () => {
    const before = useDataStore.getState().data!.transactions.length

    useDataStore.getState().addTransaction(makeTx())

    expect(useDataStore.getState().data!.transactions).toHaveLength(before + 1)
    expect(useDataStore.getState().unsyncedCount).toBe(1)
  })

  it('persist() returns false immediately when isSecondaryTab is true', async () => {
    useDataStore.setState({ isSecondaryTab: true })

    const result = await useDataStore.getState().persist()

    expect(result).toBe(false)
  })
})
