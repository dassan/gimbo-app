import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DataFile } from '@/types'
import { makeDataFile } from '@/test/fixtures/dataFile'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/storage/schema', () => ({
  validateDataFile: vi.fn((data: unknown) => data as DataFile),
}))

vi.mock('@/lib/storage/indexedDb', () => ({
  clearIdb: vi.fn().mockResolvedValue(undefined),
  saveToIdb: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/storage/fileSystem', () => ({
  saveDataFile: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/storage/merge', () => ({
  mergeDataFiles: vi.fn((local: DataFile) => ({ ...local })),
}))

import { importFileToIdb, syncToFile } from '@/lib/storage/sync'
import { validateDataFile } from '@/lib/storage/schema'
import { clearIdb, saveToIdb } from '@/lib/storage/indexedDb'
import { saveDataFile } from '@/lib/storage/fileSystem'
import { mergeDataFiles } from '@/lib/storage/merge'

// ─── Helpers ──────────────────────────────────────────────────────────────────

// jsdom does not implement Blob/File.text() — use a minimal fake with the same interface.
function makeFile(content: unknown): File {
  return { text: () => Promise.resolve(JSON.stringify(content)) } as unknown as File
}

function makeFileBadJson(): File {
  return { text: () => Promise.resolve('not-valid-json{{') } as unknown as File
}

// ─── importFileToIdb ─────────────────────────────────────────────────────────

describe('importFileToIdb', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(validateDataFile).mockImplementation((data: unknown) => data as DataFile)
    vi.mocked(clearIdb).mockResolvedValue(undefined)
    vi.mocked(saveToIdb).mockResolvedValue(undefined)
  })

  it('validates, clears IDB, saves, and returns the DataFile', async () => {
    const data = makeDataFile()
    const file = makeFile(data)

    const result = await importFileToIdb(file)

    expect(validateDataFile).toHaveBeenCalledWith(data)
    expect(clearIdb).toHaveBeenCalledOnce()
    expect(saveToIdb).toHaveBeenCalledWith(data)
    expect(result).toEqual(data)
  })

  it('clears IDB before saving the new data', async () => {
    const callOrder: string[] = []
    vi.mocked(clearIdb).mockImplementationOnce(() => {
      callOrder.push('clearIdb')
      return Promise.resolve()
    })
    vi.mocked(saveToIdb).mockImplementationOnce(() => {
      callOrder.push('saveToIdb')
      return Promise.resolve()
    })

    await importFileToIdb(makeFile(makeDataFile()))

    expect(callOrder).toEqual(['clearIdb', 'saveToIdb'])
  })

  it('throws when the file contains invalid JSON', async () => {
    await expect(importFileToIdb(makeFileBadJson())).rejects.toThrow()
    expect(clearIdb).not.toHaveBeenCalled()
    expect(saveToIdb).not.toHaveBeenCalled()
  })

  it('throws and skips IDB writes when Zod validation fails', async () => {
    vi.mocked(validateDataFile).mockImplementationOnce(() => {
      throw new Error('ZodError: invalid data')
    })

    await expect(importFileToIdb(makeFile({ invalid: true }))).rejects.toThrow('ZodError')
    expect(clearIdb).not.toHaveBeenCalled()
    expect(saveToIdb).not.toHaveBeenCalled()
  })
})

// ─── syncToFile ───────────────────────────────────────────────────────────────

describe('syncToFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(saveDataFile).mockResolvedValue(true)
    vi.mocked(mergeDataFiles).mockImplementation((local: DataFile) => ({ ...local }))
  })

  it('merges local and disk data when a snapshot is provided, then saves', async () => {
    const local = makeDataFile({ user: { ...makeDataFile().user, name: 'Local' } })
    const disk = makeDataFile({ user: { ...makeDataFile().user, name: 'Disk' } })

    await syncToFile(local, { data: disk })

    expect(mergeDataFiles).toHaveBeenCalledWith(local, disk)
    expect(saveDataFile).toHaveBeenCalledOnce()
  })

  it('saves local data as-is when no disk snapshot is available', async () => {
    const local = makeDataFile()

    await syncToFile(local, null)

    expect(mergeDataFiles).not.toHaveBeenCalled()
    expect(saveDataFile).toHaveBeenCalledWith(local)
  })

  it('returns the merged DataFile on success', async () => {
    const local = makeDataFile()
    const merged = makeDataFile({ user: { ...makeDataFile().user, name: 'Merged' } })
    vi.mocked(mergeDataFiles).mockReturnValueOnce(merged)

    const result = await syncToFile(local, { data: makeDataFile() })

    expect(result).toEqual(merged)
  })

  it('returns the local DataFile when no disk snapshot is provided', async () => {
    const local = makeDataFile()

    const result = await syncToFile(local, null)

    expect(result).toEqual(local)
  })

  it('returns null when saveDataFile fails', async () => {
    vi.mocked(saveDataFile).mockResolvedValueOnce(false)

    const result = await syncToFile(makeDataFile(), null)

    expect(result).toBeNull()
  })

  it('never calls clearIdb or saveToIdb — sync does not touch the IDB ledger directly', async () => {
    await syncToFile(makeDataFile(), null)

    expect(clearIdb).not.toHaveBeenCalled()
    expect(saveToIdb).not.toHaveBeenCalled()
  })
})
