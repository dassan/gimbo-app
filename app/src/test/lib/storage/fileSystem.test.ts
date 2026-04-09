import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeDataFile } from '@/test/fixtures/dataFile'

function notFoundError() {
  return Object.assign(new Error('NotFoundError'), { name: 'NotFoundError' })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWritable() {
  return {
    write: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  }
}

const FAKE_LAST_MODIFIED = 1_700_000_000_000

function makeHandle(name = 'nexus-finances.json') {
  const writable = makeWritable()
  return {
    _writable: writable,
    kind: 'file' as const,
    name,
    getFile: vi.fn().mockResolvedValue({
      text: vi.fn().mockResolvedValue(JSON.stringify(makeDataFile())),
      lastModified: FAKE_LAST_MODIFIED,
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
    const pickerSpy = vi.fn()
    vi.stubGlobal('showSaveFilePicker', pickerSpy)

    const { setDataHandle, saveDataFile } = await import('@/lib/storage/fileSystem')
    setDataHandle(handle as unknown as FileSystemFileHandle)

    const data = makeDataFile()
    const ok = await saveDataFile(data)

    expect(ok).toBe(true)
    expect(pickerSpy).not.toHaveBeenCalled()
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

  it('sets isHandleLost when createWritable throws NotFoundError', async () => {
    const handle = makeHandle()
    handle.createWritable = vi.fn().mockRejectedValue(notFoundError())
    vi.stubGlobal('showSaveFilePicker', vi.fn().mockResolvedValue(handle))

    const { setDataHandle, saveDataFile, isHandleLost } = await import('@/lib/storage/fileSystem')
    setDataHandle(handle as unknown as FileSystemFileHandle)

    await saveDataFile(makeDataFile())

    expect(isHandleLost()).toBe(true)
  })

  it('clears isHandleLost after a successful write', async () => {
    const handle = makeHandle()
    vi.stubGlobal('showSaveFilePicker', vi.fn().mockResolvedValue(handle))

    const { saveDataFile, isHandleLost } = await import('@/lib/storage/fileSystem')

    // Simulate a prior lost state by forcing a failed write first via a bad handle,
    // then a good one via the picker.
    const badHandle = {
      ...makeHandle(),
      createWritable: vi.fn().mockRejectedValue(notFoundError()),
    }
    vi.stubGlobal(
      'showSaveFilePicker',
      vi.fn().mockResolvedValueOnce(badHandle).mockResolvedValue(handle)
    )

    await saveDataFile(makeDataFile()) // loses handle
    expect(isHandleLost()).toBe(true)

    await saveDataFile(makeDataFile()) // recovery — picker returns good handle
    expect(isHandleLost()).toBe(false)
  })
})

describe('readCurrentDataFile', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns { data, lastModified } when handle is injected and file is valid', async () => {
    const handle = makeHandle()
    const { setDataHandle, readCurrentDataFile } = await import('@/lib/storage/fileSystem')
    setDataHandle(handle as unknown as FileSystemFileHandle)

    const result = await readCurrentDataFile()
    expect(result).not.toBeNull()
    expect(result!.data.user.name).toBe('Test User')
    expect(result!.lastModified).toBe(FAKE_LAST_MODIFIED)
  })

  it('returns null when no handle is cached (does not open a picker)', async () => {
    const spy = vi.fn()
    vi.stubGlobal('showOpenFilePicker', spy)
    vi.stubGlobal('showSaveFilePicker', spy)

    const { readCurrentDataFile } = await import('@/lib/storage/fileSystem')
    expect(await readCurrentDataFile()).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  it('returns null when the file contains invalid JSON', async () => {
    const badHandle = {
      ...makeHandle(),
      getFile: vi
        .fn()
        .mockResolvedValue({ text: vi.fn().mockResolvedValue('not-json'), lastModified: 0 }),
    }
    const { setDataHandle, readCurrentDataFile } = await import('@/lib/storage/fileSystem')
    setDataHandle(badHandle as unknown as FileSystemFileHandle)

    expect(await readCurrentDataFile()).toBeNull()
  })

  it('returns null when the parsed JSON fails Zod validation', async () => {
    const corruptHandle = {
      ...makeHandle(),
      getFile: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(JSON.stringify({ user: null })),
        lastModified: 0,
      }),
    }
    const { setDataHandle, readCurrentDataFile } = await import('@/lib/storage/fileSystem')
    setDataHandle(corruptHandle as unknown as FileSystemFileHandle)

    expect(await readCurrentDataFile()).toBeNull()
  })

  it('returns null when getFile throws (e.g. file moved or deleted)', async () => {
    const brokenHandle = {
      ...makeHandle(),
      getFile: vi.fn().mockRejectedValue(new Error('NotFoundError')),
    }
    const { setDataHandle, readCurrentDataFile } = await import('@/lib/storage/fileSystem')
    setDataHandle(brokenHandle as unknown as FileSystemFileHandle)

    expect(await readCurrentDataFile()).toBeNull()
  })

  it('sets isHandleLost when getFile throws NotFoundError', async () => {
    const brokenHandle = {
      ...makeHandle(),
      getFile: vi.fn().mockRejectedValue(notFoundError()),
    }
    const { setDataHandle, readCurrentDataFile, isHandleLost } =
      await import('@/lib/storage/fileSystem')
    setDataHandle(brokenHandle as unknown as FileSystemFileHandle)

    await readCurrentDataFile()

    expect(isHandleLost()).toBe(true)
  })

  it('does NOT set isHandleLost for non-NotFoundError failures', async () => {
    const brokenHandle = {
      ...makeHandle(),
      getFile: vi.fn().mockRejectedValue(new Error('PermissionDenied')),
    }
    const { setDataHandle, readCurrentDataFile, isHandleLost } =
      await import('@/lib/storage/fileSystem')
    setDataHandle(brokenHandle as unknown as FileSystemFileHandle)

    await readCurrentDataFile()

    expect(isHandleLost()).toBe(false)
  })
})

describe('isHandleLost', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns false initially (no lost state)', async () => {
    const { isHandleLost } = await import('@/lib/storage/fileSystem')
    expect(isHandleLost()).toBe(false)
  })
})

describe('getLastWrittenModified', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns null before any write has occurred', async () => {
    const { getLastWrittenModified } = await import('@/lib/storage/fileSystem')
    expect(getLastWrittenModified()).toBeNull()
  })

  it('returns the lastModified from the file after a successful write', async () => {
    const handle = makeHandle()
    vi.stubGlobal('showSaveFilePicker', vi.fn().mockResolvedValue(handle))

    const { saveDataFile, getLastWrittenModified } = await import('@/lib/storage/fileSystem')
    await saveDataFile(makeDataFile())

    expect(getLastWrittenModified()).toBe(FAKE_LAST_MODIFIED)
  })

  it('remains null after a failed write', async () => {
    const handle = makeHandle()
    handle.createWritable = vi.fn().mockRejectedValue(new Error('Disk full'))
    vi.stubGlobal('showSaveFilePicker', vi.fn().mockResolvedValue(handle))

    const { saveDataFile, getLastWrittenModified } = await import('@/lib/storage/fileSystem')
    const ok = await saveDataFile(makeDataFile())

    expect(ok).toBe(false)
    expect(getLastWrittenModified()).toBeNull()
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
