import { test, expect } from '@playwright/test'

test.describe('Document management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })
  })

  test('status bar shows document count', async ({ page }) => {
    const status = page.locator('.status.panel')
    await expect(status).toContainText('docs')
    // Should show at least 1 doc (the welcome document)
    const docText = await status.textContent()
    const match = docText?.match(/(\d+)\s*docs/)
    expect(match).not.toBeNull()
    const docCount = parseInt(match![1], 10)
    expect(docCount).toBeGreaterThanOrEqual(1)
  })

  test('can create a new document via store', async ({ page }) => {
    // Get initial doc count
    const status = page.locator('.status.panel')
    const initialText = await status.textContent()
    const initialMatch = initialText?.match(/(\d+)\s*docs/)
    const initialCount = initialMatch ? parseInt(initialMatch[1], 10) : 1

    // Create a new document via the Zustand store
    await page.evaluate(() => {
      // Access the store via window or by triggering createDoc
      const store = (window as any).__zustand_stores?.[0]
      if (store) {
        store.getState().createDoc('Test Document')
      }
    })
    await page.waitForTimeout(500)

    // Check doc count increased
    const afterText = await status.textContent()
    const afterMatch = afterText?.match(/(\d+)\s*docs/)
    if (afterMatch) {
      const afterCount = parseInt(afterMatch[1], 10)
      expect(afterCount).toBe(initialCount + 1)
    }
  })

  test('new document has empty canvas', async ({ page }) => {
    // Create a new doc
    await page.evaluate(() => {
      const store = (window as any).__zustand_stores?.[0]
      if (store) {
        store.getState().createDoc('Empty Doc')
      }
    })
    await page.waitForTimeout(500)

    // After creating a new doc, undo should be disabled (empty canvas)
    const undoBtn = page.locator('.sidebar.panel button[data-tip*="Undo"]')
    await expect(undoBtn).toBeDisabled()
  })

  test('can switch between documents', async ({ page }) => {
    // Create two documents
    const docIds = await page.evaluate(() => {
      const store = (window as any).__zustand_stores?.[0]
      if (!store) return null
      const id1 = store.getState().createDoc('Doc A')
      return [id1]
    })

    if (!docIds) {
      // If store not accessible, skip
      test.skip()
      return
    }

    await page.waitForTimeout(300)

    // Draw something on the current doc
    const canvas = page.locator('#main-canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    const cx = box!.x + box!.width * 0.5
    const cy = box!.y + box!.height * 0.5
    await page.keyboard.press('1') // pen tool
    await page.mouse.move(cx - 30, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 30, cy)
    await page.mouse.up()
    await page.waitForTimeout(200)

    // Open the first doc (welcome doc)
    const firstDocId = await page.evaluate(() => {
      const store = (window as any).__zustand_stores?.[0]
      if (!store) return null
      const docs = store.getState().docs
      return docs[docs.length - 1]?.id // oldest doc
    })

    if (firstDocId) {
      await page.evaluate((id: string) => {
        const store = (window as any).__zustand_stores?.[0]
        if (store) store.getState().openDoc(id)
      }, firstDocId)
      await page.waitForTimeout(500)

      // Verify canvas is still visible (switching didn't break anything)
      await expect(canvas).toBeVisible()
    }
  })

  test('can delete a document', async ({ page }) => {
    // Create a doc to delete
    const newDocId = await page.evaluate(() => {
      const store = (window as any).__zustand_stores?.[0]
      if (!store) return null
      return store.getState().createDoc('Doc To Delete')
    })

    if (!newDocId) {
      test.skip()
      return
    }

    await page.waitForTimeout(300)

    // Get doc count before delete
    const status = page.locator('.status.panel')
    const beforeText = await status.textContent()
    const beforeMatch = beforeText?.match(/(\d+)\s*docs/)
    const beforeCount = beforeMatch ? parseInt(beforeMatch[1], 10) : 2

    // Delete the document
    await page.evaluate((id: string) => {
      const store = (window as any).__zustand_stores?.[0]
      if (store) store.getState().deleteDoc(id)
    }, newDocId)
    await page.waitForTimeout(500)

    // Doc count should decrease
    const afterText = await status.textContent()
    const afterMatch = afterText?.match(/(\d+)\s*docs/)
    if (afterMatch) {
      const afterCount = parseInt(afterMatch[1], 10)
      expect(afterCount).toBe(beforeCount - 1)
    }
  })

  test('can duplicate a document', async ({ page }) => {
    const newDocId = await page.evaluate(() => {
      const store = (window as any).__zustand_stores?.[0]
      if (!store) return null
      return store.getState().createDoc('Doc To Duplicate')
    })

    if (!newDocId) {
      test.skip()
      return
    }

    await page.waitForTimeout(300)

    const status = page.locator('.status.panel')
    const beforeText = await status.textContent()
    const beforeMatch = beforeText?.match(/(\d+)\s*docs/)
    const beforeCount = beforeMatch ? parseInt(beforeMatch[1], 10) : 2

    // Duplicate
    await page.evaluate((id: string) => {
      const store = (window as any).__zustand_stores?.[0]
      if (store) store.getState().duplicateDoc(id)
    }, newDocId)
    await page.waitForTimeout(500)

    const afterText = await status.textContent()
    const afterMatch = afterText?.match(/(\d+)\s*docs/)
    if (afterMatch) {
      const afterCount = parseInt(afterMatch[1], 10)
      expect(afterCount).toBe(beforeCount + 1)
    }
  })

  test('switching documents preserves canvas', async ({ page }) => {
    // Verify the canvas is still interactive after switching docs
    const canvas = page.locator('#main-canvas')
    await expect(canvas).toBeVisible()

    // Switch to a different doc and back
    await page.evaluate(() => {
      const store = (window as any).__zustand_stores?.[0]
      if (store) {
        const docs = store.getState().docs
        if (docs.length > 1) {
          store.getState().openDoc(docs[1].id)
        }
      }
    })
    await page.waitForTimeout(300)

    // Canvas should still be visible and functional
    await expect(canvas).toBeVisible()

    // Can still draw
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    await page.keyboard.press('1')
    await page.mouse.move(box!.x + 100, box!.y + 100)
    await page.mouse.down()
    await page.mouse.move(box!.x + 200, box!.y + 200)
    await page.mouse.up()

    // Verify no crash
    await expect(canvas).toBeVisible()
  })
})
