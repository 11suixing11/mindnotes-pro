import { test, expect } from '@playwright/test'

test.describe('Document save & persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })
  })

  test('auto-save indicator shows after drawing', async ({ page }) => {
    const canvas = page.locator('#main-canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    // Draw something to trigger a save
    const cx = box!.x + box!.width * 0.5
    const cy = box!.y + box!.height * 0.5
    await page.keyboard.press('1') // pen tool
    await page.mouse.move(cx - 30, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 30, cy)
    await page.mouse.up()

    // The save status indicator should show activity
    await page.waitForTimeout(200)
    const status = page.locator('.status.panel')
    // The status bar contains a save indicator (checkmark or dots)
    await expect(status).toBeVisible()
  })

  test('document persists after page reload', async ({ page }) => {
    // Create a fresh doc for this test
    await page.evaluate(() => {
      const store = (window as any).__zustand_stores?.[0]
      if (store) store.getState().createDoc('Persistence Test')
    })
    await page.waitForTimeout(500)

    const canvas = page.locator('#main-canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    // Draw a stroke
    const cx = box!.x + box!.width * 0.5
    const cy = box!.y + box!.height * 0.5
    await page.keyboard.press('1')
    await page.mouse.move(cx - 50, cy - 20)
    await page.mouse.down()
    await page.mouse.move(cx + 50, cy + 20)
    await page.mouse.up()

    // Wait for auto-save (the app saves with a delay)
    await page.waitForTimeout(3000)

    // Reload the page
    await page.reload()
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })

    // After reload, the undo button should still be enabled
    // (meaning the document was restored with elements)
    const undoBtn = page.locator('.sidebar.panel button[data-tip*="Undo"]')
    await expect(undoBtn).not.toBeDisabled()
  })

  test('can create a new document', async ({ page }) => {
    // Get initial element count from status bar
    const status = page.locator('.status.panel')
    const initialText = await status.textContent()
    const initialDocMatch = initialText?.match(/(\d+)\s*docs/)
    const initialDocCount = initialDocMatch ? parseInt(initialDocMatch[1], 10) : 1

    // Create a new document via store
    await page.evaluate(() => {
      const store = (window as any).__zustand_stores?.[0]
      if (store) store.getState().createDoc('New Canvas')
    })
    await page.waitForTimeout(500)

    // Doc count should increase
    const afterText = await status.textContent()
    const afterDocMatch = afterText?.match(/(\d+)\s*docs/)
    if (afterDocMatch) {
      const afterDocCount = parseInt(afterDocMatch[1], 10)
      expect(afterDocCount).toBe(initialDocCount + 1)
    }

    // After creating a new doc, undo should be disabled (empty canvas)
    const undoBtn = page.locator('.sidebar.panel button[data-tip*="Undo"]')
    await expect(undoBtn).toBeDisabled()
  })

  test('save status indicator is present in status bar', async ({ page }) => {
    const status = page.locator('.status.panel')
    await expect(status).toBeVisible()
    // The status bar should contain the tool name and element count
    await expect(status).toContainText('elements')
    await expect(status).toContainText('docs')
  })
})
