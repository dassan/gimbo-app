import type { DataFile } from '@/types'
import { validateDataFile } from '@/lib/storage/schema'
import { clearIdb, saveToIdb } from '@/lib/storage/indexedDb'
import { saveDataFile } from '@/lib/storage/fileSystem'
import { mergeDataFiles } from '@/lib/storage/merge'

// ─── Import path ──────────────────────────────────────────────────────────────

/**
 * Import path — total replacement.
 *
 * Validates the given File via Zod, wipes the IDB ledger, and saves the parsed
 * DataFile in its place. Used only during onboarding. Never merges — it is a
 * complete replacement of whatever was previously stored.
 *
 * Throws if the file cannot be read, is not valid JSON, or fails Zod validation.
 */
export async function importFileToIdb(file: File): Promise<DataFile> {
  const text = await file.text()
  const data = validateDataFile(JSON.parse(text) as unknown)
  await clearIdb()
  await saveToIdb(data)
  return data
}

// ─── Sync path ────────────────────────────────────────────────────────────────

/**
 * Sync path — read-before-write merge.
 *
 * Merges the local DataFile with a disk snapshot by UUID and writes the result
 * to disk. If no disk snapshot is available, writes the local data as-is.
 * Used only in the ongoing sync flow (`persist()`). Never performs a total
 * replacement of local data.
 *
 * Returns the merged DataFile on success, or null if the write fails.
 * The caller is responsible for conflict detection before invoking this function.
 */
export async function syncToFile(
  local: DataFile,
  diskSnapshot: { data: DataFile } | null
): Promise<DataFile | null> {
  const toSave = diskSnapshot ? mergeDataFiles(local, diskSnapshot.data) : local
  const ok = await saveDataFile(toSave)
  return ok ? toSave : null
}
