import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock the `idb` module ────────────────────────────────────────────────────
// We replace openDB with a lightweight in-memory store so tests run without
// a real browser IndexedDB environment.

type Store = Record<string, Record<string, unknown>>
const _stores: Store = {}

function makeDb(stores: Store) {
  return {
    put: vi.fn(async (storeName: string, value: unknown, key: string) => {
      stores[storeName] ??= {}
      stores[storeName][key] = value
    }),
    get: vi.fn(async (storeName: string, key: string) => {
      return stores[storeName]?.[key]
    }),
    delete: vi.fn(async (storeName: string, key: string) => {
      if (stores[storeName]) delete stores[storeName][key]
    }),
  }
}

let _db: ReturnType<typeof makeDb>

vi.mock('idb', () => ({
  openDB: vi.fn((_name: string, _version: number, opts?: { upgrade?: (db: unknown) => void }) => {
    // Run upgrade callback once to simulate real openDB behaviour
    opts?.upgrade?.({
      objectStoreNames: { contains: () => false },
      createObjectStore: vi.fn(),
    })
    _db = makeDb(_stores)
    return Promise.resolve(_db)
  }),
}))

// Import AFTER mocking so the module picks up our mock
import {
  saveToIdb,
  loadFromIdb,
  clearIdb,
  saveFileHandle,
  loadFileHandle,
  clearFileHandle,
} from '@/lib/storage/indexedDb'
import { makeDataFile } from '@/test/fixtures/dataFile'

beforeEach(() => {
  // Reset in-memory store before each test
  for (const key of Object.keys(_stores)) delete _stores[key]
})

// ─── DataFile (existing behaviour preserved) ─────────────────────────────────

describe('saveToIdb / loadFromIdb', () => {
  it('persists and retrieves a DataFile', async () => {
    const data = makeDataFile()
    await saveToIdb(data)
    const loaded = await loadFromIdb()
    expect(loaded).toEqual(data)
  })

  it('returns null when nothing has been saved', async () => {
    const loaded = await loadFromIdb()
    expect(loaded).toBeNull()
  })
})

describe('clearIdb', () => {
  it('removes the stored DataFile', async () => {
    await saveToIdb(makeDataFile())
    await clearIdb()
    expect(await loadFromIdb()).toBeNull()
  })

  it('does not throw when called on an empty store', async () => {
    await expect(clearIdb()).resolves.toBeUndefined()
  })
})

// ─── FileHandle persistence ───────────────────────────────────────────────────

/** Minimal FileSystemFileHandle-like object for testing. */
function makeHandle(name = 'nexus-finances.json') {
  return { kind: 'file', name } as unknown as FileSystemFileHandle
}

describe('saveFileHandle / loadFileHandle', () => {
  it('persists and retrieves a FileSystemFileHandle', async () => {
    const handle = makeHandle()
    await saveFileHandle(handle)
    const loaded = await loadFileHandle()
    expect(loaded).toEqual(handle)
  })

  it('returns null when no handle has been saved', async () => {
    expect(await loadFileHandle()).toBeNull()
  })

  it('overwrites an existing handle', async () => {
    const first = makeHandle('first.json')
    const second = makeHandle('second.json')
    await saveFileHandle(first)
    await saveFileHandle(second)
    const loaded = await loadFileHandle()
    expect((loaded as { name: string }).name).toBe('second.json')
  })
})

describe('clearFileHandle', () => {
  it('removes the stored handle', async () => {
    await saveFileHandle(makeHandle())
    await clearFileHandle()
    expect(await loadFileHandle()).toBeNull()
  })

  it('does not throw when called on an empty store', async () => {
    await expect(clearFileHandle()).resolves.toBeUndefined()
  })
})

// ─── Isolation between ledger and handles stores ──────────────────────────────

describe('store isolation', () => {
  it('clearing the ledger does not remove the file handle', async () => {
    const data = makeDataFile()
    const handle = makeHandle()
    await saveToIdb(data)
    await saveFileHandle(handle)
    await clearIdb()
    expect(await loadFromIdb()).toBeNull()
    expect(await loadFileHandle()).toEqual(handle)
  })

  it('clearing the handle does not remove ledger data', async () => {
    const data = makeDataFile()
    const handle = makeHandle()
    await saveToIdb(data)
    await saveFileHandle(handle)
    await clearFileHandle()
    expect(await loadFromIdb()).toEqual(data)
    expect(await loadFileHandle()).toBeNull()
  })
})
