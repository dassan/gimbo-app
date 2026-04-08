import { openDB } from 'idb'
import type { DataFile } from '@/types'

const DB_NAME = 'nexus-db'
const DB_VERSION = 2
const STORE_LEDGER = 'ledger'
const STORE_HANDLES = 'handles'
const KEY_CURRENT = 'current'
const KEY_DATA_HANDLE = 'data'

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_LEDGER)) {
        db.createObjectStore(STORE_LEDGER)
      }
      if (!db.objectStoreNames.contains(STORE_HANDLES)) {
        db.createObjectStore(STORE_HANDLES)
      }
    },
  })
}

// ─── DataFile ─────────────────────────────────────────────────────────────────

export async function saveToIdb(data: DataFile): Promise<void> {
  const db = await getDb()
  await db.put(STORE_LEDGER, data, KEY_CURRENT)
}

export async function loadFromIdb(): Promise<DataFile | null> {
  const db = await getDb()
  return ((await db.get(STORE_LEDGER, KEY_CURRENT)) as DataFile | undefined) ?? null
}

export async function clearIdb(): Promise<void> {
  const db = await getDb()
  await db.delete(STORE_LEDGER, KEY_CURRENT)
}

// ─── FileHandle ───────────────────────────────────────────────────────────────

export async function saveFileHandle(handle: FileSystemFileHandle): Promise<void> {
  const db = await getDb()
  await db.put(STORE_HANDLES, handle, KEY_DATA_HANDLE)
}

export async function loadFileHandle(): Promise<FileSystemFileHandle | null> {
  const db = await getDb()
  return (
    ((await db.get(STORE_HANDLES, KEY_DATA_HANDLE)) as FileSystemFileHandle | undefined) ?? null
  )
}

export async function clearFileHandle(): Promise<void> {
  const db = await getDb()
  await db.delete(STORE_HANDLES, KEY_DATA_HANDLE)
}
