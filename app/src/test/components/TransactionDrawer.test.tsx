import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
const testCreditAccount = {
  id: 'acc-credit',
  name: 'Cartão Nubank',
  type: 'CREDIT' as const,
  balance: 0,
  includeInBalance: false,
  creditMetadata: { limit: 5000, closingDay: 20, dueDay: 10 },
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

// ─── CC-19: CREDIT_PAYMENT two-account flow ───────────────────────────────────

describe('TransactionDrawer — CC-19: CREDIT_PAYMENT flow', () => {
  beforeEach(() => {
    useDataStore.setState({
      data: makeDataFile({
        accounts: [testAccount, testCreditAccount],
        categories: [testCategory],
      }),
      unsyncedCount: 0,
    })
  })

  it('shows "transactions.creditPayment" tab in type selector', () => {
    renderDrawer()
    expect(screen.getByRole('button', { name: 'transactions.creditPayment' })).toBeInTheDocument()
  })

  it('shows cardToPay and payFrom labels when CREDIT_PAYMENT is selected', async () => {
    renderDrawer()
    await userEvent.click(screen.getByRole('button', { name: 'transactions.creditPayment' }))
    expect(screen.getByText('transactions.cardToPay')).toBeInTheDocument()
    expect(screen.getByText('transactions.payFrom')).toBeInTheDocument()
  })

  it('hides standard account selector and category when CREDIT_PAYMENT is selected', async () => {
    renderDrawer()
    // Standard account label is visible before switch
    expect(screen.getByText('transactions.account')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'transactions.creditPayment' }))
    expect(screen.queryByText('transactions.account')).not.toBeInTheDocument()
    expect(screen.queryByText('transactions.category')).not.toBeInTheDocument()
  })

  it('cardToPay selector only lists CREDIT accounts', async () => {
    renderDrawer()
    await userEvent.click(screen.getByRole('button', { name: 'transactions.creditPayment' }))
    // The credit account should be in the cardToPay select options
    const selects = screen.getAllByRole('combobox')
    // First select = cardToPay (credit accounts)
    const cardToPaySelect = selects[0]
    expect(cardToPaySelect).toHaveDisplayValue(testCreditAccount.name)
  })

  it('payFrom selector only lists non-CREDIT accounts', async () => {
    renderDrawer()
    await userEvent.click(screen.getByRole('button', { name: 'transactions.creditPayment' }))
    const selects = screen.getAllByRole('combobox')
    // Second select = payFrom (non-credit accounts)
    const payFromSelect = selects[1]
    expect(payFromSelect).toHaveDisplayValue(testAccount.name)
  })

  it('save button shows credit_payment label', async () => {
    renderDrawer()
    await userEvent.click(screen.getByRole('button', { name: 'transactions.creditPayment' }))
    expect(
      screen.getByRole('button', { name: /transactions\.save\.credit_payment/i })
    ).toBeInTheDocument()
  })

  it('calls addTransaction with transferAccountId when CREDIT_PAYMENT is saved', async () => {
    const addTransaction = vi.fn()
    const onClose = vi.fn()
    vi.spyOn(useDataStore.getState(), 'addTransaction').mockImplementation(addTransaction)

    render(<TransactionDrawer open={true} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'transactions.creditPayment' }))

    const amountInput = screen.getByPlaceholderText('0,00')
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '50000')

    await userEvent.click(
      screen.getByRole('button', { name: /transactions\.save\.credit_payment/i })
    )

    expect(addTransaction).toHaveBeenCalledOnce()
    expect(addTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CREDIT_PAYMENT',
        accountId: testCreditAccount.id,
        transferAccountId: testAccount.id,
      })
    )
    expect(onClose).toHaveBeenCalledOnce()
  })
})

// ─── CC-20: current invoice balance hint ─────────────────────────────────────

describe('TransactionDrawer — CC-20: invoice balance hint', () => {
  beforeEach(() => {
    useDataStore.setState({
      data: makeDataFile({
        accounts: [testAccount, testCreditAccount],
        categories: [testCategory],
        // Add an expense on the credit account in current period
        transactions: [
          {
            id: 'tx-credit',
            accountId: testCreditAccount.id,
            categoryId: 'cat-1',
            amount: 300,
            type: 'EXPENSE',
            date: new Date().toISOString().slice(0, 10),
            description: 'Compra',
            isPaid: false,
            tags: [],
          },
        ],
      }),
      unsyncedCount: 0,
    })
  })

  it('shows invoice hint when CREDIT_PAYMENT is selected and credit account has creditMetadata', async () => {
    renderDrawer()
    await userEvent.click(screen.getByRole('button', { name: 'transactions.creditPayment' }))
    expect(screen.getByText('transactions.currentInvoice')).toBeInTheDocument()
  })

  it('does not show invoice hint when type is not CREDIT_PAYMENT', () => {
    renderDrawer()
    expect(screen.queryByText('transactions.currentInvoice')).not.toBeInTheDocument()
  })
})

// ─── CC-23: Installment section ───────────────────────────────────────────────

describe('TransactionDrawer — CC-23: installment section', () => {
  beforeEach(() => {
    useDataStore.setState({
      data: makeDataFile({
        accounts: [testAccount, testCreditAccount],
        categories: [testCategory],
      }),
      unsyncedCount: 0,
    })
  })

  it('shows installment toggle when EXPENSE on CREDIT account (select changed to credit)', async () => {
    renderDrawer()
    // By default, first account (testAccount = RETAIL) is selected — no installment section
    expect(screen.queryByText('transactions.installments')).not.toBeInTheDocument()
    // Change account selector to credit account (first combobox is the account selector)
    const selects = screen.getAllByRole('combobox')
    await userEvent.selectOptions(selects[0], testCreditAccount.id)
    // Now the installment toggle should appear
    expect(screen.getByText('transactions.installments')).toBeInTheDocument()
  })

  it('does not show installment toggle for EXPENSE on non-CREDIT account', () => {
    renderDrawer()
    // testAccount is RETAIL — no installment section
    expect(screen.queryByText('transactions.installments')).not.toBeInTheDocument()
  })

  it('does not show installment toggle when type is INCOME even with CREDIT account', async () => {
    // Set up store with only a credit account so it auto-selects
    useDataStore.setState({
      data: makeDataFile({ accounts: [testCreditAccount], categories: [testCategory] }),
      unsyncedCount: 0,
    })
    renderDrawer()
    // Switch to INCOME type
    await userEvent.click(screen.getByRole('button', { name: 'transactions.income' }))
    expect(screen.queryByText('transactions.installments')).not.toBeInTheDocument()
  })

  it('shows installment toggle when EXPENSE and only a CREDIT account is in store', () => {
    useDataStore.setState({
      data: makeDataFile({ accounts: [testCreditAccount], categories: [testCategory] }),
      unsyncedCount: 0,
    })
    renderDrawer()
    // With only the credit account auto-selected and EXPENSE type, toggle appears
    expect(screen.getByText('transactions.installments')).toBeInTheDocument()
  })

  it('shows installment count field when toggle is enabled', async () => {
    useDataStore.setState({
      data: makeDataFile({ accounts: [testCreditAccount], categories: [testCategory] }),
      unsyncedCount: 0,
    })
    renderDrawer()
    const toggle = screen.getByRole('switch', { name: 'transactions.installments' })
    await userEvent.click(toggle)
    expect(screen.getByText('transactions.installmentCount')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })

  it('does not show installment section in edit mode', () => {
    const creditTx: Transaction = {
      id: 'tx-inst',
      accountId: testCreditAccount.id,
      categoryId: 'cat-1',
      amount: 300,
      type: 'EXPENSE',
      date: '2024-03-15',
      description: 'Compra',
      isPaid: false,
      tags: [],
      installment: { parentId: 'parent-1', currentIndex: 1, total: 3 },
    }
    renderDrawer({ transaction: creditTx })
    expect(screen.queryByText('transactions.installments')).not.toBeInTheDocument()
  })

  it('shows installment hint when toggle enabled and amount > 0', async () => {
    useDataStore.setState({
      data: makeDataFile({ accounts: [testCreditAccount], categories: [testCategory] }),
      unsyncedCount: 0,
    })
    renderDrawer()
    const toggle = screen.getByRole('switch', { name: 'transactions.installments' })
    await userEvent.click(toggle)

    // Enter an amount so the hint appears
    const amountInput = screen.getByPlaceholderText('0,00')
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '30000')

    expect(screen.getByText(/transactions\.installmentHint/i)).toBeInTheDocument()
  })

  it('calls addTransaction with installment data when enabled', async () => {
    useDataStore.setState({
      data: makeDataFile({ accounts: [testCreditAccount], categories: [testCategory] }),
      unsyncedCount: 0,
    })
    const addTransaction = vi.fn()
    vi.spyOn(useDataStore.getState(), 'addTransaction').mockImplementation(addTransaction)

    renderDrawer()
    // Enable installment toggle
    const toggle = screen.getByRole('switch', { name: 'transactions.installments' })
    await userEvent.click(toggle)

    // Enter amount
    const amountInput = screen.getByPlaceholderText('0,00')
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '30000')

    await userEvent.click(screen.getByRole('button', { name: /transactions\.save\.expense/i }))

    expect(addTransaction).toHaveBeenCalledOnce()
    const arg = addTransaction.mock.calls[0][0] as Transaction
    expect(arg.installment).toBeDefined()
    expect(arg.installment?.total).toBe(2) // default installmentCount is 2
    expect(arg.installment?.currentIndex).toBe(1)
    expect(arg.installment?.parentId).toBeDefined()
  })
})

// ─── CC-26: Installment deletion modal ───────────────────────────────────────

describe('TransactionDrawer — CC-26: installment deletion modal', () => {
  const installmentTx: Transaction = {
    id: 'tx-inst-1',
    accountId: testCreditAccount.id,
    categoryId: 'cat-1',
    amount: 100,
    type: 'EXPENSE',
    date: '2024-03-15',
    description: 'Viagem (1/3)',
    isPaid: false,
    tags: [],
    installment: { parentId: 'parent-123', currentIndex: 1, total: 3 },
  }

  const nonInstallmentTx: Transaction = {
    ...testTransaction,
    id: 'tx-regular',
  }

  beforeEach(() => {
    useDataStore.setState({
      data: makeDataFile({
        accounts: [testAccount, testCreditAccount],
        categories: [testCategory],
        transactions: [installmentTx],
      }),
      unsyncedCount: 0,
    })
  })

  it('shows installment delete modal when delete is clicked for installment transaction', async () => {
    renderDrawer({ transaction: installmentTx })
    await userEvent.click(screen.getByRole('button', { name: /transactions\.deleteTransaction/i }))
    expect(screen.getByText('transactions.deleteInstallmentTitle')).toBeInTheDocument()
  })

  it('shows delete options with current/total and total count', async () => {
    renderDrawer({ transaction: installmentTx })
    await userEvent.click(screen.getByRole('button', { name: /transactions\.deleteTransaction/i }))
    expect(screen.getByText(/transactions\.deleteOnlyThis/i)).toBeInTheDocument()
    expect(screen.getByText(/transactions\.deleteAllInstallments/i)).toBeInTheDocument()
    expect(screen.getByText(/common\.cancel/i)).toBeInTheDocument()
  })

  it('calls deleteTransaction when "delete only this" is clicked', async () => {
    const deleteTransaction = vi.fn()
    const onClose = vi.fn()
    vi.spyOn(useDataStore.getState(), 'deleteTransaction').mockImplementation(deleteTransaction)

    render(<TransactionDrawer open={true} onClose={onClose} transaction={installmentTx} />)
    await userEvent.click(screen.getByRole('button', { name: /transactions\.deleteTransaction/i }))
    await userEvent.click(screen.getByText(/transactions\.deleteOnlyThis/i))

    expect(deleteTransaction).toHaveBeenCalledWith(installmentTx.id)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls deleteInstallmentGroup when "delete all" is clicked', async () => {
    const deleteInstallmentGroup = vi.fn()
    const onClose = vi.fn()
    vi.spyOn(useDataStore.getState(), 'deleteInstallmentGroup').mockImplementation(
      deleteInstallmentGroup
    )

    render(<TransactionDrawer open={true} onClose={onClose} transaction={installmentTx} />)
    await userEvent.click(screen.getByRole('button', { name: /transactions\.deleteTransaction/i }))
    await userEvent.click(screen.getByText(/transactions\.deleteAllInstallments/i))

    expect(deleteInstallmentGroup).toHaveBeenCalledWith(installmentTx.installment!.parentId)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('dismisses modal when cancel is clicked', async () => {
    renderDrawer({ transaction: installmentTx })
    await userEvent.click(screen.getByRole('button', { name: /transactions\.deleteTransaction/i }))
    expect(screen.getByText('transactions.deleteInstallmentTitle')).toBeInTheDocument()
    await userEvent.click(screen.getByText(/common\.cancel/i))
    expect(screen.queryByText('transactions.deleteInstallmentTitle')).not.toBeInTheDocument()
  })

  it('calls deleteTransaction directly for non-installment transaction (no modal)', async () => {
    useDataStore.setState({
      data: makeDataFile({
        accounts: [testAccount, testCreditAccount],
        categories: [testCategory],
        transactions: [nonInstallmentTx],
      }),
      unsyncedCount: 0,
    })
    const deleteTransaction = vi.fn()
    const onClose = vi.fn()
    vi.spyOn(useDataStore.getState(), 'deleteTransaction').mockImplementation(deleteTransaction)

    render(<TransactionDrawer open={true} onClose={onClose} transaction={nonInstallmentTx} />)
    await userEvent.click(screen.getByRole('button', { name: /transactions\.deleteTransaction/i }))

    // No modal, direct deletion
    expect(screen.queryByText('transactions.deleteInstallmentTitle')).not.toBeInTheDocument()
    expect(deleteTransaction).toHaveBeenCalledWith(nonInstallmentTx.id)
    expect(onClose).toHaveBeenCalledOnce()
  })
})

// ─── M-20: auto-focus amount field on open ────────────────────────────────────

describe('TransactionDrawer — M-20: auto-focus amount field on open', () => {
  beforeEach(() => {
    useDataStore.setState({
      data: makeDataFile({ accounts: [testAccount], categories: [testCategory] }),
      unsyncedCount: 0,
    })
  })

  it('auto-focuses the amount input when opened in create mode', async () => {
    renderDrawer()
    await waitFor(() => {
      expect(screen.getByPlaceholderText('0,00')).toHaveFocus()
    })
  })

  it('auto-focuses the amount input when opened in edit mode', async () => {
    renderDrawer({ transaction: testTransaction })
    await waitFor(() => {
      expect(screen.getByDisplayValue('150,00')).toHaveFocus()
    })
  })
})
