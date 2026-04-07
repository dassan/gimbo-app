import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { useDataStore } from '@/store/useDataStore'
import { loadFromIdb } from '@/lib/storage/indexedDb'
import AppLayout from '@/components/AppLayout'
import Onboarding from '@/pages/Onboarding'
import Dashboard from '@/pages/Dashboard'
import Transactions from '@/pages/Transactions'
import Analytics from '@/pages/Analytics'
import Settings from '@/pages/Settings'

export default function App() {
  const initWorkspace = useWorkspaceStore((s) => s.init)
  const loadData = useDataStore((s) => s.loadData)
  const data = useDataStore((s) => s.data)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    async function init() {
      initWorkspace()
      const saved = await loadFromIdb()
      if (saved) loadData(saved)
      setHydrated(true)
    }
    init()
  }, [])

  // Avoid flash of onboarding while IDB is loading
  if (!hydrated) return null

  const isLoaded = data !== null

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />

        {isLoaded ? (
          <Route element={<AppLayout />}>
            <Route path="/dashboard"    element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/analytics"    element={<Analytics />} />
            <Route path="/settings"     element={<Settings />} />
            <Route path="*"             element={<Navigate to="/dashboard" replace />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  )
}
