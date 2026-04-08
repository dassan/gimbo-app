import type { DataFile, WorkspaceFile } from '@/types'

// showOpenFilePicker / showSaveFilePicker are part of the File System Access API
// and may not yet be in every TS DOM lib version — we augment Window minimally.
declare global {
  interface Window {
    showOpenFilePicker(opts?: object): Promise<FileSystemFileHandle[]>
    showSaveFilePicker(opts?: object): Promise<FileSystemFileHandle>
  }
}

// ─── data file ────────────────────────────────────────────────────────────────

// In-memory cache of the active handle. Restored from IDB on startup via
// setDataHandle(), or acquired fresh through createNewDataFile() / openDataFile().
let _dataHandle: FileSystemFileHandle | null = null

/** Inject a previously-persisted handle (e.g. restored from IndexedDB on startup). */
export function setDataHandle(handle: FileSystemFileHandle): void {
  _dataHandle = handle
}

/**
 * Open an existing data file via the File System Access API.
 * Returns the handle alongside the parsed DataFile so the caller
 * can persist the handle to IndexedDB.
 */
export async function openDataFile(): Promise<{
  handle: FileSystemFileHandle
  data: DataFile
} | null> {
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'Nexus Data', accept: { 'application/json': ['.json'] } }],
    })
    const file = await handle.getFile()
    const text = await file.text()
    const data = JSON.parse(text) as DataFile
    _dataHandle = handle
    return { handle, data }
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

/** Save DataFile to the cached handle. If no handle exists, opens showSaveFilePicker. */
export async function saveDataFile(data: DataFile): Promise<boolean> {
  try {
    if (!_dataHandle) {
      _dataHandle = await window.showSaveFilePicker({
        suggestedName: 'nexus-finances.json',
        types: [{ description: 'Nexus Data', accept: { 'application/json': ['.json'] } }],
      })
    }
    const writable = await _dataHandle.createWritable()
    await writable.write(JSON.stringify(data, null, 2))
    await writable.close()
    return true
  } catch {
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
