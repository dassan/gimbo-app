import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  Landmark,
  PiggyBank,
  CreditCard,
  Bitcoin,
  ArrowLeftRight,
  Briefcase,
  MoreHorizontal,
} from 'lucide-react'
import { useDataStore } from '@/store/useDataStore'
import { formatCurrency, cn, parseDateLocal } from '@/lib/utils'
import type { Transaction, AccountType } from '@/types'

// ─── Account type config ──────────────────────────────────────────────────────

const ACCOUNT_TYPE_ICONS: Record<AccountType, React.ReactNode> = {
  RETAIL: <Landmark size={18} strokeWidth={1.5} />,
  SAVINGS: <PiggyBank size={18} strokeWidth={1.5} />,
  CREDIT: <CreditCard size={18} strokeWidth={1.5} />,
  CRYPTO: <Bitcoin size={18} strokeWidth={1.5} />,
  FOREX: <ArrowLeftRight size={18} strokeWidth={1.5} />,
  ASSET: <Briefcase size={18} strokeWidth={1.5} />,
  STOCKS: <TrendingUp size={18} strokeWidth={1.5} />,
  OTHER: <MoreHorizontal size={18} strokeWidth={1.5} />,
}

const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  RETAIL: '#3B82F6',
  SAVINGS: '#22C55E',
  CREDIT: '#1F2937',
  CRYPTO: '#F59E0B',
  FOREX: '#8B5CF6',
  ASSET: '#6B7280',
  STOCKS: '#006E2F',
  OTHER: '#9CA3AF',
}

// ─── Colour palette for donut chart ──────────────────────────────────────────
const DONUT_COLORS = ['#006E2F', '#22C55E', '#FF8A83', '#B91A24', '#6B7280', '#F59E0B', '#3B82F6']

export default function Dashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const data = useDataStore((s) => s.data)

  const now = useMemo(() => new Date(), [])

  // ── Current month stats ───────────────────────────────────────────────────
  const { income, expenses, balance, recentTxs } = useMemo(() => {
    if (!data) return { income: 0, expenses: 0, balance: 0, recentTxs: [] }
    const m = now.getMonth(),
      y = now.getFullYear()
    const monthly = data.transactions.filter((tx) => {
      const d = parseDateLocal(tx.date)
      return d.getMonth() === m && d.getFullYear() === y
    })
    const income = monthly.filter((tx) => tx.type === 'INCOME').reduce((s, tx) => s + tx.amount, 0)
    const expenses = monthly
      .filter((tx) => tx.type === 'EXPENSE')
      .reduce((s, tx) => s + tx.amount, 0)
    const recentTxs = [...data.transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
    return { income, expenses, balance: income - expenses, recentTxs }
  }, [data, now])

  // ── Account balances (derived from transactions) ──────────────────────────
  const accountBalances = useMemo<Record<string, number>>(() => {
    if (!data) return {}
    const map: Record<string, number> = {}
    data.transactions.forEach((tx) => {
      if (tx.type === 'INCOME') map[tx.accountId] = (map[tx.accountId] ?? 0) + tx.amount
      if (tx.type === 'EXPENSE') map[tx.accountId] = (map[tx.accountId] ?? 0) - tx.amount
      if (tx.type === 'TRANSFER') map[tx.accountId] = (map[tx.accountId] ?? 0) - tx.amount
    })
    return map
  }, [data])

  // ── Expenses by category (donut) ──────────────────────────────────────────
  const donutData = useMemo(() => {
    if (!data) return []
    const m = now.getMonth(),
      y = now.getFullYear()
    const expTxs = data.transactions.filter((tx) => {
      const d = parseDateLocal(tx.date)
      return tx.type === 'EXPENSE' && d.getMonth() === m && d.getFullYear() === y
    })
    const byCategory: Record<string, number> = {}
    expTxs.forEach((tx) => {
      const cat = data.categories.find((c) => c.id === tx.categoryId)
      const name = cat?.name ?? 'Outros'
      byCategory[name] = (byCategory[name] ?? 0) + tx.amount
    })
    const total = Object.values(byCategory).reduce((s, v) => s + v, 0) || 1
    return Object.entries(byCategory).map(([name, value]) => ({
      name,
      value,
      pct: Math.round((value / total) * 100),
    }))
  }, [data, now])

  if (!data) return null

  const visibleAccounts = data.accounts.filter((a) => a.includeInBalance)
  const totalExpenses = donutData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label={t('dashboard.income')}
          value={formatCurrency(income)}
          icon={<TrendingUp size={16} strokeWidth={1.5} />}
          variant="income"
        />
        <StatCard
          label={t('dashboard.expenses')}
          value={formatCurrency(expenses)}
          icon={<TrendingDown size={16} strokeWidth={1.5} />}
          variant="expense"
        />
        <StatCard
          label={t('dashboard.balance')}
          value={formatCurrency(balance)}
          variant="balance"
        />
      </div>

      {/* ── Accounts + Category row ───────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {/* My Accounts — 2/3 */}
        <div
          className="col-span-2 rounded-2xl bg-white p-6"
          style={{ boxShadow: '0px 4px 20px rgba(25,28,29,0.04)' }}
        >
          <h3 className="text-sm font-semibold text-on-surface mb-4">
            {t('dashboard.myAccounts')}
          </h3>

          {visibleAccounts.length === 0 ? (
            <p className="py-8 text-center text-sm text-on-surface/40">{t('common.noData')}</p>
          ) : (
            <div className="space-y-1">
              {visibleAccounts.map((acc) => (
                <AccountRow
                  key={acc.id}
                  name={acc.name}
                  type={acc.type}
                  balance={accountBalances[acc.id] ?? 0}
                  typeLabel={t(`accounts.${acc.type.toLowerCase()}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Expenses by category donut — 1/3 */}
        <div
          className="rounded-2xl bg-white p-6"
          style={{ boxShadow: '0px 4px 20px rgba(25,28,29,0.04)' }}
        >
          <h3 className="text-sm font-semibold text-on-surface mb-4">
            {t('dashboard.byCategory')}
          </h3>

          {donutData.length > 0 ? (
            <>
              <div className="relative h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={64}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface/40">
                    {t('dashboard.total')}
                  </p>
                  <p className="text-sm font-bold text-on-surface">
                    {formatCurrency(totalExpenses)}
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {donutData.slice(0, 4).map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                      />
                      <span className="text-xs text-on-surface/70">{d.name}</span>
                    </div>
                    <span className="text-xs font-medium text-on-surface">{d.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyChart />
          )}
        </div>
      </div>

      {/* ── Recent transactions ───────────────────────────────────────────── */}
      <div
        className="rounded-2xl bg-white p-6"
        style={{ boxShadow: '0px 4px 20px rgba(25,28,29,0.04)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-on-surface">
            {t('dashboard.recentTransactions')}
          </h3>
          <button
            onClick={() => {
              void navigate('/transactions')
            }}
            className="text-xs font-medium text-primary hover:underline"
          >
            {t('dashboard.viewAll')}
          </button>
        </div>

        {recentTxs.length === 0 ? (
          <p className="py-8 text-center text-sm text-on-surface/40">{t('common.noData')}</p>
        ) : (
          <div className="space-y-1">
            {recentTxs.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} data={data} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function AccountRow({
  name,
  type,
  balance,
  typeLabel,
}: {
  name: string
  type: AccountType
  balance: number
  typeLabel: string
}) {
  const isNegative = balance < 0
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-container-low transition-colors">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
        style={{ backgroundColor: ACCOUNT_TYPE_COLORS[type] }}
      >
        {ACCOUNT_TYPE_ICONS[type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-on-surface truncate">{name}</p>
        <p className="text-xs text-on-surface/40 mt-0.5">{typeLabel}</p>
      </div>
      <span
        className={cn(
          'text-sm font-semibold shrink-0',
          isNegative ? 'text-tertiary' : 'text-on-surface'
        )}
      >
        {formatCurrency(balance)}
      </span>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  variant,
}: {
  label: string
  value: string
  icon?: React.ReactNode
  variant: 'income' | 'expense' | 'balance'
}) {
  const isBalance = variant === 'balance'
  return (
    <div
      className={cn('rounded-2xl p-5', isBalance ? 'bg-primary text-white' : 'bg-white')}
      style={!isBalance ? { boxShadow: '0px 4px 20px rgba(25,28,29,0.04)' } : {}}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={cn('label', isBalance ? 'text-white/60' : 'text-on-surface/40')}>
          {label}
        </span>
        {icon && (
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full',
              variant === 'income'
                ? 'bg-primary/10 text-primary'
                : variant === 'expense'
                  ? 'bg-tertiary/10 text-tertiary'
                  : 'bg-white/20 text-white'
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p
        className={cn(
          'text-2xl font-bold',
          isBalance ? 'text-white' : variant === 'income' ? 'text-primary' : 'text-tertiary'
        )}
      >
        {value}
      </p>
    </div>
  )
}

function TransactionRow({
  tx,
  data,
}: {
  tx: Transaction
  data: NonNullable<ReturnType<typeof useDataStore.getState>['data']>
}) {
  const cat = data.categories.find((c) => c.id === tx.categoryId)
  const acc = data.accounts.find((a) => a.id === tx.accountId)
  const isIncome = tx.type === 'INCOME'
  const dateStr = new Date(tx.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-container-low transition-colors">
      {/* Category icon */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white text-sm"
        style={{ backgroundColor: cat?.color ?? '#6B7280' }}
      >
        {cat?.name?.[0] ?? '?'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-on-surface truncate">
          {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
          {tx.description || cat?.name || '—'}
        </p>
        <p className="text-xs text-on-surface/40 mt-0.5">
          {cat?.name} · {acc?.name} · {dateStr}
        </p>
      </div>

      {/* Amount + status */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn('text-sm font-semibold', isIncome ? 'text-primary' : 'text-tertiary')}>
          {isIncome ? '+' : '-'}
          {formatCurrency(tx.amount)}
        </span>
        {tx.isPaid ? (
          <CheckCircle2 size={16} className="text-primary" strokeWidth={1.5} />
        ) : (
          <Clock size={16} className="text-on-surface/20" strokeWidth={1.5} />
        )}
      </div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-on-surface/30">Sem dados para exibir</p>
    </div>
  )
}
