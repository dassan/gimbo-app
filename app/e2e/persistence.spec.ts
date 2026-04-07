import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataFile = JSON.parse(readFileSync(path.join(__dirname, 'fixtures/dataFile.json'), 'utf-8')) as Record<string, unknown>

test('data persists after page reload', async ({ page }) => {
  // Seed IndexedDB with fixture data
  await page.addInitScript((data) => {
    indexedDB.deleteDatabase('nexus-db')
    const req = indexedDB.open('nexus-db', 1)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('ledger')) db.createObjectStore('ledger')
    }
    req.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      const tx = db.transaction('ledger', 'readwrite')
      tx.objectStore('ledger').put(data, 'current')
    }
  }, dataFile)

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/dashboard/)

  // Fixture transaction description should appear in recent transactions
  await expect(page.getByText('Salário Janeiro')).toBeVisible({ timeout: 5000 })

  // Reload — should stay on dashboard (not redirect to onboarding)
  await page.reload()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 })
  await expect(page.getByText('Salário Janeiro')).toBeVisible()
})
