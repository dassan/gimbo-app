import type { DataFile, WorkspaceFile } from '@/types'
import { validateDataFile } from '@/lib/storage/schema'

// showOpenFilePicker / showSaveFilePicker are part of the File System Access API
// and may not yet be in every TS DOM lib version — we augment Window minimally.
declare global {
  interface Window {
    showOpenFilePicker(opts?: object): Promise<FileSystemFileHandle[]>
    showSaveFilePicker(opts?: object): Promise<FileSystemFileHandle>
  }

  // queryPermission / requestPermission are part of the File System Access API
  // but not yet in the standard TS DOM lib.
  interface FileSystemFileHandle {
    queryPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
    requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
  }
}

// ─── FSA availability ─────────────────────────────────────────────────────────

/**
 * Returns true when the File System Access API is available (Chromium-based browsers).
 * Firefox and Safari do not implement showSaveFilePicker.
 */
export function isFsaSupported(): boolean {
  return typeof window?.showSaveFilePicker === 'function'
}

// ─── data file ────────────────────────────────────────────────────────────────

// In-memory cache of the active handle. Restored from IDB on startup via
// setDataHandle(), or acquired fresh through createNewDataFile() / openDataFile().
let _dataHandle: FileSystemFileHandle | null = null

// Handle restored from IDB whose permission state is 'prompt'. It is kept
// separate from _dataHandle so that _dataHandle only ever contains a handle
// that is known to be 'granted'. Promoted to _dataHandle by
// requestHandlePermission() after the user explicitly clicks the sync button.
let _pendingHandle: FileSystemFileHandle | null = null

// File.lastModified timestamp recorded after each successful write to disk.
// Used by persist() to detect external modifications between syncs:
// if the current File.lastModified > _lastWrittenModified, the file was changed
// externally (another device, cloud sync, manual edit) since our last write.
// Stored as Unix ms (same unit as File.lastModified) to avoid ISO string precision issues.
let _lastWrittenModified: number | null = null

// Set to true when a NotFoundError is thrown by getFile() or createWritable().
// Indicates the file associated with the handle no longer exists on disk (deleted,
// moved, or unmounted). Cleared back to false after a successful write.
let _handleLost = false

/** Inject a previously-persisted handle (e.g. restored from IndexedDB on startup). */
export function setDataHandle(handle: FileSystemFileHandle): void {
  _dataHandle = handle
}

/**
 * Check the permission state of a handle restored from IndexedDB.
 * Must be called on startup before any read/write attempt.
 *
 * - 'granted'  → injects into _dataHandle immediately; sync is ready.
 * - 'prompt'   → parks the handle in _pendingHandle; isPermissionNeeded()
 *                returns true so the UI can signal the user to click sync.
 * - 'denied'   → sets _handleLost so the UI shows the red lost-file badge.
 *
 * Returns the resolved PermissionState for the caller to react to.
 */
export async function checkHandlePermission(
  handle: FileSystemFileHandle
): Promise<PermissionState> {
  try {
    const state = await handle.queryPermission({ mode: 'readwrite' })
    if (state === 'granted') {
      _dataHandle = handle
    } else if (state === 'prompt') {
      _pendingHandle = handle
    } else {
      // 'denied' — treat the same as a lost handle
      _handleLost = true
    }
    return state
  } catch {
    // queryPermission itself failed (e.g. handle is stale / serialization error)
    _handleLost = true
    return 'denied'
  }
}

/**
 * Request permission for the pending handle.
 * Must be called inside a user-gesture handler (e.g. the sync button click)
 * because browsers enforce the user-activation requirement.
 *
 * - Returns true and promotes _pendingHandle → _dataHandle on 'granted'.
 * - Returns false and sets _handleLost on any other outcome.
 * - Returns false immediately if no pending handle exists.
 */
export async function requestHandlePermission(): Promise<boolean> {
  if (!_pendingHandle) return false
  try {
    const state = await _pendingHandle.requestPermission({ mode: 'readwrite' })
    if (state === 'granted') {
      _dataHandle = _pendingHandle
      _pendingHandle = null
      _handleLost = false
      return true
    }
  } catch {
    // requestPermission threw — treat as denied
  }
  _pendingHandle = null
  _handleLost = true
  return false
}

/** Return true when a handle is awaiting explicit user permission (state 'prompt'). */
export function isPermissionNeeded(): boolean {
  return _pendingHandle !== null
}

/** Return the File.lastModified timestamp recorded after the last successful write, or null. */
export function getLastWrittenModified(): number | null {
  return _lastWrittenModified
}

/** Return true if the last file operation failed with NotFoundError (file deleted/moved). */
export function isHandleLost(): boolean {
  return _handleLost
}

/**
 * Open an existing data file via the File System Access API.
 * Returns the handle alongside the raw File object so the caller
 * can validate and import the data via importFileToIdb().
 * Caches the handle in _dataHandle so future saveDataFile() calls
 * can write without opening a picker.
 */
export async function openDataFile(): Promise<{
  handle: FileSystemFileHandle
  file: File
} | null> {
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'Nexus Data', accept: { 'application/json': ['.json'] } }],
    })
    const file = await handle.getFile()
    _dataHandle = handle
    return { handle, file }
  } catch {
    return null
  }
}

/**
 * Create a brand-new data file on disk.
 * Opens showSaveFilePicker so the user can choose the filename and location.
 * Writes the initial DataFile JSON immediately and returns the handle.
 * Returns null if the user cancels.
 */
export async function createNewDataFile(
  data: DataFile,
  suggestedName = 'nexus-finances.json'
): Promise<FileSystemFileHandle | null> {
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{ description: 'Nexus Data', accept: { 'application/json': ['.json'] } }],
    })
    const writable = await handle.createWritable()
    await writable.write(JSON.stringify(data, null, 2))
    await writable.close()
    _dataHandle = handle
    return handle
  } catch {
    return null
  }
}

/**
 * Read the current data file from the cached handle without opening a picker.
 * Returns { data, lastModified } on success, or null if no handle is cached,
 * the file cannot be read, or Zod validation fails.
 * Failures are non-fatal — the caller should proceed without merging / conflict check.
 */
export async function readCurrentDataFile(): Promise<{
  data: DataFile
  lastModified: number
} | null> {
  if (!_dataHandle) return null
  try {
    const file = await _dataHandle.getFile()
    const text = await file.text()
    const parsed = JSON.parse(text) as unknown
    const data = validateDataFile(parsed)
    return { data, lastModified: file.lastModified }
  } catch (err) {
    if (err instanceof Error && err.name === 'NotFoundError') {
      _handleLost = true
      _dataHandle = null
    }
    return null
  }
}

/**
 * Save DataFile to the cached handle. If no handle exists, opens showSaveFilePicker.
 * On success, records File.lastModified (post-write OS timestamp) in _lastWrittenModified
 * so that the next persist() can detect external modifications via conflict detection.
 */
export async function saveDataFile(data: DataFile): Promise<boolean> {
  try {
    _dataHandle ??= await window.showSaveFilePicker({
      suggestedName: 'nexus-finances.json',
      types: [{ description: 'Nexus Data', accept: { 'application/json': ['.json'] } }],
    })
    const writable = await _dataHandle.createWritable()
    await writable.write(JSON.stringify(data, null, 2))
    await writable.close()
    // Record the OS-assigned lastModified AFTER the write completes.
    // We cannot use the ISO string embedded in the JSON (fileUpdatedAt) because
    // the OS timestamp is always slightly newer — comparing them would produce
    // a false conflict on every subsequent sync.
    try {
      const written = await _dataHandle.getFile()
      _lastWrittenModified = written.lastModified
    } catch {
      // Non-fatal: if we cannot read back, conflict detection will be skipped
      // for the next sync (getLastWrittenModified returns null).
    }
    _handleLost = false
    return true
  } catch (err) {
    if (err instanceof Error && err.name === 'NotFoundError') {
      _handleLost = true
      _dataHandle = null
    }
    return false
  }
}

/** Fallback: trigger a browser download of the data file. */
export function downloadDataFile(data: DataFile, filename = 'nexus-finances.json'): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── workspace.json ───────────────────────────────────────────────────────────

const WORKSPACE_KEY = 'nexus_workspace'

export function loadWorkspace(): WorkspaceFile | null {
  const raw = localStorage.getItem(WORKSPACE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as WorkspaceFile
  } catch {
    return null
  }
}

export function saveWorkspace(workspace: WorkspaceFile): void {
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace))
}
