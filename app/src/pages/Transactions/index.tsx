import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { Search, CheckCircle2, Clock, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useDataStore } from '@/store/useDataStore'
import { formatCurrency, cn, parseDateLocal } from '@/lib/utils'
import type { AppLayoutContext } from '@/components/AppLayout'
import type { Transaction } from '@/types'

// M-27: month | semester | custom — mirrors Analytics granularity
type ViewPeriod = 'month' | 'semester' | 'custom'

export default function Transactions() {
  const { t } = useTranslation()
  const data = useDataStore((s) => s.data)
  const { openTransactionDrawer } = useOutletContext<AppLayoutContext>()

  // M-27: month-based navigation (replaces period chips)
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('month')
  const [monthOffset, setMonthOffset] = useState(0)

  const [search, setSearch] = useState('')
  const [filterAccountId, setFilterAccountId] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all')

  const now = useMemo(() => new Date(), [])

  // M-26: Set of CREDIT account IDs — their transactions live in /credit-card/:id, not here
  const creditAccountIds = useMemo(() => {
    if (!data) return new Set<string>()
    return new Set(data.accounts.filter((a) => a.type === 'CREDIT').map((a) => a.id))
  }, [data])

  // M-27: Compute date range and period label from viewPeriod + monthOffset
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const ref = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
    if (viewPeriod === 'month') {
      const start = ref
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
      const raw = ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      return {
        startDate: start,
        endDate: end,
        periodLabel: raw.charAt(0).toUpperCase() + raw.slice(1),
      }
    }
    if (viewPeriod === 'semester') {
      const start = new Date(ref.getFullYear(), ref.getMonth() - 3, 1)
      const end = new Date(ref.getFullYear(), ref.getMonth() + 3, 0)
      const fmt = (d: Date) =>
        d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '')
      return { startDate: start, endDate: end, periodLabel: `${fmt(start)} – ${fmt(end)}` }
    }
    // custom: no date restriction
    return { startDate: null, endDate: null, periodLabel: t('analytics.custom') }
  }, [viewPeriod, monthOffset, now, t])

  const filtered = useMemo(() => {
    if (!data) return []
    let txs = [...data.transactions]

    // M-26: exclude CREDIT account transactions and CREDIT_PAYMENT — cash-flow ledger only
    txs = txs.filter((tx) => !creditAccountIds.has(tx.accountId) && tx.type !== 'CREDIT_PAYMENT')

    // M-27: Period filter using parseDateLocal (avoids UTC date parsing bug)
    if (startDate && endDate) {
      txs = txs.filter((tx) => {
        const d = parseDateLocal(tx.date)
        return d >= startDate && d <= endDate
      })
    }
    // viewPeriod === 'custom': no date filter — all transactions shown

    // Account filter
    if (filterAccountId !== 'all') txs = txs.filter((tx) => tx.accountId === filterAccountId)

    // Status filter
    if (filterStatus === 'paid') txs = txs.filter((tx) => tx.isPaid)
    if (filterStatus === 'pending') txs = txs.filter((tx) => !tx.isPaid)

    // Type filter
    if (filterType === 'income') txs = txs.filter((tx) => tx.type === 'INCOME')
    if (filterType === 'expense') txs = txs.filter((tx) => tx.type === 'EXPENSE')
    if (filterType === 'transfer') txs = txs.filter((tx) => tx.type === 'TRANSFER')

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      txs = txs.filter((tx) => tx.description.toLowerCase().includes(q))
    }

    return txs.sort((a, b) => parseDateLocal(b.date).getTime() - parseDateLocal(a.date).getTime())
  }, [
    data,
    filterAccountId,
    filterStatus,
    filterType,
    search,
    creditAccountIds,
    startDate,
    endDate,
  ])

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    filtered.forEach((tx) => {
      const key = tx.date.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(tx)
    })
    return Array.from(map.entries())
  }, [filtered])

  // Summary — CREDIT account txs and CREDIT_PAYMENT already excluded by M-26 filter above
  const income = filtered.filter((tx) => tx.type === 'INCOME').reduce((s, tx) => s + tx.amount, 0)
  const expenses = filtered
    .filter((tx) => tx.type === 'EXPENSE')
    .reduce((s, tx) => s + tx.amount, 0)
  const consolidated = income - expenses

  // M-32: category breakdown for the spending summary panel
  const categoryTotals = useMemo(() => {
    if (!data) return []
    const map: Record<string, number> = {}
    filtered.forEach((tx) => {
      if (tx.type !== 'EXPENSE') return
      const catName = data.categories.find((c) => c.id === tx.categoryId)?.name ?? 'Outros'
      map[catName] = (map[catName] ?? 0) + tx.amount
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, total]) => ({ name, total }))
  }, [filtered, data])

  if (!data) return null

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* ── M-27: Period navigation (replaces period chips) ──────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Month arrows + label */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonthOffset((o) => o - 1)}
            aria-label="previous-period"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-container-low transition-colors"
          >
            <ChevronLeft size={18} strokeWidth={1.5} className="text-on-surface/60" />
          </button>
          <span className="text-xl font-bold text-on-surface min-w-44 text-center">
            {periodLabel}
          </span>
          <button
            onClick={() => setMonthOffset((o) => o + 1)}
            aria-label="next-period"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-container-low transition-colors"
          >
            <ChevronRight size={18} strokeWidth={1.5} className="text-on-surface/60" />
          </button>
        </div>

        {/* Granularity tabs */}
        <div className="flex gap-1">
          {(['month', 'semester', 'custom'] as ViewPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setViewPeriod(p)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                viewPeriod === p
                  ? 'bg-primary text-white'
                  : 'bg-surface-container-low text-on-surface/50 hover:text-on-surface/70'
              )}
            >
              {t(`analytics.${p === 'month' ? 'month' : p === 'semester' ? 'semester' : 'custom'}`)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <FilterDropdown
          label={t('transactions.filterAccounts')}
          value={filterAccountId}
          onChange={setFilterAccountId}
          options={[
            { value: 'all', label: t('transactions.filterAccounts') },
            // M-26: CREDIT accounts are excluded — their transactions live in /credit-card/:id
            ...data.accounts
              .filter((a) => a.type !== 'CREDIT')
              .map((a) => ({ value: a.id, label: a.name })),
          ]}
        />
        <FilterDropdown
          label={t('transactions.filterStatus')}
          value={filterStatus}
          onChange={(v) => setFilterStatus(v as typeof filterStatus)}
          options={[
            { value: 'all', label: t('transactions.filterStatus') },
            { value: 'paid', label: t('transactions.paid') },
            { value: 'pending', label: t('transactions.pending') },
          ]}
        />
        <FilterDropdown
          label={t('transactions.filterTags')}
          value="all"
          onChange={() => {}}
          options={[
            { value: 'all', label: t('transactions.filterTags') },
            ...data.tags.map((tag) => ({ value: tag.id, label: `#${tag.name}` })),
          ]}
        />
        <FilterDropdown
          label={t('transactions.filterType')}
          value={filterType}
          onChange={(v) => setFilterType(v as typeof filterType)}
          options={[
            { value: 'all', label: t('transactions.filterType') },
            { value: 'income', label: t('transactions.income') },
            { value: 'expense', label: t('transactions.expense') },
            { value: 'transfer', label: t('transactions.transfer') },
          ]}
        />

        {/* Search */}
        <div className="relative ml-auto">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/40"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="rounded-xl bg-surface-container-low py-2 pl-8 pr-4 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20 w-48"
          />
        </div>
      </div>

      {/* ── M-32: Two-column layout: transaction list | spending summary ──── */}
      <div className="grid grid-cols-3 gap-6 items-start">
        {/* Left column: transaction list + footer */}
        <div className="col-span-2 space-y-6">
          {/* Transaction list */}
          {grouped.length === 0 ? (
            <div
              className="rounded-2xl bg-white p-12 text-center"
              style={{ boxShadow: '0px 4px 20px rgba(25,28,29,0.04)' }}
            >
              <p className="text-sm text-on-surface/40">{t('common.noData')}</p>
            </div>
          ) : (
            grouped.map(([dateKey, txs]) => (
              <DateGroup
                key={dateKey}
                dateKey={dateKey}
                txs={txs}
                data={data}
                onEditTx={openTransactionDrawer}
              />
            ))
          )}

          {/* Footer summary */}
          {filtered.length > 0 && (
            <div
              className="flex items-center justify-between rounded-2xl bg-white px-6 py-4"
              style={{ boxShadow: '0px 4px 20px rgba(25,28,29,0.04)' }}
            >
              <p className="text-xs text-on-surface/40">
                <span className="font-semibold text-on-surface">{filtered.length}</span>{' '}
                {t('transactions.listed')}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'label text-xs font-bold',
                    consolidated >= 0 ? 'text-primary' : 'text-tertiary'
                  )}
                >
                  {consolidated >= 0
                    ? t('transactions.positiveFlow')
                    : t('transactions.negativeFlow')}
                </span>
                <span
                  className={cn(
                    'text-sm font-bold',
                    consolidated >= 0 ? 'text-primary' : 'text-tertiary'
                  )}
                >
                  {consolidated >= 0 ? '+' : ''}
                  {formatCurrency(consolidated)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right column: spending summary (sticky) */}
        <div className="col-span-1 sticky top-8">
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
                  const pct = expenses > 0 ? (total / expenses) * 100 : 0
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
                <span className="text-sm font-bold text-tertiary">{formatCurrency(expenses)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── DateGroup ─────────────────────────────────────────────────────────────────

function DateGroup({
  dateKey,
  txs,
  data,
  onEditTx,
}: {
  dateKey: string
  txs: Transaction[]
  data: NonNullable<ReturnType<typeof useDataStore.getState>['data']>
  onEditTx: (tx: Transaction) => void
}) {
  const date = new Date(dateKey + 'T12:00:00')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  let label: string
  if (date.toDateString() === today.toDateString()) label = 'Hoje'
  else if (date.toDateString() === yesterday.toDateString()) label = 'Ontem'
  else label = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  const dateFormatted = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <span className="label text-xs font-semibold text-on-surface/50 uppercase">{label}</span>
        <span className="text-xs text-on-surface/30">{dateFormatted}</span>
      </div>
      <div
        className="rounded-2xl bg-white overflow-hidden"
        style={{ boxShadow: '0px 4px 20px rgba(25,28,29,0.04)' }}
      >
        {txs.map((tx, i) => (
          <TxRow key={tx.id} tx={tx} data={data} isLast={i === txs.length - 1} onEdit={onEditTx} />
        ))}
      </div>
    </div>
  )
}

// ─── TxRow ─────────────────────────────────────────────────────────────────────

function TxRow({
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
  const txTags = data.tags.filter((tag) => tx.tags.includes(tag.id))
  const isIncome = tx.type === 'INCOME'

  const timeStr = new Date(tx.date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  // Type label shown above the description (CREDIT and CREDIT_PAYMENT filtered upstream — M-26)
  const typeLabel = tx.type === 'INCOME' ? 'Receita' : tx.type === 'EXPENSE' ? 'Despesa' : 'Transf.'

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
      {/* Category avatar */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white text-sm font-semibold"
        style={{ backgroundColor: cat?.color ?? '#6B7280' }}
      >
        {cat?.name?.[0] ?? '?'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-on-surface/40">
            {typeLabel}
          </span>
        </div>
        <p className="text-sm font-semibold text-on-surface truncate">
          {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
          {tx.description || cat?.name || '—'}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {txTags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: tag.color }}
            >
              #{tag.name}
            </span>
          ))}
          {acc && <span className="text-xs text-on-surface/30">{acc.name}</span>}
          <span className="text-xs text-on-surface/30">{timeStr}</span>
        </div>
      </div>

      {/* Amount + paid status */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className={cn('text-sm font-bold', isIncome ? 'text-primary' : 'text-tertiary')}>
            {isIncome ? '+' : '-'}
            {formatCurrency(tx.amount)}
          </p>
          <p className="text-[10px] text-on-surface/30 mt-0.5">
            {isIncome ? 'Depósito' : 'Débito'}
          </p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full">
          {tx.isPaid ? (
            <CheckCircle2 size={20} className="text-primary" strokeWidth={1.5} />
          ) : (
            <Clock size={20} className="text-on-surface/20" strokeWidth={1.5} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── FilterDropdown ────────────────────────────────────────────────────────────

function FilterDropdown({
  value,
  onChange,
  options,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-xl bg-surface-container-low py-2 pl-3 pr-7 text-sm font-medium text-on-surface/70 outline-none hover:bg-surface-container-high transition-colors cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface/40 pointer-events-none"
      />
    </div>
  )
}
