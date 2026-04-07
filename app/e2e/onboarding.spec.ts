import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    indexedDB.deleteDatabase('nexus-db')
    localStorage.clear()
  })
})

test('new profile: fills name and navigates to dashboard', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/onboarding/)

  await page.getByPlaceholder('Ex: Arthur Dent').fill('Test User')
  await page.getByRole('button', { name: 'Criar Cofre de Dados' }).click()

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 })
})

test('import JSON: uploads fixture file and navigates to dashboard', async ({ page }) => {
  await page.goto('/onboarding')

  // Switch to import tab
  await page.getByRole('button', { name: 'Importar Dados' }).click()

  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.locator('input[type="file"]').dispatchEvent('click')
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles(path.join(__dirname, 'fixtures/dataFile.json'))

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 })
})
