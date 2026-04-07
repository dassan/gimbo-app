import { openDB } from 'idb'
import type { DataFile } from '@/types'

const DB_NAME = 'nexus-db'
const DB_VERSION = 1
const STORE = 'ledger'
const KEY = 'current'

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    },
  })
}

export async function saveToIdb(data: DataFile): Promise<void> {
  const db = await getDb()
  await db.put(STORE, data, KEY)
}

export async function loadFromIdb(): Promise<DataFile | null> {
  const db = await getDb()
  return ((await db.get(STORE, KEY)) as DataFile | undefined) ?? null
}

export async function clearIdb(): Promise<void> {
  const db = await getDb()
  await db.delete(STORE, KEY)
}
