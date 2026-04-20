import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import { useDataStore } from '@/store/useDataStore'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { cn, parseDateLocal } from '@/lib/utils'
import PeriodSelector from '@/components/PeriodSelector'
import type { PeriodValue } from '@/components/PeriodSelector'
import CashFlowView from './CashFlowView'
import CategoriasView from './CategoriasView'

type ActiveTab = 'categorias' | 'cashflow' | 'contas' | 'tags'

const TABS: ActiveTab[] = ['categorias', 'cashflow', 'contas', 'tags']

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
        <CategoriasView
          transactions={data.transactions}
          accounts={data.accounts}
          categories={data.categories}
          startDate={startDate}
          endDate={endDate}
          includeUnpaid={includeUnpaid}
          shadowClass={shadowClass}
        />
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
