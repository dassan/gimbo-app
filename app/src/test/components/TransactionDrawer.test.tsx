import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TransactionDrawer from '@/components/TransactionDrawer'
import { useDataStore } from '@/store/useDataStore'
import { makeDataFile } from '@/test/fixtures/dataFile'
import type { Transaction } from '@/types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const testAccount = {
  id: 'acc-1',
  name: 'Conta Teste',
  type: 'RETAIL' as const,
  balance: 0,
  includeInBalance: true,
}
const testCategory = {
  id: 'cat-1',
  parentId: null,
  name: 'Alimentação',
  icon: 'utensils',
  color: '#FF0000',
  type: 'EXPENSE' as const,
}

const testTransaction: Transaction = {
  id: 'tx-1',
  accountId: 'acc-1',
  categoryId: 'cat-1',
  amount: 150,
  type: 'EXPENSE',
  date: '2024-03-15',
  description: 'Almoço',
  isPaid: true,
  tags: [],
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useDataStore.setState({
    data: makeDataFile({ accounts: [testAccount], categories: [testCategory] }),
    unsyncedCount: 0,
  })
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderDrawer(props: Partial<Parameters<typeof TransactionDrawer>[0]> = {}) {
  return render(<TransactionDrawer open={true} onClose={vi.fn()} {...props} />)
}

// ─── Create mode ──────────────────────────────────────────────────────────────

describe('TransactionDrawer — create mode', () => {
  it('renders the "new transaction" title', () => {
    renderDrawer()
    expect(screen.getByText('transactions.new')).toBeInTheDocument()
  })

  it('renders the save button with type-specific label', () => {
    renderDrawer()
    expect(screen.getByRole('button', { name: /transactions\.save\.expense/i })).toBeInTheDocument()
  })

  it('does not render the delete button', () => {
    renderDrawer()
    expect(
      screen.queryByRole('button', { name: /transactions\.deleteTransaction/i })
    ).not.toBeInTheDocument()
  })

  it('calls addTransaction and onClose on save', async () => {
    const addTransaction = vi.fn()
    const onClose = vi.fn()
    useDataStore.setState({
      data: makeDataFile({ accounts: [testAccount], categories: [testCategory] }),
      unsyncedCount: 0,
    })
    vi.spyOn(useDataStore.getState(), 'addTransaction').mockImplementation(addTransaction)

    render(<TransactionDrawer open={true} onClose={onClose} />)

    const amountInput = screen.getByPlaceholderText('0,00')
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '10000')

    await userEvent.click(screen.getByRole('button', { name: /transactions\.save\.expense/i }))

    expect(addTransaction).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not save when amount is zero', () => {
    const addTransaction = vi.fn()
    vi.spyOn(useDataStore.getState(), 'addTransaction').mockImplementation(addTransaction)

    renderDrawer()

    const saveBtn = screen.getByRole('button', { name: /transactions\.save\.expense/i })
    expect(saveBtn).toBeDisabled()
    expect(addTransaction).not.toHaveBeenCalled()
  })
})

// ─── Edit mode ────────────────────────────────────────────────────────────────

describe('TransactionDrawer — edit mode', () => {
  it('renders the "edit transaction" title', () => {
    renderDrawer({ transaction: testTransaction })
    expect(screen.getByText('transactions.edit')).toBeInTheDocument()
  })

  it('pre-fills the amount field', () => {
    renderDrawer({ transaction: testTransaction })
    expect(screen.getByDisplayValue('150,00')).toBeInTheDocument()
  })

  it('pre-fills the description field', () => {
    renderDrawer({ transaction: testTransaction })
    expect(screen.getByDisplayValue('Almoço')).toBeInTheDocument()
  })

  it('renders the save-update button', () => {
    renderDrawer({ transaction: testTransaction })
    expect(screen.getByRole('button', { name: /transactions\.saveUpdate/i })).toBeInTheDocument()
  })

  it('renders the delete button', () => {
    renderDrawer({ transaction: testTransaction })
    expect(
      screen.getByRole('button', { name: /transactions\.deleteTransaction/i })
    ).toBeInTheDocument()
  })

  it('calls updateTransaction (not addTransaction) on save', async () => {
    const updateTransaction = vi.fn()
    const addTransaction = vi.fn()
    const onClose = vi.fn()
    vi.spyOn(useDataStore.getState(), 'updateTransaction').mockImplementation(updateTransaction)
    vi.spyOn(useDataStore.getState(), 'addTransaction').mockImplementation(addTransaction)

    render(<TransactionDrawer open={true} onClose={onClose} transaction={testTransaction} />)

    await userEvent.click(screen.getByRole('button', { name: /transactions\.saveUpdate/i }))

    expect(updateTransaction).toHaveBeenCalledOnce()
    expect(addTransaction).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('updateTransaction preserves the original id', async () => {
    const updateTransaction = vi.fn()
    vi.spyOn(useDataStore.getState(), 'updateTransaction').mockImplementation(updateTransaction)

    render(<TransactionDrawer open={true} onClose={vi.fn()} transaction={testTransaction} />)

    await userEvent.click(screen.getByRole('button', { name: /transactions\.saveUpdate/i }))

    expect(updateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ id: testTransaction.id })
    )
  })

  it('calls deleteTransaction and onClose when delete is clicked', async () => {
    const deleteTransaction = vi.fn()
    const onClose = vi.fn()
    vi.spyOn(useDataStore.getState(), 'deleteTransaction').mockImplementation(deleteTransaction)

    render(<TransactionDrawer open={true} onClose={onClose} transaction={testTransaction} />)

    await userEvent.click(screen.getByRole('button', { name: /transactions\.deleteTransaction/i }))

    expect(deleteTransaction).toHaveBeenCalledWith(testTransaction.id)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('resets to empty when reopened without transaction after editing', () => {
    const { rerender } = renderDrawer({ transaction: testTransaction })

    // Close and reopen without a transaction (create mode)
    rerender(<TransactionDrawer open={false} onClose={vi.fn()} />)
    rerender(<TransactionDrawer open={true} onClose={vi.fn()} />)

    expect(screen.getByDisplayValue('0,00')).toBeInTheDocument()
  })
})
