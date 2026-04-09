import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useDataStore } from '@/store/useDataStore'
import Navbar from '@/components/Navbar'
import FAB from '@/components/FAB'
import TransactionDrawer from '@/components/TransactionDrawer'
import ConflictModal from '@/components/ConflictModal'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const NO_FAB_ROUTES = ['/settings']

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  const data = useDataStore((s) => s.data)
  const unsyncedCount = useDataStore((s) => s.unsyncedCount)
  const persist = useDataStore((s) => s.persist)
  const conflictData = useDataStore((s) => s.conflictData)
  const resolveConflict = useDataStore((s) => s.resolveConflict)
  const fileHandleLost = useDataStore((s) => s.fileHandleLost)

  const showFAB = !NO_FAB_ROUTES.some((r) => location.pathname.startsWith(r))

  const initials = data?.user.name
    ? data.user.name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U'

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Navbar
        initials={initials}
        unsyncedCount={unsyncedCount}
        fileHandleLost={fileHandleLost}
        onSync={async () => {
          await persist()
        }}
      />

      <main className="flex-1 pt-14">
        <ErrorBoundary fallback="card">
          <Outlet />
        </ErrorBoundary>
      </main>

      {showFAB && <FAB onClick={() => setDrawerOpen(true)} />}

      <TransactionDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {conflictData && (
        <ConflictModal
          onOverwrite={() => resolveConflict('overwrite')}
          onLoadCloud={() => void resolveConflict('load-cloud')}
        />
      )}
    </div>
  )
}
