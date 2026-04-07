import type { DataFile, WorkspaceFile } from '@/types'

// showOpenFilePicker / showSaveFilePicker are part of the File System Access API
// and may not yet be in every TS DOM lib version — we augment Window minimally.
declare global {
  interface Window {
    showOpenFilePicker(opts?: object): Promise<FileSystemFileHandle[]>
    showSaveFilePicker(opts?: object): Promise<FileSystemFileHandle>
  }
}

// ─── data.json ────────────────────────────────────────────────────────────────

let _dataHandle: FileSystemFileHandle | null = null

/** Open an existing data.json via the File System Access API. */
export async function openDataFile(): Promise<DataFile | null> {
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'Nexus Data', accept: { 'application/json': ['.json'] } }],
    })
    _dataHandle = handle
    const file = await _dataHandle.getFile()
    const text = await file.text()
    return JSON.parse(text) as DataFile
  } catch {
    return null
  }
}

/** Save DataFile to disk. Opens a save dialog on first call. */
export async function saveDataFile(data: DataFile): Promise<boolean> {
  try {
    if (!_dataHandle) {
      _dataHandle = await window.showSaveFilePicker({
        suggestedName: 'data.json',
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

/** Fallback: trigger a browser download of data.json. */
export function downloadDataFile(data: DataFile): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'data.json'
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
