import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConflictModal from '@/components/ConflictModal'

// ─── Mock i18next ─────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ConflictModal', () => {
  it('renders the conflict title and message', () => {
    render(<ConflictModal onOverwrite={vi.fn()} onLoadCloud={vi.fn()} />)

    expect(screen.getByText('sync.conflictTitle')).toBeInTheDocument()
    expect(screen.getByText('sync.conflictMessage')).toBeInTheDocument()
  })

  it('renders both action buttons', () => {
    render(<ConflictModal onOverwrite={vi.fn()} onLoadCloud={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'sync.overwrite' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'sync.loadCloud' })).toBeInTheDocument()
  })

  it('renders hint texts for both actions', () => {
    render(<ConflictModal onOverwrite={vi.fn()} onLoadCloud={vi.fn()} />)

    expect(screen.getByText('sync.overwriteHint')).toBeInTheDocument()
    expect(screen.getByText('sync.loadCloudHint')).toBeInTheDocument()
  })

  it('calls onOverwrite when the overwrite button is clicked', async () => {
    const onOverwrite = vi.fn().mockResolvedValue(undefined)
    render(<ConflictModal onOverwrite={onOverwrite} onLoadCloud={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'sync.overwrite' }))

    expect(onOverwrite).toHaveBeenCalledOnce()
  })

  it('calls onLoadCloud when the load-cloud button is clicked', async () => {
    const onLoadCloud = vi.fn()
    render(
      <ConflictModal onOverwrite={vi.fn().mockResolvedValue(undefined)} onLoadCloud={onLoadCloud} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'sync.loadCloud' }))

    expect(onLoadCloud).toHaveBeenCalledOnce()
  })
})
