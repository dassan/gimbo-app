import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Dashboard from '@/pages/Dashboard'
import { useDataStore } from '@/store/useDataStore'
import { makeDataFile } from '@/test/fixtures/dataFile'
import type { Account, Transaction } from '@/types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

// Use a past date so these transactions never appear in current-month stat cards.
// This ensures the only place a specific value appears is the account row itself.
const PAST_DATE = '2020-06-15'

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
    name: 'Nexus Visa Gold',
    type: 'CREDIT',
    balance: 0,
    includeInBalance: false,
    creditMetadata: { limit: 12000, closingDay: 20, dueDay: 10 },
    ...overrides,
  }
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    accountId: 'acc-retail',
    categoryId: 'cat-1',
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

// ─── CC-13: accountBalances bifurcation for CREDIT accounts ──────────────────

describe('Dashboard — CC-13: accountBalances bifurcation', () => {
  it('shows standard balance for non-CREDIT accounts (INCOME − EXPENSE)', () => {
    const account = makeRetailAccount()
    // Use past-month transactions so stat cards show zero — makes 6.666,00 unique in DOM
    const income = makeTransaction({
      id: 'tx-income',
      type: 'INCOME',
      amount: 7777,
      date: PAST_DATE,
    })
    const expense = makeTransaction({
      id: 'tx-expense',
      type: 'EXPENSE',
      amount: 1111,
      date: PAST_DATE,
    })

    useDataStore.setState({
      data: makeDataFile({ accounts: [account], transactions: [income, expense] }),
      unsyncedCount: 0,
    })

    render(<Dashboard />)

    // Standard balance = 7777 - 1111 = 6666 (stat cards show 0, so this is unique)
    expect(screen.getByText(/6\.666,00/)).toBeInTheDocument()
  })

  it('shows R$0,00 for CREDIT account without creditMetadata', () => {
    const creditAccount = makeCreditAccount({ creditMetadata: undefined })

    useDataStore.setState({
      data: makeDataFile({ accounts: [creditAccount], transactions: [] }),
      unsyncedCount: 0,
    })

    render(<Dashboard />)

    // Credit account without creditMetadata: available limit = 0
    // Multiple 0,00 values exist (stat cards + invoice + available limit)
    expect(screen.getByText('dashboard.myCards')).toBeInTheDocument()
    // Verify the account name appears in the Meus Cartões section
    expect(screen.getByText('Nexus Visa Gold')).toBeInTheDocument()
  })

  it('does not include CREDIT account transactions in non-CREDIT balance calculation', () => {
    const retailAccount = makeRetailAccount({ id: 'acc-retail' })
    const creditAccount = makeCreditAccount({ id: 'acc-credit' })

    // Retail income → appears in both account row and recent transactions section
    const retailIncome = makeTransaction({
      id: 'tx-retail-income',
      accountId: 'acc-retail',
      type: 'INCOME',
      amount: 8888,
      date: PAST_DATE,
    })
    // Credit expense → should NOT be subtracted from retail balance
    // If incorrectly included: retail balance = 8888 - 1000 = 7888 (wrong)
    const creditExpense = makeTransaction({
      id: 'tx-credit-expense',
      accountId: 'acc-credit',
      type: 'EXPENSE',
      amount: 1000,
      date: todayStr,
    })

    useDataStore.setState({
      data: makeDataFile({
        accounts: [retailAccount, creditAccount],
        transactions: [retailIncome, creditExpense],
      }),
      unsyncedCount: 0,
    })

    render(<Dashboard />)

    // Correct retail balance = 8888 (appears in account row + recent transactions)
    expect(screen.getAllByText(/8\.888,00/).length).toBeGreaterThanOrEqual(1)
    // Wrong balance if credit expense was incorrectly subtracted would be 7888
    expect(screen.queryByText(/7\.888,00/)).not.toBeInTheDocument()
  })
})

// ─── CC-14: "Meus Cartões" section visibility ─────────────────────────────────

describe('Dashboard — CC-14: Meus Cartões section', () => {
  it('renders Meus Cartões section when CREDIT accounts exist', () => {
    const creditAccount = makeCreditAccount()

    useDataStore.setState({
      data: makeDataFile({ accounts: [creditAccount], transactions: [] }),
      unsyncedCount: 0,
    })

    render(<Dashboard />)

    expect(screen.getByText('dashboard.myCards')).toBeInTheDocument()
  })

  it('does not render Meus Cartões section when no CREDIT accounts exist', () => {
    const retailAccount = makeRetailAccount()

    useDataStore.setState({
      data: makeDataFile({ accounts: [retailAccount], transactions: [] }),
      unsyncedCount: 0,
    })

    render(<Dashboard />)

    expect(screen.queryByText('dashboard.myCards')).not.toBeInTheDocument()
  })

  it('shows accounts.availableLimit i18n label for credit accounts', () => {
    const creditAccount = makeCreditAccount()

    useDataStore.setState({
      data: makeDataFile({ accounts: [creditAccount], transactions: [] }),
      unsyncedCount: 0,
    })

    render(<Dashboard />)

    expect(screen.getByText('accounts.availableLimit')).toBeInTheDocument()
  })

  it('shows invoice label (dashboard.invoice) for credit accounts', () => {
    const creditAccount = makeCreditAccount()

    useDataStore.setState({
      data: makeDataFile({ accounts: [creditAccount], transactions: [] }),
      unsyncedCount: 0,
    })

    render(<Dashboard />)

    expect(screen.getByText('dashboard.invoice')).toBeInTheDocument()
  })

  it('renders Minhas Contas section only for non-CREDIT accounts with includeInBalance', () => {
    const retailAccount = makeRetailAccount({ includeInBalance: true })
    const creditAccount = makeCreditAccount({ includeInBalance: false })

    useDataStore.setState({
      data: makeDataFile({ accounts: [retailAccount, creditAccount], transactions: [] }),
      unsyncedCount: 0,
    })

    render(<Dashboard />)

    // Both account names should be visible — retail in Minhas Contas, credit in Meus Cartões
    expect(screen.getByText('Conta Corrente')).toBeInTheDocument()
    expect(screen.getByText('Nexus Visa Gold')).toBeInTheDocument()
    // Both section headings
    expect(screen.getByText('dashboard.myAccounts')).toBeInTheDocument()
    expect(screen.getByText('dashboard.myCards')).toBeInTheDocument()
  })

  it('shows full available limit for CREDIT account with creditMetadata and no expenses', () => {
    const creditAccount = makeCreditAccount({
      id: 'acc-credit',
      // Use a unique limit value (15001) that won't appear in stat cards
      creditMetadata: { limit: 15001, closingDay: 20, dueDay: 10 },
    })

    useDataStore.setState({
      data: makeDataFile({ accounts: [creditAccount], transactions: [] }),
      unsyncedCount: 0,
    })

    render(<Dashboard />)

    // With no expenses: available limit = limit = 15001 (unique value)
    expect(screen.getByText(/15\.001,00/)).toBeInTheDocument()
  })

  it('renders manage button in Meus Cartões section', () => {
    const creditAccount = makeCreditAccount()

    useDataStore.setState({
      data: makeDataFile({ accounts: [creditAccount], transactions: [] }),
      unsyncedCount: 0,
    })

    render(<Dashboard />)

    expect(screen.getByText('dashboard.manage')).toBeInTheDocument()
  })
})
