import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Settings, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/dashboard',     key: 'nav.dashboard' },
  { to: '/transactions',  key: 'nav.transactions' },
  { to: '/analytics',     key: 'nav.analytics' },
]

interface NavbarProps {
  initials?: string
}

export default function Navbar({ initials = 'U' }: NavbarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between bg-white/80 px-6 backdrop-blur-[24px]"
            style={{ boxShadow: '0px 1px 0px rgba(25,28,29,0.06)' }}>
      {/* Logo + nav */}
      <div className="flex items-center gap-8">
        <span className="text-sm font-semibold tracking-tight text-on-surface">
          Nexus <span className="text-primary">Finance</span>
        </span>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ to, key }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'relative px-3 py-4 text-sm font-medium transition-colors',
                  isActive ? 'text-on-surface' : 'text-on-surface/40 hover:text-on-surface/70'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {t(key)}
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          aria-label="Notificações"
          className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface/40 hover:bg-surface-container-low hover:text-on-surface/70 transition-colors"
        >
          <Bell size={18} strokeWidth={1.5} />
        </button>

        <button
          aria-label="Configurações"
          onClick={() => navigate('/settings')}
          className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface/40 hover:bg-surface-container-low hover:text-on-surface/70 transition-colors"
        >
          <Settings size={18} strokeWidth={1.5} />
        </button>

        {/* Avatar decorativo */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-white">
          {initials}
        </div>
      </div>
    </header>
  )
}
