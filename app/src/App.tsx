import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { useDataStore } from '@/store/useDataStore'
import { loadFromIdb, loadFileHandle, loadSyncMeta } from '@/lib/storage/indexedDb'
import { checkHandlePermission } from '@/lib/storage/fileSystem'
import { initTabGuard } from '@/lib/tabGuard'
import AppLayout from '@/components/AppLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import Onboarding from '@/pages/Onboarding'
import Dashboard from '@/pages/Dashboard'
import Transactions from '@/pages/Transactions'
import Analytics from '@/pages/Analytics'
import Settings from '@/pages/Settings'
import CreditCardPage from '@/pages/CreditCard'

export default function App() {
  const initWorkspace = useWorkspaceStore((s) => s.init)
  const loadData = useDataStore((s) => s.loadData)
  const data = useDataStore((s) => s.data)
  const [hydrated, setHydrated] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        initWorkspace()
        const [saved, handle, syncMeta] = await Promise.all([
          loadFromIdb(),
          loadFileHandle(),
          loadSyncMeta(),
        ])
        if (saved) {
          loadData(saved)
          // loadData() resets unsyncedCount to 0; restore the persisted count
          // so the badge survives page reloads.
          if (syncMeta && syncMeta.unsyncedCount > 0) {
            useDataStore.setState({ unsyncedCount: syncMeta.unsyncedCount })
          }
        }
        if (handle) {
          const state = await checkHandlePermission(handle)
          if (state === 'prompt') {
            useDataStore.setState({ permissionNeeded: true })
          } else if (state === 'denied') {
            useDataStore.setState({ fileHandleLost: true })
          }
          // 'granted' → handle injected into _dataHandle by checkHandlePermission
        }
      } catch (err) {
        setInitError(err instanceof Error ? err.message : 'Erro ao carregar dados locais')
      } finally {
        setHydrated(true)
      }
    }
    void init()
  }, [initWorkspace, loadData])

  useEffect(() => {
    return initTabGuard(
      () => useDataStore.setState({ isSecondaryTab: true }),
      () => useDataStore.setState({ isSecondaryTab: false })
    )
  }, [])

  // Avoid flash of onboarding while IDB is loading
  if (!hydrated) return null

  if (initError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface p-8 text-center">
        <p className="text-sm font-semibold text-on-surface">
          Não foi possível carregar seus dados
        </p>
        <p className="max-w-sm text-xs text-on-surface/50">{initError}</p>
      </div>
    )
  }

  const isLoaded = data !== null

  return (
    <ErrorBoundary fallback="full-page">
      <BrowserRouter>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />

          {isLoaded ? (
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/credit-card/:accountId" element={<CreditCardPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          ) : (
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          )}
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
