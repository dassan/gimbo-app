import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useDataStore } from '@/store/useDataStore'
import { makeDataFile } from '@/test/fixtures/dataFile'

// ─── Module-level mocks (hoisted by Vitest) ───────────────────────────────────

vi.mock('@/lib/storage/fileSystem', () => ({
  saveDataFile: vi.fn(),
  readCurrentDataFile: vi.fn(),
  getLastWrittenModified: vi.fn(),
  isHandleLost: vi.fn(),
  isPermissionNeeded: vi.fn(),
  requestHandlePermission: vi.fn(),
  setDataHandle: vi.fn(),
  checkHandlePermission: vi.fn(),
  openDataFile: vi.fn(),
  createNewDataFile: vi.fn(),
  downloadDataFile: vi.fn(),
  loadWorkspace: vi.fn(),
  saveWorkspace: vi.fn(),
}))

vi.mock('@/lib/storage/indexedDb', () => ({
  saveToIdb: vi.fn(),
  loadFromIdb: vi.fn(),
  clearIdb: vi.fn(),
  saveFileHandle: vi.fn(),
  loadFileHandle: vi.fn(),
}))

import { saveToIdb } from '@/lib/storage/indexedDb'

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useDataStore.setState({
    data: makeDataFile(),
    unsyncedCount: 0,
    idbQuotaExceeded: false,
  })
  vi.resetAllMocks()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('debouncedSaveToIdb — quota exceeded (M-16)', () => {
  it('sets idbQuotaExceeded when saveToIdb rejects with QuotaExceededError', async () => {
    vi.mocked(saveToIdb).mockRejectedValue(new DOMException('', 'QuotaExceededError'))

    useDataStore.getState().addTransaction({
      id: 'tx-1',
      accountId: 'acc-1',
      categoryId: 'cat-1',
      amount: 100,
      type: 'EXPENSE',
      date: new Date().toISOString(),
      description: 'Test',
      isPaid: true,
      tags: [],
    })

    await vi.runAllTimersAsync()

    expect(useDataStore.getState().idbQuotaExceeded).toBe(true)
  })

  it('does not set idbQuotaExceeded for non-quota errors', async () => {
    vi.mocked(saveToIdb).mockRejectedValue(new Error('Unrelated error'))

    useDataStore.getState().addTransaction({
      id: 'tx-2',
      accountId: 'acc-1',
      categoryId: 'cat-1',
      amount: 50,
      type: 'EXPENSE',
      date: new Date().toISOString(),
      description: 'Test 2',
      isPaid: true,
      tags: [],
    })

    await vi.runAllTimersAsync()

    expect(useDataStore.getState().idbQuotaExceeded).toBe(false)
  })

  it('in-memory data and unsyncedCount are updated even when IDB save fails', async () => {
    vi.mocked(saveToIdb).mockRejectedValue(new DOMException('', 'QuotaExceededError'))
    const before = useDataStore.getState().data!.transactions.length

    useDataStore.getState().addTransaction({
      id: 'tx-3',
      accountId: 'acc-1',
      categoryId: 'cat-1',
      amount: 75,
      type: 'INCOME',
      date: new Date().toISOString(),
      description: 'Test 3',
      isPaid: true,
      tags: [],
    })

    await vi.runAllTimersAsync()

    expect(useDataStore.getState().data!.transactions.length).toBe(before + 1)
    expect(useDataStore.getState().unsyncedCount).toBe(1)
    expect(useDataStore.getState().idbQuotaExceeded).toBe(true)
  })
})
