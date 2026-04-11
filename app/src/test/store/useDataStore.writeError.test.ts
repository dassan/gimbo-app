import { describe, it, expect, beforeEach, vi } from 'vitest'
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

import {
  saveDataFile,
  readCurrentDataFile,
  getLastWrittenModified,
  isHandleLost,
  isPermissionNeeded,
} from '@/lib/storage/fileSystem'

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useDataStore.setState({
    data: makeDataFile(),
    unsyncedCount: 1,
    conflictData: null,
    fileHandleLost: false,
    permissionNeeded: false,
    writeError: false,
  })
  vi.resetAllMocks()
  vi.mocked(isHandleLost).mockReturnValue(false)
  vi.mocked(isPermissionNeeded).mockReturnValue(false)
  vi.mocked(getLastWrittenModified).mockReturnValue(null)
  vi.mocked(readCurrentDataFile).mockResolvedValue(null)
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('persist — write error (M-15)', () => {
  it('sets writeError when saveDataFile fails and the file is not lost', async () => {
    vi.mocked(saveDataFile).mockResolvedValue(false)
    vi.mocked(isHandleLost).mockReturnValue(false)

    await useDataStore.getState().persist()

    expect(useDataStore.getState().writeError).toBe(true)
  })

  it('does not set writeError when the failure is a lost file (NotFoundError)', async () => {
    vi.mocked(saveDataFile).mockImplementation(() => {
      vi.mocked(isHandleLost).mockReturnValue(true)
      return Promise.resolve(false)
    })

    await useDataStore.getState().persist()

    expect(useDataStore.getState().writeError).toBe(false)
    expect(useDataStore.getState().fileHandleLost).toBe(true)
  })

  it('preserves unsyncedCount when a write error occurs', async () => {
    vi.mocked(saveDataFile).mockResolvedValue(false)

    await useDataStore.getState().persist()

    expect(useDataStore.getState().unsyncedCount).toBe(1)
  })

  it('clears writeError on the next successful sync', async () => {
    useDataStore.setState({ writeError: true })
    vi.mocked(saveDataFile).mockResolvedValue(true)

    await useDataStore.getState().persist()

    expect(useDataStore.getState().writeError).toBe(false)
    expect(useDataStore.getState().unsyncedCount).toBe(0)
  })

  it('returns false when a write error occurs', async () => {
    vi.mocked(saveDataFile).mockResolvedValue(false)

    const ok = await useDataStore.getState().persist()

    expect(ok).toBe(false)
  })
})
