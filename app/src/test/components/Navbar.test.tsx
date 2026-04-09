import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Navbar from '@/components/Navbar'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('react-router-dom', () => ({
  NavLink: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useNavigate: () => vi.fn(),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderNavbar(props: Partial<Parameters<typeof Navbar>[0]> = {}) {
  return render(
    <Navbar
      initials="TU"
      unsyncedCount={0}
      fileHandleLost={false}
      onSync={vi.fn().mockResolvedValue(undefined)}
      {...props}
    />
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Navbar — file handle lost state', () => {
  it('shows "!" badge when fileHandleLost is true', () => {
    renderNavbar({ fileHandleLost: true })

    const badge = screen.getByText('!')
    expect(badge).toBeInTheDocument()
  })

  it('hides badge when fileHandleLost is false and unsyncedCount is 0', () => {
    renderNavbar({ fileHandleLost: false, unsyncedCount: 0 })

    expect(screen.queryByText('!')).not.toBeInTheDocument()
  })

  it('shows numeric badge when fileHandleLost is false and unsyncedCount > 0', () => {
    renderNavbar({ fileHandleLost: false, unsyncedCount: 3 })

    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('calls onSync when fileHandleLost is true even if unsyncedCount is 0', async () => {
    const onSync = vi.fn().mockResolvedValue(undefined)
    renderNavbar({ fileHandleLost: true, unsyncedCount: 0, onSync })

    await userEvent.click(screen.getByRole('button', { name: 'sync.syncNow' }))

    expect(onSync).toHaveBeenCalledOnce()
  })

  it('does NOT call onSync when both fileHandleLost is false and unsyncedCount is 0', async () => {
    const onSync = vi.fn().mockResolvedValue(undefined)
    renderNavbar({ fileHandleLost: false, unsyncedCount: 0, onSync })

    await userEvent.click(screen.getByRole('button', { name: 'sync.syncNow' }))

    expect(onSync).not.toHaveBeenCalled()
  })
})
