import { useTranslation } from 'react-i18next'

export default function Accounts() {
  const { t } = useTranslation()
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-on-surface">{t('nav.accounts')}</h2>
      <p className="mt-2 text-on-surface/50">{t('common.noData')}</p>
    </div>
  )
}
