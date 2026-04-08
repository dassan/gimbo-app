import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataFile = JSON.parse(
  readFileSync(path.join(__dirname, 'fixtures/dataFile.json'), 'utf-8')
) as Record<string, unknown>

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function seedIdb(page: import('@playwright/test').Page, data: Record<string, unknown>) {
  await page.addInitScript((d) => {
    indexedDB.deleteDatabase('nexus-db')
    const req = indexedDB.open('nexus-db', 2)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('ledger')) db.createObjectStore('ledger')
      if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles')
    }
    req.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      const tx = db.transaction('ledger', 'readwrite')
      tx.objectStore('ledger').put(d, 'current')
    }
  }, data)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test('data persists after page reload', async ({ page }) => {
  // Seed IndexedDB with fixture data
  await seedIdb(page, dataFile)

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/dashboard/)

  // Fixture transaction description should appear in recent transactions
  await expect(page.getByText('Salário Janeiro')).toBeVisible({ timeout: 5000 })

  // Reload — should stay on dashboard (not redirect to onboarding)
  await page.reload()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 })
  await expect(page.getByText('Salário Janeiro')).toBeVisible()
})

test('sync badge appears after a mutation and is hidden when count is zero', async ({ page }) => {
  await seedIdb(page, dataFile)
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/dashboard/)

  const syncButton = page.getByRole('button', { name: /sincronizar agora/i })

  // No unsynced changes on load — badge must not be visible
  await expect(syncButton.locator('span')).not.toBeVisible()

  // Trigger a mutation via the Settings profile form:
  // 1. Navigate to Settings and open the "Perfil" section via the sidebar
  await page.goto('/settings')
  await page.getByText('Perfil').click()

  // 2. Fill in the name input (first text input in the profile section) and save
  const nameInput = page.locator('input[type="text"]').first()
  await nameInput.fill('Novo Nome')
  await page.getByRole('button', { name: /salvar perfil/i }).click()

  // After the mutation the badge should show at least 1 unsynced change
  await expect(syncButton.locator('span')).toBeVisible({ timeout: 3000 })
})
