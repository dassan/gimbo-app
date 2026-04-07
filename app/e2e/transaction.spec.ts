import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataFile = JSON.parse(readFileSync(path.join(__dirname, 'fixtures/dataFile.json'), 'utf-8')) as Record<string, unknown>

test.beforeEach(async ({ page }) => {
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
})

test('add transaction: opens FAB drawer and saves', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/dashboard/)

  // Open FAB
  await page.getByRole('button', { name: 'Nova Transação' }).click()

  // Wait for drawer to open and fill amount input
  const amountInput = page.locator('input[placeholder="0,00"]')
  await amountInput.waitFor({ state: 'visible', timeout: 5000 })
  await amountInput.fill('15000') // R$ 150,00

  // Save as expense (default type)
  await page.getByRole('button', { name: 'Salvar Despesa' }).click()

  // Drawer slides out — backdrop gets pointer-events-none when closed
  const backdrop = page.locator('.fixed.inset-0.z-50').first()
  await expect(backdrop).toHaveClass(/pointer-events-none/, { timeout: 3000 })
})
