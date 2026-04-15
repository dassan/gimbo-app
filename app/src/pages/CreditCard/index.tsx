import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CreditCard } from 'lucide-react'
import { useDataStore } from '@/store/useDataStore'
import { useOutletContext } from 'react-router-dom'
import {
  formatCurrency,
  cn,
  parseDateLocal,
  getInvoicePeriod,
  getInvoiceDueDate,
  getCurrentInvoiceBalance,
} from '@/lib/utils'
import type { AppLayoutContext } from '@/components/AppLayout'
import type { Transaction } from '@/types'

// Months labels in pt-BR for the invoice period heading
const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export default function CreditCardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { accountId } = useParams<{ accountId: string }>()
  const data = useDataStore((s) => s.data)
  const { openTransactionDrawer } = useOutletContext<AppLayoutContext>()

  // Invoice period navigation offset (0 = current, -1 = previous, etc.)
  const [periodOffset, setPeriodOffset] = useState(0)
  // Category filter
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const account = useMemo(() => data?.accounts.find((a) => a.id === accountId), [data, accountId])

  // Resolve the invoice period (1-based month) for the current offset
  const resolvedPeriod = useMemo(() => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    if (!account?.creditMetadata) {
      return { year: today.getFullYear(), month: today.getMonth() + 1 }
    }
    const base = getInvoicePeriod(todayStr, account.creditMetadata.closingDay)
    let m = base.month + periodOffset
    let y = base.year
    while (m < 1) {
      m += 12
      y--
    }
    while (m > 12) {
      m -= 12
      y++
    }
    return { year: y, month: m }
  }, [account, periodOffset])

  // Closing and due dates for the displayed period
  const { closingDateStr, dueDateStr } = useMemo(() => {
    if (!account?.creditMetadata) return { closingDateStr: '', dueDateStr: '' }
    const { closingDay, dueDay } = account.creditMetadata
    // Closing date: last day of the period month at closingDay
    const closingYear = resolvedPeriod.year
    const closingMonth = resolvedPeriod.month // 1-based
    const daysInClosingMonth = new Date(closingYear, closingMonth, 0).getDate()
    const actualClosingDay = Math.min(closingDay, daysInClosingMonth)
    const closingDateStr = `${closingYear}-${String(closingMonth).padStart(2, '0')}-${String(actualClosingDay).padStart(2, '0')}`

    const dueDateStr = getInvoiceDueDate(resolvedPeriod, dueDay)
    return { closingDateStr, dueDateStr }
  }, [account, resolvedPeriod])

  // Transactions belonging to this invoice period
  const invoiceTransactions = useMemo(() => {
    if (!data || !account?.creditMetadata) return []
    const { closingDay } = account.creditMetadata
    return data.transactions.filter((tx) => {
      if (tx.accountId !== account.id) return false
      if (tx.type !== 'EXPENSE') return false // only expenses belong to the invoice
      const period = getInvoicePeriod(tx.date, closingDay)
      return period.year === resolvedPeriod.year && period.month === resolvedPeriod.month
    })
  }, [data, account, resolvedPeriod])

  // Category totals for the spending summary
  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {}
    invoiceTransactions.forEach((tx) => {
      const catName = data?.categories.find((c) => c.id === tx.categoryId)?.name ?? 'Outros'
      map[catName] = (map[catName] ?? 0) + tx.amount
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, total]) => ({ name, total }))
  }, [invoiceTransactions, data])

  // Category options for the filter chips
  const categoryOptions = useMemo(() => {
    const seen = new Set<string>()
    const cats: { id: string; name: string }[] = []
    invoiceTransactions.forEach((tx) => {
      const cat = data?.categories.find((c) => c.id === tx.categoryId)
      if (cat && !seen.has(cat.id)) {
        seen.add(cat.id)
        cats.push({ id: cat.id, name: cat.name })
      }
    })
    return cats
  }, [invoiceTransactions, data])

  // Filtered transactions by selected category
  const filteredTransactions = useMemo(() => {
    if (filterCategory === 'all') return invoiceTransactions
    return invoiceTransactions.filter((tx) => tx.categoryId === filterCategory)
  }, [invoiceTransactions, filterCategory])

  const invoiceTotal = invoiceTransactions.reduce((s, tx) => s + tx.amount, 0)
  const availableLimit =
    account?.creditMetadata && data
      ? account.creditMetadata.limit - getCurrentInvoiceBalance(data.transactions, account)
      : 0

  if (!data) return null

  if (!account || account.type !== 'CREDIT') {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <p className="text-sm text-on-surface/40">{t('common.noData')}</p>
      </div>
    )
  }

  const monthLabel = MONTH_NAMES_PT[(resolvedPeriod.month - 1 + 12) % 12]

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
      {/* ── Header: back + card name ──────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => void navigate('/dashboard')}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-low text-on-surface/60 hover:bg-surface-container-high transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-on-surface text-white">
            <CreditCard size={14} strokeWidth={1.5} />
          </div>
          <h1 className="text-base font-semibold text-on-surface">{account.name}</h1>
        </div>
      </div>

      {/* ── Invoice period + summary card ─────────────────────────────────── */}
      <div
        className="rounded-2xl bg-white p-6"
        style={{ boxShadow: '0px 4px 20px rgba(25,28,29,0.04)' }}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left: period info */}
          <div className="flex-1">
            <p className="label text-xs text-on-surface/40 uppercase tracking-widest mb-1">
              {t('creditCard.invoicePeriod')}
            </p>
            <h2 className="text-3xl font-bold text-on-surface">{monthLabel}</h2>
            {closingDateStr && dueDateStr && (
              <div className="flex items-center gap-4 mt-2">
                <div>
                  <p className="text-[10px] text-on-surface/40 uppercase tracking-wider">
                    {t('creditCard.closingDate')}
                  </p>
                  <p className="text-xs font-semibold text-on-surface">
                    {parseDateLocal(closingDateStr).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-on-surface/40 uppercase tracking-wider">
                    {t('creditCard.dueDate')}
                  </p>
                  <p className="text-xs font-semibold text-tertiary">
                    {parseDateLocal(dueDateStr).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right: balance + pay button */}
          <div className="text-right space-y-2">
            <div>
              <p className="text-[10px] text-on-surface/40 uppercase tracking-widest">
                {t('accounts.availableLimit')}
              </p>
              <p
                className={cn(
                  'text-sm font-semibold',
                  availableLimit < 0 ? 'text-tertiary' : 'text-primary'
                )}
              >
                {formatCurrency(availableLimit)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-on-surface/40 uppercase tracking-widest">
                {t('dashboard.invoice')}
              </p>
              <p className="text-2xl font-bold text-on-surface">{formatCurrency(invoiceTotal)}</p>
            </div>
            <button
              onClick={() => openTransactionDrawer()}
              className="rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:brightness-110 transition-all"
            >
              {t('creditCard.payNow')}
            </button>
          </div>
        </div>

        {/* Period navigation */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-container-low">
          <button
            onClick={() => setPeriodOffset((o) => o - 1)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-low text-on-surface/60 hover:bg-surface-container-high transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-medium text-on-surface/60">
            {monthLabel} {resolvedPeriod.year}
          </span>
          <button
            onClick={() => setPeriodOffset((o) => o + 1)}
            disabled={periodOffset >= 0}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-low text-on-surface/60 hover:bg-surface-container-high transition-colors disabled:opacity-40"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ── Category filter chips ─────────────────────────────────────────── */}
      {categoryOptions.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterCategory('all')}
            className={cn(
              'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all',
              filterCategory === 'all'
                ? 'bg-primary text-white'
                : 'bg-surface-container-low text-on-surface/60 hover:text-on-surface/80'
            )}
          >
            {t('creditCard.allCategories')}
          </button>
          {categoryOptions.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={cn(
                'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all',
                filterCategory === cat.id
                  ? 'bg-primary text-white'
                  : 'bg-surface-container-low text-on-surface/60 hover:text-on-surface/80'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Transaction list ──────────────────────────────────────────────── */}
      <div
        className="rounded-2xl bg-white overflow-hidden"
        style={{ boxShadow: '0px 4px 20px rgba(25,28,29,0.04)' }}
      >
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-on-surface/40">{t('creditCard.noTransactions')}</p>
          </div>
        ) : (
          filteredTransactions.map((tx, i) => (
            <InvoiceTxRow
              key={tx.id}
              tx={tx}
              data={data}
              isLast={i === filteredTransactions.length - 1}
              onEdit={openTransactionDrawer}
            />
          ))
        )}
      </div>

      {/* ── Spending summary ──────────────────────────────────────────────── */}
      {categoryTotals.length > 0 && (
        <div
          className="rounded-2xl bg-white p-6"
          style={{ boxShadow: '0px 4px 20px rgba(25,28,29,0.04)' }}
        >
          <h3 className="text-sm font-semibold text-on-surface mb-4">
            {t('creditCard.spendingSummary')}
          </h3>
          <div className="space-y-3">
            {categoryTotals.map(({ name, total }) => {
              const pct = invoiceTotal > 0 ? (total / invoiceTotal) * 100 : 0
              return (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-on-surface/70">{name}</span>
                    <span className="text-xs font-semibold text-on-surface">
                      {formatCurrency(total)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface-container-low overflow-hidden">
                    <div
                      className="h-full rounded-full bg-tertiary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-surface-container-low flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface">{t('common.total')}</span>
            <span className="text-sm font-bold text-tertiary">{formatCurrency(invoiceTotal)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── InvoiceTxRow ─────────────────────────────────────────────────────────────

function InvoiceTxRow({
  tx,
  data,
  isLast,
  onEdit,
}: {
  tx: Transaction
  data: NonNullable<ReturnType<typeof useDataStore.getState>['data']>
  isLast: boolean
  onEdit: (tx: Transaction) => void
}) {
  const cat = data.categories.find((c) => c.id === tx.categoryId)
  const acc = data.accounts.find((a) => a.id === tx.accountId)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onEdit(tx)}
      onKeyDown={(e) => e.key === 'Enter' && onEdit(tx)}
      className={cn(
        'flex items-center gap-4 px-5 py-4 hover:bg-surface-container-low transition-colors cursor-pointer',
        !isLast && 'border-b border-surface-container-low'
      )}
    >
      {/* Category icon */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white text-sm font-semibold"
        style={{ backgroundColor: cat?.color ?? '#6B7280' }}
      >
        {cat?.name?.[0] ?? '?'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-on-surface truncate">
          {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
          {tx.description || cat?.name || '—'}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {cat && <span className="text-xs text-on-surface/40">{cat.name}</span>}
          {acc && <span className="text-xs text-on-surface/30">· {acc.name}</span>}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-tertiary">{formatCurrency(tx.amount)}</p>
        <p className="text-[10px] text-on-surface/30 mt-0.5">
          {parseDateLocal(tx.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
        </p>
      </div>
    </div>
  )
}
