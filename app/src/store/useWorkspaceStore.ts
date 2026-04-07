import { create } from 'zustand'
import type { WorkspaceFile, Theme, Locale } from '@/types'
import { loadWorkspace, saveWorkspace } from '@/lib/storage/fileSystem'
import { createDefaultWorkspace } from '@/lib/storage/schema'

interface WorkspaceStore {
  workspace: WorkspaceFile

  init: () => void
  setTheme: (theme: Theme) => void
  setLocale: (locale: Locale) => void
  setDefaultView: (view: string) => void
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspace: createDefaultWorkspace(),

  init: () => {
    const saved = loadWorkspace()
    if (saved) set({ workspace: saved })
  },

  setTheme: (theme) => {
    const workspace = { ...get().workspace, theme }
    set({ workspace })
    saveWorkspace(workspace)
  },

  setLocale: (locale) => {
    const workspace = { ...get().workspace, locale }
    set({ workspace })
    saveWorkspace(workspace)
  },

  setDefaultView: (defaultView) => {
    const workspace = { ...get().workspace, defaultView }
    set({ workspace })
    saveWorkspace(workspace)
  },
}))
