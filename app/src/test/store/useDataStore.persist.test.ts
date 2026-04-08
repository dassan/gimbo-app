/**
 * Tests for useDataStore.persist() in isolation.
 *
 * vi.mock is hoisted to the top of the module by Vitest, so the store's static
 * import of saveDataFile / readCurrentDataFile receives the mocked versions.
 * This is the only pattern that correctly intercepts calls made inside the
 * Zustand store's closures — vi.resetModules() + dynamic imports would not work
 * because the store singleton is already bound to the original references.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useDataStore } from '@/store/useDataStore'
import { makeDataFile } from '@/test/fixtures/dataFile'
import type { Account } from '@/types'

// ─── Module-level mocks (hoisted by Vitest) ───────────────────────────────────

vi.mock('@/lib/storage/fileSystem', () => ({
  saveDataFile: vi.fn(),
  readCurrentDataFile: vi.fn(),
  setDataHandle: vi.fn(),
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

import { saveDataFile, readCurrentDataFile } from '@/lib/storage/fileSystem'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function diskOnlyAccount(id = 'acc-disk'): Account {
  return { id, name: 'Disk Account', type: 'RETAIL', balance: 0, includeInBalance: true }
}

function localAccount(id = 'acc-local'): Account {
  return { id, name: 'Local Account', type: 'RETAIL', balance: 0, includeInBalance: true }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useDataStore.setState({ data: null, unsyncedCount: 0 })
  vi.resetAllMocks()
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
      makeDataFile({ accounts: [diskOnlyAccount()] })
    )
    vi.mocked(saveDataFile).mockResolvedValue(true)

    useDataStore.setState({ data: makeDataFile({ accounts: [] }), unsyncedCount: 1 })
    await useDataStore.getState().persist()

    const saved = vi.mocked(saveDataFile).mock.calls[0][0]
    expect(saved.accounts.map((a) => a.id)).toContain('acc-disk')
  })

  it('updates in-memory store to reflect the merged result', async () => {
    vi.mocked(readCurrentDataFile).mockResolvedValue(
      makeDataFile({ accounts: [diskOnlyAccount()] })
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

    vi.mocked(readCurrentDataFile).mockResolvedValue(makeDataFile({ accounts: [diskVersion] }))
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
      makeDataFile({ accounts: [diskOnlyAccount()] })
    )
    vi.mocked(saveDataFile).mockResolvedValue(false)

    useDataStore.setState({ data: makeDataFile({ accounts: [] }), unsyncedCount: 1 })
    await useDataStore.getState().persist()

    // Store should remain unchanged (empty accounts) because save failed
    expect(useDataStore.getState().data?.accounts).toHaveLength(0)
    expect(useDataStore.getState().unsyncedCount).toBe(1)
  })
})
