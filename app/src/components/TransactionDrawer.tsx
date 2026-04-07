import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ChevronDown, Calendar, Tag, Plus } from 'lucide-react'
import { useDataStore } from '@/store/useDataStore'
import { cn, uuid, formatCurrency } from '@/lib/utils'
import type { TransactionType } from '@/types'

interface TransactionDrawerProps {
  open: boolean
  onClose: () => void
}

type TxType = TransactionType

const TYPE_CONFIG: Record<TxType, { label: string; color: string; bg: string; btnClass: string }> = {
  EXPENSE:  { label: 'transactions.expense',  color: 'text-tertiary',  bg: 'bg-tertiary/10',  btnClass: 'bg-tertiary hover:brightness-110' },
  INCOME:   { label: 'transactions.income',   color: 'text-primary',   bg: 'bg-primary/10',   btnClass: 'bg-primary hover:brightness-110' },
  TRANSFER: { label: 'transactions.transfer', color: 'text-on-surface', bg: 'bg-surface-container-high', btnClass: 'bg-on-surface hover:brightness-110' },
}

export default function TransactionDrawer({ open, onClose }: TransactionDrawerProps) {
  const { t } = useTranslation()
  const data = useDataStore((s) => s.data)
  const addTransaction = useDataStore((s) => s.addTransaction)

  const [type, setType] = useState<TxType>('EXPENSE')
  const [amount, setAmount] = useState(0)
  const [amountStr, setAmountStr] = useState('0,00')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Reset on open
  useEffect(() => {
    if (open) {
      setType('EXPENSE')
      setAmount(0)
      setAmountStr('0,00')
      setDate(new Date().toISOString().slice(0, 10))
      setAccountId(data?.accounts[0]?.id ?? '')
      setCategoryId('')
      setDescription('')
      setSelectedTags([])
    }
  }, [open, data])

  function handleAmountInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    const cents = parseInt(raw || '0', 10)
    setAmount(cents / 100)
    setAmountStr((cents / 100).toFixed(2).replace('.', ','))
  }

  function toggleTag(id: string) {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  function handleSave() {
    if (!data || amount === 0) return
    addTransaction({
      id: uuid(),
      accountId: accountId || data.accounts[0]?.id || '',
      categoryId,
      amount,
      type,
      date,
      description,
      isPaid: false,
      tags: selectedTags,
    })
    onClose()
  }

  const categories = (data?.categories ?? []).filter((c) =>
    type === 'INCOME' ? c.type === 'INCOME' : c.type === 'EXPENSE'
  )

  const cfg = TYPE_CONFIG[type]

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-on-surface/20 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <aside
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] flex-col bg-white transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ boxShadow: '-20px 0 60px rgba(25,28,29,0.08)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-base font-semibold text-on-surface">{t('transactions.new')}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface/40 hover:bg-surface-container-low transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
          {/* Amount */}
          <div className="text-center">
            <p className="label text-on-surface/40 mb-1">R$</p>
            <input
              type="text"
              inputMode="numeric"
              value={amountStr}
              onChange={handleAmountInput}
              className="w-full text-center text-5xl font-bold text-on-surface outline-none bg-transparent"
              placeholder="0,00"
            />
          </div>

          {/* Type selector */}
          <div className="flex rounded-2xl bg-surface-container-low p-1 gap-1">
            {(Object.keys(TYPE_CONFIG) as TxType[]).map((key) => (
              <button
                key={key}
                onClick={() => setType(key)}
                className={cn(
                  'flex-1 rounded-xl py-2 text-sm font-medium transition-all',
                  type === key
                    ? cn('bg-white shadow-ambient', TYPE_CONFIG[key].color)
                    : 'text-on-surface/40 hover:text-on-surface/60'
                )}
              >
                {t(TYPE_CONFIG[key].label)}
              </button>
            ))}
          </div>

          {/* Date */}
          <div>
            <label className="label text-on-surface/40 block mb-2">{t('transactions.date')}</label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/40" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl bg-surface-container-low py-3 pl-9 pr-4 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Account */}
          <div>
            <label className="label text-on-surface/40 block mb-2">{t('transactions.account')}</label>
            <div className="relative">
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full appearance-none rounded-xl bg-surface-container-low py-3 pl-4 pr-9 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30"
              >
                {(data?.accounts ?? []).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
                {(data?.accounts ?? []).length === 0 && (
                  <option value="">{t('common.noData')}</option>
                )}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface/40 pointer-events-none" />
            </div>
          </div>

          {/* Category */}
          {type !== 'TRANSFER' && (
            <div>
              <label className="label text-on-surface/40 block mb-2">{t('transactions.category')}</label>
              <div className="relative">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full appearance-none rounded-xl bg-surface-container-low py-3 pl-4 pr-9 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">{t('transactions.category')}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface/40 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Tags */}
          {(data?.tags ?? []).length > 0 && (
            <div>
              <label className="label text-on-surface/40 flex items-center gap-1 mb-2">
                <Tag size={12} />
                {t('transactions.tags')}
              </label>
              <div className="flex flex-wrap gap-2">
                {(data?.tags ?? []).map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-all',
                      selectedTags.includes(tag.id)
                        ? 'text-white shadow-sm'
                        : 'bg-surface-container-low text-on-surface/60'
                    )}
                    style={selectedTags.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                  >
                    #{tag.name}
                  </button>
                ))}
                <button className="flex items-center gap-1 rounded-full bg-surface-container-low px-3 py-1 text-xs text-on-surface/40">
                  <Plus size={10} /> {t('common.add')}
                </button>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="label text-on-surface/40 block mb-2">{t('transactions.description')}</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('transactions.descriptionPlaceholder')}
              className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-6 pb-8 pt-4 border-t border-surface-container-low">
          <p className="text-center text-xs text-on-surface/30 mb-3">
            {t('transactions.shortcutHint')}
          </p>
          <button
            onClick={handleSave}
            disabled={amount === 0}
            className={cn(
              'w-full rounded-2xl py-4 text-sm font-semibold text-white transition-all disabled:opacity-40',
              cfg.btnClass
            )}
          >
            {t(`transactions.save.${type.toLowerCase()}`)} →
          </button>
        </div>
      </aside>
    </>
  )
}

// Suppress unused import warning — formatCurrency used externally
void formatCurrency
