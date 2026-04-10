import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Settings from '@/pages/Settings'
import { useDataStore } from '@/store/useDataStore'
import { makeDataFile } from '@/test/fixtures/dataFile'
import { downloadDataFile, openDataFile } from '@/lib/storage/fileSystem'
import { importFileToIdb } from '@/lib/storage/sync'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { changeLanguage: vi.fn() } }),
}))

vi.mock('@/lib/storage/fileSystem', () => ({
  downloadDataFile: vi.fn(),
  openDataFile: vi.fn(),
  loadWorkspace: vi.fn().mockReturnValue(null),
  saveWorkspace: vi.fn(),
}))

vi.mock('@/lib/storage/sync', () => ({
  importFileToIdb: vi.fn(),
}))

vi.mock('@/lib/storage/indexedDb', () => ({
  saveFileHandle: vi.fn(),
}))

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useDataStore.setState({ data: makeDataFile(), unsyncedCount: 0 })
  vi.clearAllMocks()
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function renderDataSection() {
  render(<Settings />)
  await userEvent.click(screen.getByRole('button', { name: 'settings.dataFile' }))
}

async function triggerImportFailure() {
  vi.mocked(openDataFile).mockResolvedValue({
    handle: {} as FileSystemFileHandle,
    file: new File(['not valid json'], 'corrupt.json', { type: 'application/json' }),
  })
  vi.mocked(importFileToIdb).mockRejectedValue(new Error('Zod validation failed'))

  await userEvent.click(screen.getByRole('button', { name: /settings\.importData/i }))
  await screen.findByText('settings.importFileError')
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Settings — corrupted file import (M-12)', () => {
  it('shows the import error message when the file is invalid', async () => {
    await renderDataSection()
    await triggerImportFailure()

    expect(screen.getByText('settings.importFileError')).toBeInTheDocument()
  })

  it('shows the emergency export button after import failure', async () => {
    await renderDataSection()
    await triggerImportFailure()

    expect(screen.getByRole('button', { name: /settings\.exportLocalData/i })).toBeInTheDocument()
  })

  it('calls downloadDataFile with current data when emergency export is clicked', async () => {
    const data = makeDataFile()
    useDataStore.setState({ data, unsyncedCount: 0 })

    await renderDataSection()
    await triggerImportFailure()

    await userEvent.click(screen.getByRole('button', { name: /settings\.exportLocalData/i }))

    expect(vi.mocked(downloadDataFile)).toHaveBeenCalledWith(data)
  })
})
