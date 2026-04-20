import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import { PieChart, Pie, Cell } from 'recharts'
import { useDataStore } from '@/store/useDataStore'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { formatCurrency, cn, parseDateLocal } from '@/lib/utils'
import PeriodSelector from '@/components/PeriodSelector'
import type { PeriodValue } from '@/components/PeriodSelector'
import CashFlowView from './CashFlowView'

type ActiveTab = 'categorias' | 'cashflow' | 'contas' | 'tags'

const TABS: ActiveTab[] = ['categorias', 'cashflow', 'contas', 'tags']

const COLORS = ['#006E2F', '#22C55E', '#86EFAC', '#4ADE80', '#6B7280', '#F59E0B']
const EXP_COLORS = ['#B91A24', '#FF8A83', '#FCA5A5', '#F87171', '#6B7280', '#F59E0B']

export default function Analytics() {
  const { t } = useTranslation()
  const data = useDataStore((s) => s.data)
  const shadowClass = useWorkspaceStore((s) =>
    s.workspace.useAmbientShadows ? 'shadow-card-ambient' : 'shadow-card'
  )

  // ── Global period state (shared across all tabs) ────────────────────────
  const [period, setPeriod] = useState<PeriodValue>({ mode: 'month', monthOffset: 0 })
  const [includeUnpaid, setIncludeUnpaid] = useState(true)
  const [activeTab, setActiveTab] = useState<ActiveTab>('categorias')

  const now = useMemo(() => new Date(), [])

  // ── Compute date range from PeriodSelector state ────────────────────────
  const { startDate, endDate } = useMemo(() => {
    if (period.mode === 'month') {
      const ref = new Date(now.getFullYear(), now.getMonth() + period.monthOffset, 1)
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
      return { startDate: ref, endDate: end }
    }
    // custom
    if (period.customStart && period.customEnd) {
      return {
        startDate: parseDateLocal(period.customStart),
        endDate: parseDateLocal(period.customEnd),
      }
    }
    // fallback: current month
    const ref = new Date(now.getFullYear(), now.getMonth(), 1)
    return { startDate: ref, endDate: new Date(ref.getFullYear(), ref.getMonth() + 1, 0) }
  }, [period, now])

  // ── Category breakdown ──────────────────────────────────────────────────
  const { incomeByCategory, expenseByCategory } = useMemo(() => {
    if (!data) return { incomeByCategory: [], expenseByCategory: [] }
    const txs = data.transactions.filter((tx) => {
      // CC-17: CREDIT_PAYMENT is liability liquidation, not income/expense
      if (tx.type === 'CREDIT_PAYMENT') return false
      // CC-18: category breakdown intentionally uses tx.date (budget perspective).
      // The expense is attributed to the purchase date, not the invoice due date.
      // Only the cash-flow chart uses getEffectiveCashFlowDate.
      const d = parseDateLocal(tx.date)
      const inPeriod = d >= startDate && d <= endDate
      const isPaidOk = includeUnpaid || tx.isPaid
      return inPeriod && isPaidOk
    })

    function groupByCategory(type: 'INCOME' | 'EXPENSE') {
      const map: Record<string, number> = {}
      txs
        .filter((tx) => tx.type === type)
        .forEach((tx) => {
          const cat = data!.categories.find((c) => c.id === tx.categoryId)
          const name = cat?.name ?? 'Outros'
          map[name] = (map[name] ?? 0) + tx.amount
        })
      return Object.entries(map).map(([name, value]) => ({ name, value }))
    }

    return {
      incomeByCategory: groupByCategory('INCOME'),
      expenseByCategory: groupByCategory('EXPENSE'),
    }
  }, [data, startDate, endDate, includeUnpaid])

  const totalIncome = incomeByCategory.reduce((s, d) => s + d.value, 0)
  const totalExpenses = expenseByCategory.reduce((s, d) => s + d.value, 0)

  if (!data) return null

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      {/* ── Header controls ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period selector */}
        <PeriodSelector value={period} onChange={setPeriod} />

        {/* Include unpaid toggle */}
        <button
          onClick={() => setIncludeUnpaid((v) => !v)}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
            includeUnpaid
              ? 'bg-on-surface text-white'
              : 'bg-surface-container-low text-on-surface/50 hover:text-on-surface/70'
          )}
        >
          {t('analytics.includeUnpaid')}
        </button>

        {/* Actions */}
        <div className="ml-auto flex gap-2">
          <button className="flex items-center gap-1.5 rounded-xl bg-surface-container-low px-4 py-2 text-xs font-medium text-on-surface/70 hover:bg-surface-container-high transition-colors">
            <Download size={14} strokeWidth={1.5} />
            {t('analytics.exportPdf')}
          </button>
        </div>
      </div>

      {/* ── Sub-navigation tabs ──────────────────────────────────────────── */}
      <div className="flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-medium transition-all',
              activeTab === tab
                ? 'bg-primary text-white'
                : 'bg-surface-container-low text-on-surface/50 hover:text-on-surface/70'
            )}
          >
            {t(`analytics.tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* ── Active view ──────────────────────────────────────────────────── */}
      {activeTab === 'categorias' && (
        <div className="grid grid-cols-2 gap-4">
          <CategoryDonut
            title={t('analytics.categorias.incomeTitle')}
            data={incomeByCategory}
            total={totalIncome}
            colors={COLORS}
            shadowClass={shadowClass}
          />
          <CategoryDonut
            title={t('analytics.categorias.expensesTitle')}
            data={expenseByCategory}
            total={totalExpenses}
            colors={EXP_COLORS}
            shadowClass={shadowClass}
          />
        </div>
      )}

      {activeTab === 'cashflow' && (
        <CashFlowView
          transactions={data.transactions}
          accounts={data.accounts}
          startDate={startDate}
          endDate={endDate}
          includeUnpaid={includeUnpaid}
          shadowClass={shadowClass}
        />
      )}

      {activeTab === 'contas' && (
        <div className={cn('rounded-2xl bg-white p-12 text-center', shadowClass)}>
          <p className="text-sm text-on-surface/30">{t('analytics.contas.selectPrompt')}</p>
        </div>
      )}

      {activeTab === 'tags' && (
        <div className={cn('rounded-2xl bg-white p-12 text-center', shadowClass)}>
          <p className="text-sm text-on-surface/30">{t('analytics.tags.noData')}</p>
        </div>
      )}
    </div>
  )
}

// ─── CategoryDonut ────────────────────────────────────────────────────────────

function CategoryDonut({
  title,
  data,
  total,
  colors,
  shadowClass,
}: {
  title: string
  data: { name: string; value: number }[]
  total: number
  colors: string[]
  shadowClass: string
}) {
  return (
    <div className={cn('rounded-2xl bg-white p-6', shadowClass)}>
      <h3 className="text-sm font-semibold text-on-surface mb-4">{title}</h3>

      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-on-surface/30">Sem dados</p>
      ) : (
        <div className="flex gap-6">
          {/* Donut */}
          <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
            <PieChart width={120} height={120}>
              <Pie
                data={data}
                cx={60}
                cy={60}
                innerRadius={40}
                outerRadius={56}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
            </PieChart>
            {/* M-29: font size scales down for long currency values to avoid overflow */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-1">
              <p
                className={cn(
                  'font-bold text-on-surface text-center leading-tight',
                  formatCurrency(total).length >= 12
                    ? 'text-[9px]'
                    : formatCurrency(total).length >= 10
                      ? 'text-[10px]'
                      : 'text-xs'
                )}
              >
                {formatCurrency(total)}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 space-y-2">
            {data.slice(0, 5).map((item, i) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: colors[i % colors.length] }}
                  />
                  <span className="text-xs text-on-surface/70 truncate">{item.name}</span>
                </div>
                <span className="text-xs font-semibold text-on-surface ml-2">
                  {formatCurrency(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
