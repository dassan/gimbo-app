import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import { useDataStore } from '@/store/useDataStore'
import { formatCurrency, cn } from '@/lib/utils'

type ViewPeriod = 'month' | 'semester' | 'custom'

const COLORS = ['#006E2F', '#22C55E', '#86EFAC', '#4ADE80', '#6B7280', '#F59E0B']
const EXP_COLORS = ['#B91A24', '#FF8A83', '#FCA5A5', '#F87171', '#6B7280', '#F59E0B']

export default function Analytics() {
  const { t } = useTranslation()
  const data = useDataStore((s) => s.data)

  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('semester')
  const [includeUnpaid, setIncludeUnpaid] = useState(false)
  const [offset, setOffset] = useState(0) // months back/forward

  const now = new Date()

  // ── Date range label ────────────────────────────────────────────────────────
  const { startDate, endDate } = useMemo(() => {
    const ref = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    if (viewPeriod === 'month') {
      return { startDate: ref, endDate: new Date(ref.getFullYear(), ref.getMonth() + 1, 0) }
    }
    // semester: 3 months back to 3 months forward
    const start = new Date(ref.getFullYear(), ref.getMonth() - 3, 1)
    const end = new Date(ref.getFullYear(), ref.getMonth() + 3, 0)
    return { startDate: start, endDate: end }
  }, [viewPeriod, offset])

  const dateRangeLabel = `${startDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })} – ${endDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`

  // ── Cash flow line chart data ────────────────────────────────────────────────
  const cashFlowData = useMemo(() => {
    if (!data) return []
    const months: { label: string; m: number; y: number }[] = []
    const cur = new Date(startDate)
    while (cur <= endDate) {
      months.push({
        label: cur.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase(),
        m: cur.getMonth(),
        y: cur.getFullYear(),
      })
      cur.setMonth(cur.getMonth() + 1)
    }

    let cumulative = 0
    return months.map(({ label, m, y }) => {
      const txs = data.transactions.filter((tx) => {
        const d = new Date(tx.date)
        const inPeriod = d.getMonth() === m && d.getFullYear() === y
        const isPaidOk = includeUnpaid || tx.isPaid
        return inPeriod && isPaidOk
      })
      const inc = txs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
      const exp = txs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
      cumulative += inc - exp
      return { label, generalFlow: inc - exp, consolidatedBalance: cumulative }
    })
  }, [data, startDate, endDate, includeUnpaid])

  // ── Category breakdown ──────────────────────────────────────────────────────
  const { incomeByCategory, expenseByCategory } = useMemo(() => {
    if (!data) return { incomeByCategory: [], expenseByCategory: [] }
    const txs = data.transactions.filter((tx) => {
      const d = new Date(tx.date)
      const inPeriod = d >= startDate && d <= endDate
      const isPaidOk = includeUnpaid || tx.isPaid
      return inPeriod && isPaidOk
    })

    function groupByCategory(type: 'INCOME' | 'EXPENSE') {
      const map: Record<string, number> = {}
      txs.filter((tx) => tx.type === type).forEach((tx) => {
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
        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <button onClick={() => setOffset((o) => o - 1)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-container-low transition-colors">
            <ChevronLeft size={18} strokeWidth={1.5} className="text-on-surface/60" />
          </button>
          <h2 className="text-xl font-bold text-on-surface min-w-44 text-center">{dateRangeLabel}</h2>
          <button onClick={() => setOffset((o) => o + 1)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-container-low transition-colors">
            <ChevronRight size={18} strokeWidth={1.5} className="text-on-surface/60" />
          </button>
        </div>

        {/* Period tabs */}
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

      {/* ── Cash flow projection chart ────────────────────────────────────── */}
      <div className="rounded-2xl bg-white p-6" style={{ boxShadow: '0px 4px 20px rgba(25,28,29,0.04)' }}>
        <h3 className="text-sm font-semibold text-on-surface">{t('analytics.cashFlowTitle')}</h3>
        <p className="text-xs text-on-surface/40 mt-0.5 mb-6">{t('analytics.cashFlowSub')}</p>

        <div className="h-56">
          {cashFlowData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashFlowData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(25,28,29,0.04)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
                  formatter={(value) => value === 'generalFlow' ? t('analytics.generalFlow') : t('analytics.consolidatedBalance')} />
                <Line type="monotone" dataKey="generalFlow" stroke="#006E2F" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="consolidatedBalance" stroke="#22C55E" strokeWidth={2} strokeDasharray="4 2" dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-on-surface/30">{t('common.noData')}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Category breakdown ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <CategoryDonut
          title={t('analytics.incomeByCategory')}
          data={incomeByCategory}
          total={totalIncome}
          colors={COLORS}
        />
        <CategoryDonut
          title={t('analytics.expenseByCategory')}
          data={expenseByCategory}
          total={totalExpenses}
          colors={EXP_COLORS}
        />
      </div>
    </div>
  )
}

// ─── CategoryDonut ────────────────────────────────────────────────────────────

function CategoryDonut({ title, data, total, colors }: {
  title: string
  data: { name: string; value: number }[]
  total: number
  colors: string[]
}) {
  return (
    <div className="rounded-2xl bg-white p-6" style={{ boxShadow: '0px 4px 20px rgba(25,28,29,0.04)' }}>
      <h3 className="text-sm font-semibold text-on-surface mb-4">{title}</h3>

      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-on-surface/30">Sem dados</p>
      ) : (
        <div className="flex gap-6">
          {/* Donut */}
          <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
            <PieChart width={120} height={120}>
              <Pie data={data} cx={55} cy={55} innerRadius={36} outerRadius={54} paddingAngle={2} dataKey="value" strokeWidth={0}>
                {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
            </PieChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-xs font-bold text-on-surface">{formatCurrency(total)}</p>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 space-y-2">
            {data.slice(0, 5).map((item, i) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                  <span className="text-xs text-on-surface/70 truncate">{item.name}</span>
                </div>
                <span className="text-xs font-semibold text-on-surface ml-2">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
