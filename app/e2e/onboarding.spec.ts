import { test, expect, type Page } from '@playwright/test'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Inject mock implementations of the File System Access API pickers into the
 * page before any scripts run. The mocks write to / read from an in-memory
 * store so we can verify persistence without touching the real file system.
 *
 * showSaveFilePicker  — resolves immediately with a fake handle that records
 *                       written content in window.__lastWritten.
 * showOpenFilePicker  — resolves with a fake handle whose getFile() returns
 *                       the JSON passed as `fileContent`.
 */
async function mockFileSystemApi(page: Page, fileContent?: string) {
  await page.addInitScript((content?: string) => {
    // Minimal writable stream that captures the written value
    class FakeWritable {
      chunks: string[] = []
      write(data: string) {
        this.chunks.push(data)
        return Promise.resolve()
      }
      close() {
        ;(window as { __lastWritten?: string }).__lastWritten = this.chunks.join('')
        return Promise.resolve()
      }
    }

    // Fake handle returned by showSaveFilePicker
    const saveHandle = {
      kind: 'file',
      name: 'nexus-finances.json',
      createWritable: () => Promise.resolve(new FakeWritable()),
    }

    window.showSaveFilePicker = () => Promise.resolve(saveHandle as unknown as FileSystemFileHandle)

    if (content !== undefined) {
      const openHandle = {
        kind: 'file',
        name: 'nexus-finances.json',
        getFile: () =>
          Promise.resolve({
            text: () => Promise.resolve(content),
          }),
        createWritable: () => Promise.resolve(new FakeWritable()),
      }
      window.showOpenFilePicker = () =>
        Promise.resolve([openHandle] as unknown as FileSystemFileHandle[])
    }
  }, fileContent)
}

// ─── Setup ────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    indexedDB.deleteDatabase('nexus-db')
    localStorage.clear()
  })
})

// ─── New profile flow ─────────────────────────────────────────────────────────

test('new profile: fills name, confirms file picker, navigates to dashboard', async ({ page }) => {
  await mockFileSystemApi(page)
  await page.goto('/')
  await expect(page).toHaveURL(/\/onboarding/)

  await page.getByPlaceholder('Ex: Arthur Dent').fill('Test User')
  await page.getByRole('button', { name: 'Criar Cofre de Dados' }).click()

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 })
})

test('new profile: cancels file picker and stays on onboarding', async ({ page }) => {
  // Override showSaveFilePicker to simulate user cancellation
  await page.addInitScript(() => {
    indexedDB.deleteDatabase('nexus-db')
    localStorage.clear()
    window.showSaveFilePicker = () => {
      const err = new DOMException('User cancelled', 'AbortError')
      return Promise.reject(err)
    }
  })

  await page.goto('/')
  await page.getByPlaceholder('Ex: Arthur Dent').fill('Test User')
  await page.getByRole('button', { name: 'Criar Cofre de Dados' }).click()

  // Should stay on onboarding and show cancellation feedback
  await expect(page).toHaveURL(/\/onboarding/)
  await expect(
    page.getByText('Seleção de arquivo cancelada. Tente novamente.')
  ).toBeVisible({ timeout: 3000 })
})

// ─── Import flow (drag-and-drop / file input) ─────────────────────────────────

test('import JSON: uploads fixture file and navigates to dashboard', async ({ page }) => {
  await page.goto('/onboarding')

  await page.getByRole('button', { name: 'Importar Dados' }).click()

  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.locator('input[type="file"]').dispatchEvent('click')
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles(path.join(__dirname, 'fixtures/dataFile.json'))

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 })
})

test('import JSON: invalid file shows error and stays on onboarding', async ({ page }) => {
  await page.goto('/onboarding')
  await page.getByRole('button', { name: 'Importar Dados' }).click()

  // Create a temp invalid JSON file via Playwright's upload API
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.locator('input[type="file"]').dispatchEvent('click')
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{ not valid json !!!'),
  })

  await expect(page).toHaveURL(/\/onboarding/)
  await expect(
    page.getByText('Arquivo inválido ou corrompido.')
  ).toBeVisible({ timeout: 3000 })
})

// ─── Import flow (File System Access API picker) ──────────────────────────────

test('import via picker: loads data, saves handle, navigates to dashboard', async ({ page }) => {
  const fixtureJson = readFileSync(path.join(__dirname, 'fixtures/dataFile.json'), 'utf-8')
  await mockFileSystemApi(page, fixtureJson)
  await page.goto('/onboarding')

  await page.getByRole('button', { name: 'Importar Dados' }).click()
  await page.getByRole('button', { name: 'Importar e Iniciar' }).click()

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 })
})
