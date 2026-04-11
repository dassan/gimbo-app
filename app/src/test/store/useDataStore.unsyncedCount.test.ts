import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useDataStore } from '@/store/useDataStore'
import { makeDataFile } from '@/test/fixtures/dataFile'
import type { Transaction } from '@/types'

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
  saveSyncMeta: vi.fn(),
}))

vi.mock('@/lib/storage/sync', () => ({
  syncToFile: vi.fn(),
}))

import { saveSyncMeta, saveToIdb } from '@/lib/storage/indexedDb'
import { syncToFile } from '@/lib/storage/sync'
import {
  isHandleLost,
  isPermissionNeeded,
  readCurrentDataFile,
  getLastWrittenModified,
} from '@/lib/storage/fileSystem'

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
  useDataStore.setState({
    data: makeDataFile(),
    unsyncedCount: 0,
    fileHandleLost: false,
    permissionNeeded: false,
    writeError: false,
    conflictData: null,
  })
  vi.resetAllMocks()
  vi.mocked(isHandleLost).mockReturnValue(false)
  vi.mocked(isPermissionNeeded).mockReturnValue(false)
  vi.mocked(readCurrentDataFile).mockResolvedValue(null)
  vi.mocked(getLastWrittenModified).mockReturnValue(null)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('debouncedSaveToIdb — persists unsyncedCount (M-19)', () => {
  it('calls saveSyncMeta with the new unsyncedCount after a mutation', async () => {
    vi.mocked(saveToIdb).mockResolvedValue(undefined)
    vi.mocked(saveSyncMeta).mockResolvedValue(undefined)

    useDataStore.getState().addTransaction(makeTx({ id: 'tx-1' }))

    await vi.runAllTimersAsync()

    expect(saveSyncMeta).toHaveBeenCalledWith(1)
  })

  it('passes the incremented count, not zero, to saveSyncMeta', async () => {
    useDataStore.setState({ unsyncedCount: 3 })
    vi.mocked(saveToIdb).mockResolvedValue(undefined)
    vi.mocked(saveSyncMeta).mockResolvedValue(undefined)

    useDataStore.getState().addTransaction(makeTx({ id: 'tx-2' }))

    await vi.runAllTimersAsync()

    expect(saveSyncMeta).toHaveBeenCalledWith(4)
  })
})

describe('persist — IDB sync after successful write (M-19)', () => {
  it('calls saveToIdb and saveSyncMeta(0) after a successful sync', async () => {
    const merged = makeDataFile()
    vi.mocked(syncToFile).mockResolvedValue(merged)
    vi.mocked(saveToIdb).mockResolvedValue(undefined)
    vi.mocked(saveSyncMeta).mockResolvedValue(undefined)

    await useDataStore.getState().persist()

    expect(saveToIdb).toHaveBeenCalledWith(merged)
    expect(saveSyncMeta).toHaveBeenCalledWith(0)
  })

  it('does not call saveSyncMeta(0) when the write fails', async () => {
    vi.mocked(syncToFile).mockResolvedValue(null)
    vi.mocked(isHandleLost).mockReturnValue(false)
    vi.mocked(saveSyncMeta).mockResolvedValue(undefined)

    await useDataStore.getState().persist()

    expect(saveSyncMeta).not.toHaveBeenCalledWith(0)
  })
})
