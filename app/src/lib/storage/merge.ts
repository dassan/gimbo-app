import type { DataFile } from '@/types'
import { applyRetention } from '@/lib/storage/schema'

/**
 * Merge two DataFile snapshots in memory using entity UUIDs.
 *
 * Use case: read-before-write sync. Before flushing local IDB state to disk,
 * read the current disk file and merge it with local data to recover any
 * entities that may have been lost due to partial IndexedDB eviction.
 *
 * Merge rules:
 * - user:         local wins (most recent edits)
 * - settings:     local wins, except fileCreatedAt which comes from disk
 *                 (preserves the original file creation date)
 * - entity arrays (accounts, categories, tags, transactions):
 *                 union by id — local item takes precedence for duplicate ids;
 *                 disk-only items are appended (recovery path)
 * - auditLog:     union by id, sorted ascending by timestamp, retention applied
 */
export function mergeDataFiles(local: DataFile, disk: DataFile): DataFile {
  return {
    schemaVersion: local.schemaVersion,
    user: local.user,
    settings: {
      ...local.settings,
      fileCreatedAt: disk.settings.fileCreatedAt,
    },
    accounts: mergeById(local.accounts, disk.accounts),
    categories: mergeById(local.categories, disk.categories),
    tags: mergeById(local.tags, disk.tags),
    transactions: mergeById(local.transactions, disk.transactions),
    auditLog: mergeAuditLog(local, disk),
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Union two arrays by `id`. Local items take precedence for duplicate ids. */
function mergeById<T extends { id: string }>(local: T[], disk: T[]): T[] {
  const localIds = new Set(local.map((item) => item.id))
  const diskOnly = disk.filter((item) => !localIds.has(item.id))
  return [...local, ...diskOnly]
}

/** Union audit logs by id, sort ascending by timestamp, apply retention. */
function mergeAuditLog(local: DataFile, disk: DataFile): DataFile['auditLog'] {
  const localIds = new Set(local.auditLog.map((e) => e.id))
  const diskOnly = disk.auditLog.filter((e) => !localIds.has(e.id))
  const merged = [...local.auditLog, ...diskOnly].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  )
  return applyRetention(merged, local.settings.auditLogRetentionLimit)
}
