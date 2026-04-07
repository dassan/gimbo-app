import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, CheckCircle2, Clock, ChevronDown } from 'lucide-react'
import { useDataStore } from '@/store/useDataStore'
import { formatCurrency, cn } from '@/lib/utils'
import type { Transaction } from '@/types'

type TimePeriod = 'today' | 'week' | 'month' | 'custom'

export default function Transactions() {
  const { t } = useTranslation()
  const data = useDataStore((s) => s.data)

  const [period, setPeriod] = useState<TimePeriod>('month')
  const [search, setSearch] = useState('')
  const [filterAccountId, setFilterAccountId] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all')

  const now = useMemo(() => new Date(), [])

  const filtered = useMemo(() => {
    if (!data) return []
    let txs = [...data.transactions]

    // Period filter
    txs = txs.filter((tx) => {
      const d = new Date(tx.date)
      if (period === 'today') {
        return d.toDateString() === now.toDateString()
      } else if (period === 'week') {
        const weekAgo = new Date(now)
        weekAgo.setDate(now.getDate() - 7)
        return d >= weekAgo
      } else if (period === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }
      return true
    })

    // Account filter
    if (filterAccountId !== 'all') txs = txs.filter((tx) => tx.accountId === filterAccountId)

    // Status filter
    if (filterStatus === 'paid') txs = txs.filter((tx) => tx.isPaid)
    if (filterStatus === 'pending') txs = txs.filter((tx) => !tx.isPaid)

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      txs = txs.filter((tx) => tx.description.toLowerCase().includes(q))
    }

    return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [data, period, filterAccountId, filterStatus, search, now])

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

  // Summary
  const income = filtered.filter((tx) => tx.type === 'INCOME').reduce((s, tx) => s + tx.amount, 0)
  const expenses = filtered
    .filter((tx) => tx.type === 'EXPENSE')
    .reduce((s, tx) => s + tx.amount, 0)
  const consolidated = income - expenses

  if (!data) return null

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <FilterDropdown
          label={t('transactions.filterAccounts')}
          value={filterAccountId}
          onChange={setFilterAccountId}
          options={[
            { value: 'all', label: t('transactions.filterAccounts') },
            ...data.accounts.map((a) => ({ value: a.id, label: a.name })),
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

      {/* ── Period tabs ──────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6">
        {(['today', 'week', 'month', 'custom'] as TimePeriod[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
              period === p
                ? 'bg-primary text-white'
                : 'bg-surface-container-low text-on-surface/50 hover:text-on-surface/70'
            )}
          >
            {t(
              `transactions.${p === 'today' ? 'today' : p === 'week' ? 'thisWeek' : p === 'month' ? 'thisMonth' : 'custom'}`
            )}
          </button>
        ))}
      </div>

      {/* ── Transaction list ──────────────────────────────────────────────── */}
      {grouped.length === 0 ? (
        <div
          className="rounded-2xl bg-white p-12 text-center"
          style={{ boxShadow: '0px 4px 20px rgba(25,28,29,0.04)' }}
        >
          <p className="text-sm text-on-surface/40">{t('common.noData')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([dateKey, txs]) => (
            <DateGroup key={dateKey} dateKey={dateKey} txs={txs} data={data} />
          ))}
        </div>
      )}

      {/* ── Footer summary ────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div
          className="mt-8 flex items-center justify-between rounded-2xl bg-white px-6 py-4"
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
              {consolidated >= 0 ? t('transactions.positiveFlow') : t('transactions.negativeFlow')}
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
  )
}

// ─── DateGroup ─────────────────────────────────────────────────────────────────

function DateGroup({
  dateKey,
  txs,
  data,
}: {
  dateKey: string
  txs: Transaction[]
  data: NonNullable<ReturnType<typeof useDataStore.getState>['data']>
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
          <TxRow key={tx.id} tx={tx} data={data} isLast={i === txs.length - 1} />
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
}: {
  tx: Transaction
  data: NonNullable<ReturnType<typeof useDataStore.getState>['data']>
  isLast: boolean
}) {
  const cat = data.categories.find((c) => c.id === tx.categoryId)
  const acc = data.accounts.find((a) => a.id === tx.accountId)
  const txTags = data.tags.filter((tag) => tx.tags.includes(tag.id))
  const isIncome = tx.type === 'INCOME'

  const timeStr = new Date(tx.date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-5 py-4 hover:bg-surface-container-low transition-colors',
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
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-on-surface/40">
            {tx.type === 'INCOME' ? 'Receita' : tx.type === 'EXPENSE' ? 'Despesa' : 'Transf.'}
          </span>
        </div>
        <p className="text-sm font-semibold text-on-surface truncate">
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
        <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-container-low transition-colors">
          {tx.isPaid ? (
            <CheckCircle2 size={20} className="text-primary" strokeWidth={1.5} />
          ) : (
            <Clock size={20} className="text-on-surface/20" strokeWidth={1.5} />
          )}
        </button>
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
