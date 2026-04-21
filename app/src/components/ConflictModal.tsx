import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'

interface ConflictModalProps {
  onOverwrite: () => Promise<void>
  onLoadCloud: () => void
}

export default function ConflictModal({ onOverwrite, onLoadCloud }: ConflictModalProps) {
  const { t } = useTranslation()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-surface-container-low border border-outline-variant p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tertiary/10">
            <AlertTriangle size={20} strokeWidth={1.5} className="text-tertiary" />
          </div>
          <h2 className="text-sm font-semibold text-on-surface">{t('sync.conflictTitle')}</h2>
        </div>

        {/* Message */}
        <p className="mb-6 text-xs leading-relaxed text-on-surface/60">
          {t('sync.conflictMessage')}
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => void onOverwrite()}
            className="w-full rounded-2xl bg-on-surface px-4 py-3 text-sm font-semibold text-white transition-all hover:brightness-110"
          >
            {t('sync.overwrite')}
          </button>
          <p className="px-1 text-[10px] text-on-surface/40">{t('sync.overwriteHint')}</p>

          <button
            onClick={onLoadCloud}
            className="mt-2 w-full rounded-2xl border border-outline-variant px-4 py-3 text-sm font-semibold text-on-surface transition-all hover:bg-surface-container-low"
          >
            {t('sync.loadCloud')}
          </button>
          <p className="px-1 text-[10px] text-on-surface/40">{t('sync.loadCloudHint')}</p>
        </div>
      </div>
    </div>
  )
}
