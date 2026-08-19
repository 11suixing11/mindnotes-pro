import { expect, openApp, test } from './helpers'

test('v5 imports v4 documents without deleting the source database', async ({ page }) => {
  await page.goto('/manifest.json')
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('mindnotes-pro-v4', 1)
        request.onupgradeneeded = () => {
          const db = request.result
          if (!db.objectStoreNames.contains('docs')) {
            db.createObjectStore('docs', { keyPath: 'id' })
          }
          if (!db.objectStoreNames.contains('folders')) {
            db.createObjectStore('folders', { keyPath: 'id' })
          }
        }
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          const transaction = db.transaction(['docs', 'folders'], 'readwrite')
          transaction.objectStore('folders').put({
            id: 'folder-v4',
            name: 'v4 folder',
            parentId: null,
            order: 0,
            expanded: true,
          })
          transaction.objectStore('docs').put({
            schemaVersion: 4,
            id: 'doc-v4',
            title: 'Imported v4 canvas',
            elements: [],
            bgColor: '#ffffff',
            backgroundStyle: 'plain',
            folderId: 'folder-v4',
            createdAt: 1,
            updatedAt: 2,
          })
          transaction.oncomplete = () => {
            db.close()
            resolve()
          }
          transaction.onerror = () => reject(transaction.error)
          transaction.onabort = () => reject(transaction.error)
        }
      })
  )

  await openApp(page)
  await page.locator('.sb-toggle-btn').click()
  await expect(page.locator('.sb-doc-item[aria-current="page"]')).toContainText(
    'Imported v4 canvas'
  )

  const persisted = await page.evaluate(
    () =>
      new Promise<{ v4Title?: string; v5Schema?: number }>((resolve, reject) => {
        const v4Request = indexedDB.open('mindnotes-pro-v4')
        v4Request.onerror = () => reject(v4Request.error)
        v4Request.onsuccess = () => {
          const v4 = v4Request.result
          const v4Doc = v4.transaction('docs', 'readonly').objectStore('docs').get('doc-v4')
          v4Doc.onerror = () => reject(v4Doc.error)
          v4Doc.onsuccess = () => {
            v4.close()
            const v5Request = indexedDB.open('mindnotes-pro-v5')
            v5Request.onerror = () => reject(v5Request.error)
            v5Request.onsuccess = () => {
              const v5 = v5Request.result
              const v5Doc = v5.transaction('docs', 'readonly').objectStore('docs').get('doc-v4')
              v5Doc.onerror = () => reject(v5Doc.error)
              v5Doc.onsuccess = () => {
                v5.close()
                resolve({
                  v4Title: v4Doc.result?.title,
                  v5Schema: v5Doc.result?.schemaVersion,
                })
              }
            }
          }
        }
      })
  )

  expect(persisted).toEqual({ v4Title: 'Imported v4 canvas', v5Schema: 5 })
})
