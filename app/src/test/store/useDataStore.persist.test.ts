/**
 * Tests for useDataStore.persist() in isolation.
 *
 * vi.mock is hoisted to the top of the module by Vitest, so the store's static
 * import of saveDataFile / readCurrentDataFile / getLastWrittenModified receives
 * the mocked versions. This is the only pattern that correctly intercepts calls
 * made inside the Zustand store's closures.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useDataStore } from '@/store/useDataStore'
import { makeDataFile } from '@/test/fixtures/dataFile'
import type { Account } from '@/types'

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

import {
  saveDataFile,
  readCurrentDataFile,
  getLastWrittenModified,
  isHandleLost,
  isPermissionNeeded,
  requestHandlePermission,
} from '@/lib/storage/fileSystem'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LAST_WRITTEN = 1_700_000_000_000

function diskSnapshot(overrides = {}) {
  return { data: makeDataFile(overrides), lastModified: LAST_WRITTEN }
}

function diskOnlyAccount(id = 'acc-disk'): Account {
  return { id, name: 'Disk Account', type: 'RETAIL', balance: 0, includeInBalance: true }
}

function localAccount(id = 'acc-local'): Account {
  return { id, name: 'Local Account', type: 'RETAIL', balance: 0, includeInBalance: true }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useDataStore.setState({
    data: null,
    unsyncedCount: 0,
    conflictData: null,
    fileHandleLost: false,
    permissionNeeded: false,
  })
  vi.resetAllMocks()
  // By default: no file-lost state, no permission prompt, no conflict
  vi.mocked(isHandleLost).mockReturnValue(false)
  vi.mocked(isPermissionNeeded).mockReturnValue(false)
  vi.mocked(getLastWrittenModified).mockReturnValue(LAST_WRITTEN)
})

describe('persist — guard', () => {
  it('returns false when data is null', async () => {
    const ok = await useDataStore.getState().persist()
    expect(ok).toBe(false)
  })
})

describe('persist — save result', () => {
  it('resets unsyncedCount to 0 on successful save', async () => {
    vi.mocked(readCurrentDataFile).mockResolvedValue(null)
    vi.mocked(saveDataFile).mockResolvedValue(true)

    useDataStore.setState({ data: makeDataFile(), unsyncedCount: 5 })
    await useDataStore.getState().persist()

    expect(useDataStore.getState().unsyncedCount).toBe(0)
  })

  it('does not reset unsyncedCount when save fails', async () => {
    vi.mocked(readCurrentDataFile).mockResolvedValue(null)
    vi.mocked(saveDataFile).mockResolvedValue(false)

    useDataStore.setState({ data: makeDataFile(), unsyncedCount: 3 })
    await useDataStore.getState().persist()

    expect(useDataStore.getState().unsyncedCount).toBe(3)
  })
})

describe('persist — read-before-write merge', () => {
  it('merges disk-only accounts into the saved payload', async () => {
    vi.mocked(readCurrentDataFile).mockResolvedValue(
      diskSnapshot({ accounts: [diskOnlyAccount()] })
    )
    vi.mocked(saveDataFile).mockResolvedValue(true)

    useDataStore.setState({ data: makeDataFile({ accounts: [] }), unsyncedCount: 1 })
    await useDataStore.getState().persist()

    const saved = vi.mocked(saveDataFile).mock.calls[0][0]
    expect(saved.accounts.map((a) => a.id)).toContain('acc-disk')
  })

  it('updates in-memory store to reflect the merged result', async () => {
    vi.mocked(readCurrentDataFile).mockResolvedValue(
      diskSnapshot({ accounts: [diskOnlyAccount()] })
    )
    vi.mocked(saveDataFile).mockResolvedValue(true)

    useDataStore.setState({ data: makeDataFile({ accounts: [] }), unsyncedCount: 1 })
    await useDataStore.getState().persist()

    expect(useDataStore.getState().data?.accounts.map((a) => a.id)).toContain('acc-disk')
  })

  it('local item wins when same id exists on disk', async () => {
    const localVersion = localAccount('acc-shared')
    localVersion.name = 'Local Name'
    const diskVersion = diskOnlyAccount('acc-shared')
    diskVersion.name = 'Disk Name'

    vi.mocked(readCurrentDataFile).mockResolvedValue(diskSnapshot({ accounts: [diskVersion] }))
    vi.mocked(saveDataFile).mockResolvedValue(true)

    useDataStore.setState({ data: makeDataFile({ accounts: [localVersion] }), unsyncedCount: 1 })
    await useDataStore.getState().persist()

    const saved = vi.mocked(saveDataFile).mock.calls[0][0]
    expect(saved.accounts).toHaveLength(1)
    expect(saved.accounts[0].name).toBe('Local Name')
  })

  it('saves local data unchanged when readCurrentDataFile returns null', async () => {
    vi.mocked(readCurrentDataFile).mockResolvedValue(null)
    vi.mocked(saveDataFile).mockResolvedValue(true)

    useDataStore.setState({ data: makeDataFile({ accounts: [localAccount()] }), unsyncedCount: 1 })
    await useDataStore.getState().persist()

    const saved = vi.mocked(saveDataFile).mock.calls[0][0]
    expect(saved.accounts.map((a) => a.id)).toContain('acc-local')
    expect(saved.accounts).toHaveLength(1)
  })

  it('does not update in-memory store when save fails even after merge', async () => {
    vi.mocked(readCurrentDataFile).mockResolvedValue(
      diskSnapshot({ accounts: [diskOnlyAccount()] })
    )
    vi.mocked(saveDataFile).mockResolvedValue(false)

    useDataStore.setState({ data: makeDataFile({ accounts: [] }), unsyncedCount: 1 })
    await useDataStore.getState().persist()

    expect(useDataStore.getState().data?.accounts).toHaveLength(0)
    expect(useDataStore.getState().unsyncedCount).toBe(1)
  })
})

describe('persist — file lost', () => {
  it('sets fileHandleLost and returns false when readCurrentDataFile detects NotFoundError', async () => {
    // readCurrentDataFile returns null (NotFoundError consumed internally),
    // and isHandleLost() flips to true after the call.
    vi.mocked(readCurrentDataFile).mockImplementation(() => {
      vi.mocked(isHandleLost).mockReturnValue(true)
      return Promise.resolve(null)
    })

    useDataStore.setState({ data: makeDataFile(), unsyncedCount: 1 })
    const ok = await useDataStore.getState().persist()

    expect(ok).toBe(false)
    expect(useDataStore.getState().fileHandleLost).toBe(true)
    expect(saveDataFile).not.toHaveBeenCalled()
  })

  it('skips disk read and calls saveDataFile directly on recovery click (isHandleLost true)', async () => {
    vi.mocked(isHandleLost).mockReturnValue(true)
    vi.mocked(saveDataFile).mockResolvedValue(true)

    useDataStore.setState({ data: makeDataFile(), unsyncedCount: 1, fileHandleLost: true })
    const ok = await useDataStore.getState().persist()

    expect(ok).toBe(true)
    expect(readCurrentDataFile).not.toHaveBeenCalled()
    expect(saveDataFile).toHaveBeenCalledOnce()
  })

  it('clears fileHandleLost after a successful recovery save', async () => {
    vi.mocked(isHandleLost).mockReturnValue(true)
    vi.mocked(saveDataFile).mockResolvedValue(true)

    useDataStore.setState({ data: makeDataFile(), unsyncedCount: 1, fileHandleLost: true })
    await useDataStore.getState().persist()

    expect(useDataStore.getState().fileHandleLost).toBe(false)
    expect(useDataStore.getState().unsyncedCount).toBe(0)
  })

  it('sets fileHandleLost when saveDataFile itself encounters NotFoundError', async () => {
    vi.mocked(readCurrentDataFile).mockResolvedValue(null)
    vi.mocked(saveDataFile).mockImplementation(() => {
      vi.mocked(isHandleLost).mockReturnValue(true)
      return Promise.resolve(false)
    })

    useDataStore.setState({ data: makeDataFile(), unsyncedCount: 1 })
    const ok = await useDataStore.getState().persist()

    expect(ok).toBe(false)
    expect(useDataStore.getState().fileHandleLost).toBe(true)
  })
})

describe('persist — permission needed', () => {
  it('clears permissionNeeded and proceeds with normal persist when permission is granted', async () => {
    vi.mocked(isPermissionNeeded).mockReturnValue(true)
    vi.mocked(requestHandlePermission).mockResolvedValue(true)
    vi.mocked(readCurrentDataFile).mockResolvedValue(null)
    vi.mocked(saveDataFile).mockResolvedValue(true)

    useDataStore.setState({ data: makeDataFile(), unsyncedCount: 1, permissionNeeded: true })
    const ok = await useDataStore.getState().persist()

    expect(ok).toBe(true)
    expect(useDataStore.getState().permissionNeeded).toBe(false)
    expect(useDataStore.getState().unsyncedCount).toBe(0)
    expect(saveDataFile).toHaveBeenCalledOnce()
  })

  it('sets fileHandleLost and clears permissionNeeded when permission is denied', async () => {
    vi.mocked(isPermissionNeeded).mockReturnValue(true)
    vi.mocked(requestHandlePermission).mockResolvedValue(false)

    useDataStore.setState({ data: makeDataFile(), unsyncedCount: 1, permissionNeeded: true })
    const ok = await useDataStore.getState().persist()

    expect(ok).toBe(false)
    expect(useDataStore.getState().permissionNeeded).toBe(false)
    expect(useDataStore.getState().fileHandleLost).toBe(true)
    expect(saveDataFile).not.toHaveBeenCalled()
    expect(readCurrentDataFile).not.toHaveBeenCalled()
  })
})
