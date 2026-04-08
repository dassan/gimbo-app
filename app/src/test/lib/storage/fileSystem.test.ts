import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeDataFile } from '@/test/fixtures/dataFile'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWritable() {
  return {
    write: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  }
}

function makeHandle(name = 'nexus-finances.json') {
  const writable = makeWritable()
  return {
    _writable: writable,
    kind: 'file' as const,
    name,
    getFile: vi.fn().mockResolvedValue({
      text: vi.fn().mockResolvedValue(JSON.stringify(makeDataFile())),
    }),
    createWritable: vi.fn().mockResolvedValue(writable),
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('openDataFile', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns handle and parsed DataFile on success', async () => {
    const handle = makeHandle('my-finances.json')
    vi.stubGlobal('showOpenFilePicker', vi.fn().mockResolvedValue([handle]))

    const { openDataFile } = await import('@/lib/storage/fileSystem')
    const result = await openDataFile()

    expect(result).not.toBeNull()
    expect(result!.handle).toBe(handle)
    expect(result!.data.user.name).toBe('Test User')
  })

  it('returns null when user cancels (AbortError)', async () => {
    vi.stubGlobal(
      'showOpenFilePicker',
      vi.fn().mockRejectedValue(Object.assign(new Error('Abort'), { name: 'AbortError' }))
    )

    const { openDataFile } = await import('@/lib/storage/fileSystem')
    expect(await openDataFile()).toBeNull()
  })

  it('returns null on any other error', async () => {
    vi.stubGlobal('showOpenFilePicker', vi.fn().mockRejectedValue(new Error('Permission denied')))

    const { openDataFile } = await import('@/lib/storage/fileSystem')
    expect(await openDataFile()).toBeNull()
  })
})

describe('createNewDataFile', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('opens save picker, writes JSON, and returns the handle', async () => {
    const handle = makeHandle()
    vi.stubGlobal('showSaveFilePicker', vi.fn().mockResolvedValue(handle))

    const { createNewDataFile } = await import('@/lib/storage/fileSystem')
    const data = makeDataFile()
    const result = await createNewDataFile(data)

    expect(result).toBe(handle)
    expect(handle.createWritable).toHaveBeenCalledOnce()
    expect(handle._writable.write).toHaveBeenCalledWith(JSON.stringify(data, null, 2))
    expect(handle._writable.close).toHaveBeenCalledOnce()
  })

  it('passes the suggestedName to the picker', async () => {
    const handle = makeHandle('meu-controle.json')
    const spy = vi.fn().mockResolvedValue(handle)
    vi.stubGlobal('showSaveFilePicker', spy)

    const { createNewDataFile } = await import('@/lib/storage/fileSystem')
    await createNewDataFile(makeDataFile(), 'meu-controle.json')

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ suggestedName: 'meu-controle.json' })
    )
  })

  it('uses the default suggestedName when none is provided', async () => {
    const handle = makeHandle()
    const spy = vi.fn().mockResolvedValue(handle)
    vi.stubGlobal('showSaveFilePicker', spy)

    const { createNewDataFile } = await import('@/lib/storage/fileSystem')
    await createNewDataFile(makeDataFile())

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ suggestedName: 'nexus-finances.json' })
    )
  })

  it('returns null when user cancels (AbortError)', async () => {
    vi.stubGlobal(
      'showSaveFilePicker',
      vi.fn().mockRejectedValue(Object.assign(new Error('Abort'), { name: 'AbortError' }))
    )

    const { createNewDataFile } = await import('@/lib/storage/fileSystem')
    expect(await createNewDataFile(makeDataFile())).toBeNull()
  })
})

describe('saveDataFile', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('writes to the injected handle without opening a picker', async () => {
    const handle = makeHandle()
    vi.stubGlobal('showSaveFilePicker', vi.fn())

    const { setDataHandle, saveDataFile } = await import('@/lib/storage/fileSystem')
    setDataHandle(handle as unknown as FileSystemFileHandle)

    const data = makeDataFile()
    const ok = await saveDataFile(data)

    expect(ok).toBe(true)
    expect(window.showSaveFilePicker).not.toHaveBeenCalled()
    expect(handle._writable.write).toHaveBeenCalledWith(JSON.stringify(data, null, 2))
  })

  it('opens a save picker when no handle is cached', async () => {
    const handle = makeHandle()
    const spy = vi.fn().mockResolvedValue(handle)
    vi.stubGlobal('showSaveFilePicker', spy)

    const { saveDataFile } = await import('@/lib/storage/fileSystem')
    const ok = await saveDataFile(makeDataFile())

    expect(ok).toBe(true)
    expect(spy).toHaveBeenCalledOnce()
  })

  it('returns false on write error', async () => {
    const handle = makeHandle()
    handle.createWritable = vi.fn().mockRejectedValue(new Error('Disk full'))
    vi.stubGlobal('showSaveFilePicker', vi.fn().mockResolvedValue(handle))

    const { saveDataFile } = await import('@/lib/storage/fileSystem')
    expect(await saveDataFile(makeDataFile())).toBe(false)
  })
})

describe('setDataHandle', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('caches the handle so subsequent saveDataFile calls skip the picker', async () => {
    const handle = makeHandle()
    const spy = vi.fn()
    vi.stubGlobal('showSaveFilePicker', spy)

    const { setDataHandle, saveDataFile } = await import('@/lib/storage/fileSystem')
    setDataHandle(handle as unknown as FileSystemFileHandle)
    await saveDataFile(makeDataFile())

    expect(spy).not.toHaveBeenCalled()
  })
})
