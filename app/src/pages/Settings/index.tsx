import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Landmark,
  Tag,
  FolderTree,
  User,
  Sliders,
  Database,
  Plus,
  Upload,
  Download,
  ShieldCheck,
  History,
  PlusCircle,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { useDataStore } from '@/store/useDataStore'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { downloadDataFile, openDataFile } from '@/lib/storage/fileSystem'
import { clearIdb, saveToIdb } from '@/lib/storage/indexedDb'
import { formatCurrency, cn, uuid, now } from '@/lib/utils'
import { AUDIT_RETENTION_DEFAULT } from '@/lib/storage/schema'
import type { Locale, Theme, AuditAction } from '@/types'

type Section = 'accounts' | 'categories' | 'tags' | 'profile' | 'preferences' | 'data' | 'history'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora mesmo'
  if (mins < 60) return `há ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `há ${hrs}h`
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const DATA_SECTIONS: { key: Section; icon: React.ReactNode; labelKey: string }[] = [
  {
    key: 'accounts',
    icon: <Landmark size={16} strokeWidth={1.5} />,
    labelKey: 'settings.accounts',
  },
  {
    key: 'categories',
    icon: <FolderTree size={16} strokeWidth={1.5} />,
    labelKey: 'settings.categories',
  },
  { key: 'tags', icon: <Tag size={16} strokeWidth={1.5} />, labelKey: 'settings.tags' },
]
const APP_SECTIONS: { key: Section; icon: React.ReactNode; labelKey: string }[] = [
  { key: 'profile', icon: <User size={16} strokeWidth={1.5} />, labelKey: 'settings.profile' },
  {
    key: 'preferences',
    icon: <Sliders size={16} strokeWidth={1.5} />,
    labelKey: 'settings.preferences',
  },
  { key: 'data', icon: <Database size={16} strokeWidth={1.5} />, labelKey: 'settings.dataFile' },
  { key: 'history', icon: <History size={16} strokeWidth={1.5} />, labelKey: 'audit.title' },
]

const ACTION_ICON: Record<AuditAction, React.ReactNode> = {
  CREATE: <PlusCircle size={14} className="text-primary" strokeWidth={2} />,
  UPDATE: <Pencil size={14} className="text-on-surface/40" strokeWidth={2} />,
  DELETE: <Trash2 size={14} className="text-tertiary" strokeWidth={2} />,
}

export default function Settings() {
  const { t, i18n } = useTranslation()
  const data = useDataStore((s) => s.data)
  const { addAccount, addCategory, addTag, updateUser, setRetentionLimit } = useDataStore()
  const loadData = useDataStore((s) => s.loadData)
  const { workspace, setTheme, setLocale } = useWorkspaceStore()

  const [activeSection, setActiveSection] = useState<Section>('accounts')
  const [profileName, setProfileName] = useState(data?.user.name ?? '')
  const [profileEmail, setProfileEmail] = useState(data?.user.email ?? '')

  function handleSaveProfile() {
    if (!data) return
    updateUser({ name: profileName, email: profileEmail })
  }

  function handleLocaleChange(locale: Locale) {
    setLocale(locale)
    void i18n.changeLanguage(locale)
  }

  function handleExport() {
    if (data) downloadDataFile(data)
  }

  async function handleImport() {
    const imported = await openDataFile()
    if (!imported) return
    await clearIdb()
    await saveToIdb(imported)
    loadData(imported)
  }

  function handleAddAccount() {
    addAccount({ id: uuid(), name: 'Nova Conta', type: 'CHECKING', balance: 0 })
  }

  function handleAddCategory() {
    addCategory({
      id: uuid(),
      parentId: null,
      name: 'Nova Categoria',
      icon: 'tag',
      color: '#6B7280',
      type: 'EXPENSE',
    })
  }

  function handleAddTag() {
    addTag({ id: uuid(), name: 'nova-tag', color: '#6B7280' })
  }

  const isUnlimited = data?.settings.auditLogRetentionLimit === null

  function handleRetentionToggle() {
    setRetentionLimit(isUnlimited ? AUDIT_RETENTION_DEFAULT : null)
  }

  if (!data) return null

  // Audit log in reverse chronological order
  const auditLog = [...data.auditLog].reverse()

  // Group audit entries by date
  const auditGroups = auditLog.reduce<Map<string, typeof auditLog>>((map, entry) => {
    const key = entry.timestamp.slice(0, 10)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(entry)
    return map
  }, new Map())

  function dateGroupLabel(dateKey: string) {
    const d = new Date(dateKey + 'T12:00:00')
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return t('audit.today')
    if (d.toDateString() === yesterday.toDateString()) return t('audit.yesterday')
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-bold text-on-surface mb-1">{t('settings.title')}</h1>

      <div className="mt-6 flex gap-6">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="w-52 shrink-0">
          <SidebarGroup label={t('settings.dataManagement')}>
            {DATA_SECTIONS.map((s) => (
              <SidebarItem
                key={s.key}
                icon={s.icon}
                label={t(s.labelKey)}
                active={activeSection === s.key}
                onClick={() => setActiveSection(s.key)}
              />
            ))}
          </SidebarGroup>

          <SidebarGroup label={t('settings.appSettings')} className="mt-4">
            {APP_SECTIONS.map((s) => (
              <SidebarItem
                key={s.key}
                icon={s.icon}
                label={t(s.labelKey)}
                active={activeSection === s.key}
                onClick={() => setActiveSection(s.key)}
              />
            ))}
          </SidebarGroup>
        </aside>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Accounts */}
          {activeSection === 'accounts' && (
            <Section title={t('settings.accounts')}>
              <div className="space-y-2 mb-4">
                {data.accounts.length === 0 && (
                  <p className="py-4 text-center text-sm text-on-surface/40">
                    {t('common.noData')}
                  </p>
                )}
                {data.accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="flex items-center gap-4 rounded-2xl bg-white px-5 py-4"
                    style={{ boxShadow: '0px 2px 12px rgba(25,28,29,0.04)' }}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <Landmark size={18} className="text-primary" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface">{acc.name}</p>
                      <p className="text-xs text-on-surface/40">
                        {t(
                          `accounts.${acc.type === 'CHECKING' ? 'checking' : acc.type === 'SAVINGS' ? 'savings' : 'creditCard'}`
                        )}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-on-surface">
                      {formatCurrency(acc.balance)}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddAccount}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-white hover:brightness-110 transition-all"
              >
                <Plus size={16} strokeWidth={2.5} />
                {t('settings.newAccount')}
              </button>
            </Section>
          )}

          {/* Categories */}
          {activeSection === 'categories' && (
            <Section title={t('settings.categories')}>
              <div className="mb-4 rounded-2xl bg-primary px-5 py-4 text-white">
                <p className="text-xs font-bold uppercase tracking-widest opacity-70">
                  {t('settings.subcategoriesTip')}
                </p>
                <p className="mt-1 text-sm">{t('settings.subcategoriesTipDesc')}</p>
              </div>
              <div className="space-y-2 mb-4">
                {data.categories
                  .filter((c) => !c.parentId)
                  .map((parent) => (
                    <div key={parent.id}>
                      <div
                        className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4"
                        style={{ boxShadow: '0px 2px 12px rgba(25,28,29,0.04)' }}
                      >
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-white text-sm font-semibold"
                          style={{ backgroundColor: parent.color }}
                        >
                          {parent.name[0]}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-on-surface">{parent.name}</p>
                          <p className="text-xs text-on-surface/40">
                            {parent.type === 'INCOME' ? 'Receita' : 'Despesa'}
                          </p>
                        </div>
                      </div>
                      {data.categories
                        .filter((c) => c.parentId === parent.id)
                        .map((child) => (
                          <div
                            key={child.id}
                            className="ml-6 mt-1 flex items-center gap-3 rounded-xl bg-surface-container-low px-4 py-3"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-on-surface/20" />
                            <p className="text-sm text-on-surface/70">{child.name}</p>
                          </div>
                        ))}
                    </div>
                  ))}
              </div>
              <button
                onClick={handleAddCategory}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-white hover:brightness-110 transition-all"
              >
                <Plus size={16} strokeWidth={2.5} />
                {t('settings.newCategory')}
              </button>
            </Section>
          )}

          {/* Tags */}
          {activeSection === 'tags' && (
            <Section title={t('settings.tags')}>
              <div className="flex flex-wrap gap-2 mb-6">
                {data.tags.length === 0 && (
                  <p className="text-sm text-on-surface/40">{t('common.noData')}</p>
                )}
                {data.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full px-4 py-1.5 text-sm font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
              <button
                onClick={handleAddTag}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-white hover:brightness-110 transition-all"
              >
                <Plus size={16} strokeWidth={2.5} />
                {t('settings.newTag')}
              </button>
            </Section>
          )}

          {/* Profile */}
          {activeSection === 'profile' && (
            <Section title={t('settings.profile')}>
              <div className="space-y-4">
                <div>
                  <label className="label text-on-surface/40 block mb-1.5">
                    {t('onboarding.name')}
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="label text-on-surface/40 block mb-1.5">
                    {t('onboarding.email')}
                  </label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  className="rounded-2xl bg-on-surface px-6 py-3 text-sm font-semibold text-white hover:brightness-110 transition-all"
                >
                  {t('settings.saveProfile')}
                </button>
              </div>
            </Section>
          )}

          {/* Preferences */}
          {activeSection === 'preferences' && (
            <Section title={t('settings.preferences')}>
              <div className="space-y-3">
                <SettingRow label={t('settings.language')}>
                  <select
                    value={workspace.locale}
                    onChange={(e) => handleLocaleChange(e.target.value as Locale)}
                    className="appearance-none rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                  </select>
                </SettingRow>

                <SettingRow label={t('settings.theme')}>
                  <select
                    value={workspace.theme}
                    onChange={(e) => setTheme(e.target.value as Theme)}
                    className="appearance-none rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
                  >
                    <option value="system">{t('settings.themeSystem')}</option>
                    <option value="light">{t('settings.themeLight')}</option>
                    <option value="dark">{t('settings.themeDark')}</option>
                  </select>
                </SettingRow>

                {/* Audit log retention toggle */}
                <div
                  className="rounded-2xl bg-white px-5 py-4 space-y-3"
                  style={{ boxShadow: '0px 2px 12px rgba(25,28,29,0.04)' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-on-surface">{t('audit.retentionLabel')}</p>
                      <p className="text-xs text-on-surface/40 mt-0.5">
                        {t('audit.retentionDefault')}
                      </p>
                    </div>
                    <button
                      onClick={handleRetentionToggle}
                      className={cn(
                        'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
                        isUnlimited ? 'bg-primary' : 'bg-surface-container-high'
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 mt-0.5',
                          isUnlimited ? 'translate-x-5' : 'translate-x-0.5'
                        )}
                      />
                    </button>
                  </div>
                  {isUnlimited && (
                    <div className="flex items-start gap-2 rounded-xl bg-tertiary/8 px-3 py-2.5">
                      <AlertTriangle
                        size={14}
                        className="text-tertiary shrink-0 mt-0.5"
                        strokeWidth={2}
                      />
                      <p className="text-xs text-tertiary">{t('audit.retentionHint')}</p>
                    </div>
                  )}
                </div>
              </div>
            </Section>
          )}

          {/* Data file */}
          {activeSection === 'data' && (
            <Section title={t('settings.dataFile')}>
              <div className="mb-6 rounded-2xl bg-surface-container-low p-5">
                <p className="text-sm text-on-surface/60">{t('settings.localFirst')}</p>
                <div className="mt-3 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-primary" strokeWidth={2} />
                  <span className="text-xs font-semibold text-primary">
                    {t('settings.privacyGuarantee')}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleExport}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-white py-6 hover:bg-surface-container-low transition-colors"
                  style={{ boxShadow: '0px 2px 12px rgba(25,28,29,0.04)' }}
                >
                  <Download size={22} className="text-on-surface/60" strokeWidth={1.5} />
                  <span className="text-sm font-medium text-on-surface">
                    {t('settings.exportData')}
                  </span>
                </button>
                <button
                  onClick={() => void handleImport()}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-white py-6 hover:bg-surface-container-low transition-colors"
                  style={{ boxShadow: '0px 2px 12px rgba(25,28,29,0.04)' }}
                >
                  <Upload size={22} className="text-on-surface/60" strokeWidth={1.5} />
                  <span className="text-sm font-medium text-on-surface">
                    {t('settings.importData')}
                  </span>
                </button>
              </div>
            </Section>
          )}

          {/* Modification history */}
          {activeSection === 'history' && (
            <Section title={t('audit.title')} subtitle={t('audit.subtitle')}>
              {auditLog.length === 0 ? (
                <div
                  className="rounded-2xl bg-white py-12 text-center"
                  style={{ boxShadow: '0px 2px 12px rgba(25,28,29,0.04)' }}
                >
                  <History size={32} className="mx-auto text-on-surface/20 mb-3" strokeWidth={1} />
                  <p className="text-sm text-on-surface/40">{t('audit.noEntries')}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Array.from(auditGroups.entries()).map(([dateKey, entries]) => (
                    <div key={dateKey}>
                      <p className="label text-xs font-semibold text-on-surface/40 uppercase mb-2">
                        {dateGroupLabel(dateKey)}
                      </p>
                      <div
                        className="rounded-2xl bg-white overflow-hidden"
                        style={{ boxShadow: '0px 2px 12px rgba(25,28,29,0.04)' }}
                      >
                        {entries.map((entry, i) => (
                          <div
                            key={entry.id}
                            className={cn(
                              'flex items-center gap-3 px-5 py-3.5',
                              i < entries.length - 1 && 'border-b border-surface-container-low'
                            )}
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container-low">
                              {ACTION_ICON[entry.action]}
                            </div>
                            <p className="flex-1 text-sm text-on-surface truncate">
                              {entry.summary}
                            </p>
                            <span className="text-xs text-on-surface/30 shrink-0">
                              {relativeTime(entry.timestamp)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SidebarGroup({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <p className="label mb-2 px-3 text-on-surface/40">{label}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function SidebarItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-left',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-on-surface/50 hover:bg-surface-container-low hover:text-on-surface/80'
      )}
    >
      <span className={active ? 'text-primary' : 'text-on-surface/40'}>{icon}</span>
      {label}
    </button>
  )
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h2 className="text-base font-semibold text-on-surface">{title}</h2>
      {subtitle && <p className="text-xs text-on-surface/40 mt-0.5 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  )
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between rounded-2xl bg-white px-5 py-4"
      style={{ boxShadow: '0px 2px 12px rgba(25,28,29,0.04)' }}
    >
      <span className="text-sm text-on-surface">{label}</span>
      {children}
    </div>
  )
}

void now
