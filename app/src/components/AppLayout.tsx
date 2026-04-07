import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useDataStore } from '@/store/useDataStore'
import Navbar from '@/components/Navbar'
import FAB from '@/components/FAB'
import TransactionDrawer from '@/components/TransactionDrawer'

const NO_FAB_ROUTES = ['/settings']

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const data = useDataStore((s) => s.data)

  const showFAB = !NO_FAB_ROUTES.some((r) => location.pathname.startsWith(r))

  // Derive initials from user name for avatar
  const initials = data?.user.name
    ? data.user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Navbar initials={initials} />

      <main className="flex-1 pt-14">
        <Outlet />
      </main>

      {showFAB && <FAB onClick={() => setDrawerOpen(true)} />}

      <TransactionDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
