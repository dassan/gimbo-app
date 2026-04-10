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

test('conflict modal appears when file is externally modified between syncs', async ({ page }) => {
  const T_FIRST = 1_700_000_000_000
  const T_EXTERNAL = T_FIRST + 60_000 // 60 s newer — simulates an external write

  // Seed IDB and inject a mock file system handle with controllable lastModified.
  await page.addInitScript(
    (args: { data: Record<string, unknown>; tFirst: number; tExternal: number }) => {
      const { data, tFirst, tExternal } = args

      // Seed IDB
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
        tx.objectStore('ledger').put(data, 'current')
      }

      // In-memory "disk" state for the fake handle
      let lastWritten = JSON.stringify(data)
      let simulateConflict = false

      class FakeWritable {
        chunks: string[] = []
        write(d: string) {
          this.chunks.push(d)
          return Promise.resolve()
        }
        close() {
          lastWritten = this.chunks.join('')
          return Promise.resolve()
        }
      }

      const saveHandle = {
        kind: 'file' as const,
        name: 'nexus-finances.json',
        createWritable: () => Promise.resolve(new FakeWritable()),
        getFile: () =>
          Promise.resolve({
            text: () => Promise.resolve(lastWritten),
            get lastModified() {
              return simulateConflict ? tExternal : tFirst
            },
          }),
      }

      window.showSaveFilePicker = () =>
        Promise.resolve(saveHandle as unknown as FileSystemFileHandle)

      // Expose a flag setter so Playwright can trigger the conflict simulation
      ;(window as unknown as Record<string, unknown>).__setConflict = (v: boolean) => {
        simulateConflict = v
      }
    },
    { data: dataFile, tFirst: T_FIRST, tExternal: T_EXTERNAL }
  )

  await page.goto('/settings')
  await page.getByText('Perfil').click()

  const syncButton = page.getByRole('button', { name: /sincronizar agora/i })
  const nameInput = page.locator('input[type="text"]').first()

  // First mutation + sync to establish _lastWrittenModified = T_FIRST
  await nameInput.fill('Nome Inicial')
  await page.getByRole('button', { name: /salvar perfil/i }).click()
  await expect(syncButton.locator('span')).toBeVisible({ timeout: 3000 })
  await syncButton.click()
  await expect(syncButton.locator('span')).not.toBeVisible({ timeout: 5000 })

  // Simulate external modification — next getFile() will return T_EXTERNAL
  await page.evaluate(() => {
    ;(window as unknown as Record<string, unknown>).__setConflict(true)
  })

  // Second mutation so unsyncedCount > 0 again
  await nameInput.fill('Nome Conflito')
  await page.getByRole('button', { name: /salvar perfil/i }).click()
  await expect(syncButton.locator('span')).toBeVisible({ timeout: 3000 })

  // Second sync attempt — conflict should be detected
  await syncButton.click()
  await expect(page.getByText('Conflito detectado')).toBeVisible({ timeout: 3000 })

  // Resolve via "Carregar do arquivo" — modal should close
  await page.getByRole('button', { name: /carregar do arquivo/i }).click()
  await expect(page.getByText('Conflito detectado')).not.toBeVisible({ timeout: 3000 })
})

test('permission-prompt: sync click requests permission and proceeds to save', async ({
  page,
}) => {
  // Inject a mock FileSystemFileHandle into the IDB handles store.
  // Because IDB serialises via structured clone (which drops functions), we
  // monkey-patch IDBObjectStore.prototype.get so that when the app reads
  // the 'data' key from the 'handles' store it receives our fake handle
  // instead of whatever is physically stored.
  await page.addInitScript((data: Record<string, unknown>) => {
    // Seed ledger
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
      tx.objectStore('ledger').put(data, 'current')
    }

    class FakeWritable {
      chunks: string[] = []
      write(d: string) {
        this.chunks.push(d)
        return Promise.resolve()
      }
      close() {
        return Promise.resolve()
      }
    }

    // The idb library wraps the return value of IDBObjectStore.prototype.get via
    // its internal wrap() function. For non-IDBRequest objects, wrap() returns
    // the value as-is, so our promptHandle flows directly through to
    // loadFileHandle(). This lets checkHandlePermission() find queryPermission()
    // on the returned object without any fake-IDBRequest plumbing.
    const promptHandle = {
      kind: 'file' as const,
      name: 'nexus-finances.json',
      queryPermission: () => Promise.resolve('prompt' as PermissionState),
      requestPermission: () => Promise.resolve('granted' as PermissionState),
      createWritable: () => Promise.resolve(new FakeWritable()),
      getFile: () =>
        Promise.resolve({
          text: () => Promise.resolve(JSON.stringify(data)),
          lastModified: Date.now(),
        }),
    }

    const _origGet = IDBObjectStore.prototype.get
    IDBObjectStore.prototype.get = function (this: IDBObjectStore, key: IDBValidKey) {
      if (this.name === 'handles' && key === 'data') {
        // Return promptHandle directly. idb's wrap() sees a plain object (not an
        // IDBRequest) and returns it as-is, so db.get() resolves to promptHandle.
        return promptHandle as unknown as IDBRequest
      }
      return _origGet.call(this, key)
    }
  }, dataFile)

  await page.goto('/settings')
  await page.getByText('Perfil').click()

  const syncButton = page.getByRole('button', { name: /sincronizar agora/i })
  const nameInput = page.locator('input[type="text"]').first()

  // Trigger a mutation — unsyncedCount becomes 1 and the badge appears
  await nameInput.fill('Nome Permissão')
  await page.getByRole('button', { name: /salvar perfil/i }).click()
  await expect(syncButton.locator('span')).toBeVisible({ timeout: 3000 })

  // Sync click: permission is granted → save succeeds → badge disappears
  await syncButton.click()
  await expect(syncButton.locator('span')).not.toBeVisible({ timeout: 5000 })
})

test('file-lost: alert badge appears and recovery re-opens picker', async ({ page }) => {
  // Inject a mock save handle whose createWritable() throws NotFoundError on the first
  // sync call (simulating the file having been deleted or moved), then succeeds on the
  // second call (recovery after picker re-association).
  await page.addInitScript((data: Record<string, unknown>) => {
    // Seed IDB
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
      tx.objectStore('ledger').put(data, 'current')
    }

    class FakeWritable {
      chunks: string[] = []
      write(d: string) {
        this.chunks.push(d)
        return Promise.resolve()
      }
      close() {
        return Promise.resolve()
      }
    }

    // Handle that fails with NotFoundError on createWritable
    const lostHandle = {
      kind: 'file' as const,
      name: 'nexus-finances.json',
      createWritable: () =>
        Promise.reject(Object.assign(new Error('NotFoundError'), { name: 'NotFoundError' })),
      getFile: () =>
        Promise.reject(Object.assign(new Error('NotFoundError'), { name: 'NotFoundError' })),
    }

    // Handle that succeeds — returned by picker on recovery click
    const goodHandle = {
      kind: 'file' as const,
      name: 'nexus-finances.json',
      createWritable: () => Promise.resolve(new FakeWritable()),
      getFile: () =>
        Promise.resolve({
          text: () => Promise.resolve(JSON.stringify(data)),
          lastModified: Date.now(),
        }),
    }

    let callCount = 0
    window.showSaveFilePicker = () => {
      callCount++
      // First call (initial sync attempt): return lost handle
      // Second call (recovery): return good handle
      return Promise.resolve(
        (callCount === 1 ? lostHandle : goodHandle) as unknown as FileSystemFileHandle
      )
    }
  }, dataFile)

  await page.goto('/settings')
  await page.getByText('Perfil').click()

  const syncButton = page.getByRole('button', { name: /sincronizar agora/i })
  const nameInput = page.locator('input[type="text"]').first()

  // Trigger a mutation so unsyncedCount > 0
  await nameInput.fill('Nome Teste')
  await page.getByRole('button', { name: /salvar perfil/i }).click()
  await expect(syncButton.locator('span')).toBeVisible({ timeout: 3000 })

  // First sync — handle is missing, badge should switch to "!"
  await syncButton.click()
  await expect(syncButton.locator('span')).toHaveText('!', { timeout: 3000 })

  // Second sync (recovery click) — picker opens with good handle, badge clears
  await syncButton.click()
  await expect(syncButton.locator('span')).not.toBeVisible({ timeout: 5000 })
})
