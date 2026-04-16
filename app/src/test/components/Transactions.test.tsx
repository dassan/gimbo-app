import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Transactions from '@/pages/Transactions'
import { useDataStore } from '@/store/useDataStore'
import { makeDataFile } from '@/test/fixtures/dataFile'
import type { Account, Transaction } from '@/types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('react-router-dom', () => ({
  useOutletContext: () => ({ openTransactionDrawer: vi.fn() }),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

function makeRetailAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-retail',
    name: 'Conta Corrente',
    type: 'RETAIL',
    balance: 0,
    includeInBalance: true,
    ...overrides,
  }
}

function makeCreditAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-credit',
    name: 'Cartão Visa',
    type: 'CREDIT',
    balance: 0,
    includeInBalance: false,
    creditMetadata: { limit: 5000, closingDay: 20, dueDay: 10 },
    ...overrides,
  }
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    accountId: 'acc-retail',
    categoryId: '',
    amount: 100,
    type: 'EXPENSE',
    date: todayStr,
    description: 'Test',
    isPaid: true,
    tags: [],
    ...overrides,
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useDataStore.setState({ data: null, unsyncedCount: 0 })
})

// ─── M-32: Spending summary right column ─────────────────────────────────────

describe('Transactions — M-32: spending summary right column', () => {
  it('renders spending summary when there are EXPENSE transactions', () => {
    const retailAccount = makeRetailAccount()
    const expense = makeTransaction({ type: 'EXPENSE', amount: 250, description: 'Aluguel' })

    useDataStore.setState({
      data: makeDataFile({ accounts: [retailAccount], transactions: [expense] }),
      unsyncedCount: 0,
    })

    render(<Transactions />)

    expect(screen.getByText('creditCard.spendingSummary')).toBeInTheDocument()
    expect(screen.getByText('common.total')).toBeInTheDocument()
  })

  it('does not render spending summary when there are no EXPENSE transactions', () => {
    const retailAccount = makeRetailAccount()
    const income = makeTransaction({
      id: 'tx-inc',
      type: 'INCOME',
      amount: 3000,
      description: 'Salário',
    })

    useDataStore.setState({
      data: makeDataFile({ accounts: [retailAccount], transactions: [income] }),
      unsyncedCount: 0,
    })

    render(<Transactions />)

    expect(screen.queryByText('creditCard.spendingSummary')).not.toBeInTheDocument()
  })

  it('shows category name in spending summary breakdown', () => {
    const retailAccount = makeRetailAccount()
    const cat = {
      id: 'cat-food',
      name: 'Alimentação',
      icon: 'ShoppingCart',
      color: '#F00',
      parentId: null,
      type: 'EXPENSE' as const,
    }
    const expense = makeTransaction({ type: 'EXPENSE', amount: 120, categoryId: 'cat-food' })

    useDataStore.setState({
      data: makeDataFile({ accounts: [retailAccount], transactions: [expense], categories: [cat] }),
      unsyncedCount: 0,
    })

    render(<Transactions />)

    expect(screen.getAllByText('Alimentação').length).toBeGreaterThan(0)
  })

  it('spending summary total reflects only EXPENSE transactions', () => {
    const retailAccount = makeRetailAccount()
    const income = makeTransaction({
      id: 'tx-inc',
      type: 'INCOME',
      amount: 3000,
      description: 'Salário',
    })
    const expense = makeTransaction({
      id: 'tx-exp',
      type: 'EXPENSE',
      amount: 400,
      description: 'Mercado',
    })

    useDataStore.setState({
      data: makeDataFile({ accounts: [retailAccount], transactions: [income, expense] }),
      unsyncedCount: 0,
    })

    render(<Transactions />)

    // The spending summary total row should show expenses only (400, not 3000 or 2600)
    const totalRow = screen.getByText('common.total').closest('div')
    expect(totalRow?.textContent).toContain('400,00')
    expect(totalRow?.textContent).not.toContain('3.000,00')
  })

  it('spending summary does not include CREDIT account transactions', () => {
    const retailAccount = makeRetailAccount()
    const creditAccount = makeCreditAccount()
    const retailExpense = makeTransaction({
      id: 'tx-retail',
      accountId: 'acc-retail',
      type: 'EXPENSE',
      amount: 100,
      description: 'Conta retail',
    })
    const creditExpense = makeTransaction({
      id: 'tx-credit',
      accountId: 'acc-credit',
      type: 'EXPENSE',
      amount: 999,
      description: 'Compra no cartão',
    })

    useDataStore.setState({
      data: makeDataFile({
        accounts: [retailAccount, creditAccount],
        transactions: [retailExpense, creditExpense],
      }),
      unsyncedCount: 0,
    })

    render(<Transactions />)

    // Only retail expense (100) goes into the summary; credit (999) is excluded
    const totalRow = screen.getByText('common.total').closest('div')
    expect(totalRow?.textContent).toContain('100,00')
    expect(totalRow?.textContent).not.toContain('999')
  })
})

// ─── M-26: Cash-flow ledger filters ──────────────────────────────────────────

describe('Transactions — M-26: cash-flow ledger filters', () => {
  it('does not show EXPENSE transactions from a CREDIT account', () => {
    const retailAccount = makeRetailAccount()
    const creditAccount = makeCreditAccount()

    const retailExpense = makeTransaction({
      id: 'tx-retail',
      accountId: 'acc-retail',
      type: 'EXPENSE',
      description: 'Mercado Corrente',
    })
    const creditExpense = makeTransaction({
      id: 'tx-credit',
      accountId: 'acc-credit',
      type: 'EXPENSE',
      description: 'Cinema no Cartão',
    })

    useDataStore.setState({
      data: makeDataFile({
        accounts: [retailAccount, creditAccount],
        transactions: [retailExpense, creditExpense],
      }),
      unsyncedCount: 0,
    })

    render(<Transactions />)

    expect(screen.getByText('Mercado Corrente')).toBeInTheDocument()
    expect(screen.queryByText('Cinema no Cartão')).not.toBeInTheDocument()
  })

  it('does not show CREDIT_PAYMENT transactions', () => {
    const retailAccount = makeRetailAccount()
    const creditAccount = makeCreditAccount()

    const regularExpense = makeTransaction({
      id: 'tx-expense',
      accountId: 'acc-retail',
      description: 'Supermercado',
    })
    const creditPayment = makeTransaction({
      id: 'tx-cp',
      accountId: 'acc-credit',
      type: 'CREDIT_PAYMENT',
      amount: 500,
      description: 'Pagamento fatura',
      transferAccountId: 'acc-retail',
    })

    useDataStore.setState({
      data: makeDataFile({
        accounts: [retailAccount, creditAccount],
        transactions: [regularExpense, creditPayment],
      }),
      unsyncedCount: 0,
    })

    render(<Transactions />)

    expect(screen.getByText('Supermercado')).toBeInTheDocument()
    expect(screen.queryByText('Pagamento fatura')).not.toBeInTheDocument()
  })

  it('does not include CREDIT account in the filter dropdown', () => {
    const retailAccount = makeRetailAccount({ name: 'Nubank Conta' })
    const creditAccount = makeCreditAccount({ name: 'Nubank Cartão' })

    useDataStore.setState({
      data: makeDataFile({ accounts: [retailAccount, creditAccount], transactions: [] }),
      unsyncedCount: 0,
    })

    render(<Transactions />)

    // The accounts filter dropdown should list the retail account but not the credit account
    expect(screen.getByText('Nubank Conta')).toBeInTheDocument()
    expect(screen.queryByText('Nubank Cartão')).not.toBeInTheDocument()
  })

  it('consolidated flow excludes CREDIT account EXPENSE and CREDIT_PAYMENT', () => {
    const retailAccount = makeRetailAccount()
    const creditAccount = makeCreditAccount()

    const income = makeTransaction({
      id: 'tx-income',
      type: 'INCOME',
      amount: 3000,
      description: 'Salário',
    })
    const retailExpense = makeTransaction({
      id: 'tx-retail-exp',
      type: 'EXPENSE',
      amount: 500,
      description: 'Aluguel',
    })
    // These should NOT affect the consolidated total
    const creditExpense = makeTransaction({
      id: 'tx-credit-exp',
      accountId: 'acc-credit',
      type: 'EXPENSE',
      amount: 200,
      description: 'Restaurante Cartão',
    })
    const creditPayment = makeTransaction({
      id: 'tx-cp',
      accountId: 'acc-credit',
      type: 'CREDIT_PAYMENT',
      amount: 200,
      description: 'Pag. Cartão',
      transferAccountId: 'acc-retail',
    })

    useDataStore.setState({
      data: makeDataFile({
        accounts: [retailAccount, creditAccount],
        transactions: [income, retailExpense, creditExpense, creditPayment],
      }),
      unsyncedCount: 0,
    })

    render(<Transactions />)

    // Flow = 3000 - 500 = 2500 (credit expense and payment ignored)
    const footerSection = screen.getByText('transactions.positiveFlow').closest('div')
    expect(footerSection?.textContent).toContain('2.500,00')
  })
})
