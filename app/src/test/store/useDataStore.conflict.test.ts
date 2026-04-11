/**
 * Tests for M-10 conflict detection and resolution in useDataStore.
 *
 * Uses the same vi.mock hoisting pattern as useDataStore.persist.test.ts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useDataStore } from '@/store/useDataStore'
import { makeDataFile } from '@/test/fixtures/dataFile'
import type { Account } from '@/types'

// ─── Module-level mocks ───────────────────────────────────────────────────────

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
} from '@/lib/storage/fileSystem'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const T_LAST_WRITTEN = 1_700_000_000_000
const T_EXTERNAL = T_LAST_WRITTEN + 60_000 // 60 s newer — external modification

function diskAccount(id = 'acc-disk'): Account {
  return { id, name: 'Disk Account', type: 'RETAIL', balance: 0, includeInBalance: true }
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
  vi.mocked(isHandleLost).mockReturnValue(false)
  vi.mocked(isPermissionNeeded).mockReturnValue(false)
})

// ── Conflict detection ────────────────────────────────────────────────────────

describe('persist — conflict detection', () => {
  it('does not trigger conflict when getLastWrittenModified returns null (first sync)', async () => {
    vi.mocked(getLastWrittenModified).mockReturnValue(null)
    vi.mocked(readCurrentDataFile).mockResolvedValue({
      data: makeDataFile(),
      lastModified: T_EXTERNAL,
    })
    vi.mocked(saveDataFile).mockResolvedValue(true)

    useDataStore.setState({ data: makeDataFile(), unsyncedCount: 1 })
    const ok = await useDataStore.getState().persist()

    expect(ok).toBe(true)
    expect(useDataStore.getState().conflictData).toBeNull()
    expect(saveDataFile).toHaveBeenCalledOnce()
  })

  it('does not trigger conflict when disk lastModified equals last written timestamp', async () => {
    vi.mocked(getLastWrittenModified).mockReturnValue(T_LAST_WRITTEN)
    vi.mocked(readCurrentDataFile).mockResolvedValue({
      data: makeDataFile(),
      lastModified: T_LAST_WRITTEN, // same — no external change
    })
    vi.mocked(saveDataFile).mockResolvedValue(true)

    useDataStore.setState({ data: makeDataFile(), unsyncedCount: 1 })
    const ok = await useDataStore.getState().persist()

    expect(ok).toBe(true)
    expect(useDataStore.getState().conflictData).toBeNull()
  })

  it('does not trigger conflict when readCurrentDataFile returns null (no handle)', async () => {
    vi.mocked(getLastWrittenModified).mockReturnValue(T_LAST_WRITTEN)
    vi.mocked(readCurrentDataFile).mockResolvedValue(null)
    vi.mocked(saveDataFile).mockResolvedValue(true)

    useDataStore.setState({ data: makeDataFile(), unsyncedCount: 1 })
    await useDataStore.getState().persist()

    expect(useDataStore.getState().conflictData).toBeNull()
  })

  it('sets conflictData and returns false when disk is newer than last write', async () => {
    vi.mocked(getLastWrittenModified).mockReturnValue(T_LAST_WRITTEN)
    vi.mocked(readCurrentDataFile).mockResolvedValue({
      data: makeDataFile({ accounts: [diskAccount()] }),
      lastModified: T_EXTERNAL,
    })

    useDataStore.setState({ data: makeDataFile({ accounts: [] }), unsyncedCount: 2 })
    const ok = await useDataStore.getState().persist()

    expect(ok).toBe(false)
    const conflict = useDataStore.getState().conflictData
    expect(conflict).not.toBeNull()
    expect(conflict!.disk.accounts.map((a) => a.id)).toContain('acc-disk')
    expect(conflict!.local.accounts).toHaveLength(0)
  })

  it('does not call saveDataFile when a conflict is detected', async () => {
    vi.mocked(getLastWrittenModified).mockReturnValue(T_LAST_WRITTEN)
    vi.mocked(readCurrentDataFile).mockResolvedValue({
      data: makeDataFile(),
      lastModified: T_EXTERNAL,
    })

    useDataStore.setState({ data: makeDataFile(), unsyncedCount: 1 })
    await useDataStore.getState().persist()

    expect(saveDataFile).not.toHaveBeenCalled()
  })

  it('preserves unsyncedCount when a conflict is detected', async () => {
    vi.mocked(getLastWrittenModified).mockReturnValue(T_LAST_WRITTEN)
    vi.mocked(readCurrentDataFile).mockResolvedValue({
      data: makeDataFile(),
      lastModified: T_EXTERNAL,
    })

    useDataStore.setState({ data: makeDataFile(), unsyncedCount: 3 })
    await useDataStore.getState().persist()

    expect(useDataStore.getState().unsyncedCount).toBe(3)
  })
})

// ── resolveConflict('overwrite') ──────────────────────────────────────────────

describe('resolveConflict — overwrite', () => {
  it('writes local data to disk and clears conflictData on success', async () => {
    const local = makeDataFile({ accounts: [] })
    const disk = makeDataFile({ accounts: [diskAccount()] })
    vi.mocked(saveDataFile).mockResolvedValue(true)

    useDataStore.setState({ conflictData: { local, disk }, unsyncedCount: 2 })
    await useDataStore.getState().resolveConflict('overwrite')

    expect(saveDataFile).toHaveBeenCalledWith(local)
    expect(useDataStore.getState().conflictData).toBeNull()
    expect(useDataStore.getState().unsyncedCount).toBe(0)
  })

  it('updates in-memory store to local data after overwrite', async () => {
    const local = makeDataFile({ accounts: [] })
    const disk = makeDataFile({ accounts: [diskAccount()] })
    vi.mocked(saveDataFile).mockResolvedValue(true)

    useDataStore.setState({ conflictData: { local, disk } })
    await useDataStore.getState().resolveConflict('overwrite')

    expect(useDataStore.getState().data?.accounts).toHaveLength(0)
  })

  it('does not clear conflictData if saveDataFile fails on overwrite', async () => {
    const local = makeDataFile()
    const disk = makeDataFile()
    vi.mocked(saveDataFile).mockResolvedValue(false)

    useDataStore.setState({ conflictData: { local, disk }, unsyncedCount: 2 })
    await useDataStore.getState().resolveConflict('overwrite')

    expect(useDataStore.getState().conflictData).not.toBeNull()
    expect(useDataStore.getState().unsyncedCount).toBe(2)
  })
})

// ── resolveConflict('load-cloud') ─────────────────────────────────────────────

describe('resolveConflict — load-cloud', () => {
  it('loads disk data into the store and clears conflictData', () => {
    const local = makeDataFile({ accounts: [] })
    const disk = makeDataFile({ accounts: [diskAccount()] })

    useDataStore.setState({ conflictData: { local, disk }, unsyncedCount: 2 })
    void useDataStore.getState().resolveConflict('load-cloud')

    const state = useDataStore.getState()
    expect(state.data?.accounts.map((a) => a.id)).toContain('acc-disk')
    expect(state.conflictData).toBeNull()
    expect(state.unsyncedCount).toBe(0)
  })

  it('does not call saveDataFile when loading from disk', () => {
    const local = makeDataFile()
    const disk = makeDataFile()

    useDataStore.setState({ conflictData: { local, disk } })
    void useDataStore.getState().resolveConflict('load-cloud')

    expect(saveDataFile).not.toHaveBeenCalled()
  })

  it('is a no-op when conflictData is null', async () => {
    useDataStore.setState({ conflictData: null })
    await useDataStore.getState().resolveConflict('load-cloud')

    expect(saveDataFile).not.toHaveBeenCalled()
  })
})
