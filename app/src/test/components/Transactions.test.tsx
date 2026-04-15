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

// ─── CC-22: CREDIT_PAYMENT display in ledger ──────────────────────────────────

describe('Transactions — CC-22: CREDIT_PAYMENT display', () => {
  it('shows transactions.creditPayment label for CREDIT_PAYMENT row', () => {
    const creditAccount = makeCreditAccount()
    const creditPayment = makeTransaction({
      id: 'tx-cp',
      accountId: creditAccount.id,
      type: 'CREDIT_PAYMENT',
      amount: 750,
      description: 'Pagamento fatura',
      transferAccountId: 'acc-retail',
    })

    useDataStore.setState({
      data: makeDataFile({
        accounts: [makeRetailAccount(), creditAccount],
        transactions: [creditPayment],
      }),
      unsyncedCount: 0,
    })

    render(<Transactions />)

    expect(screen.getByText('transactions.creditPayment')).toBeInTheDocument()
  })

  it('does not count CREDIT_PAYMENT in consolidated result', () => {
    const retailAccount = makeRetailAccount()
    const creditAccount = makeCreditAccount()

    const income = makeTransaction({
      id: 'tx-income',
      accountId: 'acc-retail',
      type: 'INCOME',
      amount: 1000,
    })
    const creditPayment = makeTransaction({
      id: 'tx-cp',
      accountId: 'acc-credit',
      type: 'CREDIT_PAYMENT',
      amount: 500,
      transferAccountId: 'acc-retail',
    })

    useDataStore.setState({
      data: makeDataFile({
        accounts: [retailAccount, creditAccount],
        transactions: [income, creditPayment],
      }),
      unsyncedCount: 0,
    })

    render(<Transactions />)

    // Consolidated = income - expense = 1000 (CREDIT_PAYMENT not counted as expense)
    // The footer shows "+1.000,00" for a positive flow
    // If CREDIT_PAYMENT was wrongly counted as expense: consolidated = 1000 - 500 = 500
    const positiveFlow = screen.getByText('transactions.positiveFlow')
    expect(positiveFlow).toBeInTheDocument()
    // The amount next to positiveFlow label should be +1.000,00 (the parent element)
    const footerSection = positiveFlow.closest('div')
    expect(footerSection?.textContent).toContain('1.000,00')
    expect(footerSection?.textContent).not.toContain('500,00')
  })

  it('shows CREDIT_PAYMENT transaction description in ledger', () => {
    const creditAccount = makeCreditAccount()
    const creditPayment = makeTransaction({
      id: 'tx-cp',
      accountId: creditAccount.id,
      type: 'CREDIT_PAYMENT',
      amount: 1200,
      description: 'Pag. Nubank',
      transferAccountId: 'acc-retail',
    })

    useDataStore.setState({
      data: makeDataFile({
        accounts: [makeRetailAccount(), creditAccount],
        transactions: [creditPayment],
      }),
      unsyncedCount: 0,
    })

    render(<Transactions />)

    expect(screen.getByText('Pag. Nubank')).toBeInTheDocument()
  })
})
