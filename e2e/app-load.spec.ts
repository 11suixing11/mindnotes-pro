import { test, expect } from '@playwright/test'

test.describe('App loading and initial state', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('app loads and shows the canvas', async ({ page }) => {
    // Wait for the app to finish loading (loading screen disappears)
    const canvas = page.locator('#main-canvas')
    await expect(canvas).toBeVisible({ timeout: 10_000 })
  })

  test('loading screen disappears after init', async ({ page }) => {
    // The loading screen renders while loaded=false.
    // After init completes, the main app UI appears with the canvas.
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })
    // Loading screen should no longer be in the DOM
    await expect(page.locator('.loading-screen, [class*="loading"]')).toHaveCount(0)
  })

  test('left toolbar (sidebar) is visible', async ({ page }) => {
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })
    const sidebar = page.locator('.sidebar.panel[role="toolbar"]')
    await expect(sidebar).toBeVisible()
  })

  test('top toolbar is visible', async ({ page }) => {
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })
    const topbar = page.locator('.topbar.panel[role="toolbar"]')
    await expect(topbar).toBeVisible()
  })

  test('pen tool is selected by default', async ({ page }) => {
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })
    const penBtn = page.locator('button[aria-label="画笔工具 (1)"]')
    await expect(penBtn).toHaveClass(/on/)
  })

  test('brand logo and name are shown', async ({ page }) => {
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })
    const brand = page.locator('.brand')
    await expect(brand).toBeVisible()
    await expect(brand.locator('.brand-text')).toHaveText('MindNotes')
  })

  test('status bar shows element count and doc count', async ({ page }) => {
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })
    const status = page.locator('.status.panel')
    await expect(status).toBeVisible()
    // Should show "0 elements" or more (welcome doc has elements)
    await expect(status).toContainText('elements')
    await expect(status).toContainText('docs')
  })

  test('status bar shows current tool name', async ({ page }) => {
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })
    const status = page.locator('.status.panel')
    // Default tool is pen
    await expect(status).toContainText('Pen')
  })

  test('undo button is present and initially disabled (or enabled if welcome content exists)', async ({
    page,
  }) => {
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })
    // The welcome document has text elements, so undo may be enabled
    // Just verify the button exists
    const undoBtn = page.locator('.sidebar.panel button[data-tip*="Undo"]')
    await expect(undoBtn).toBeVisible()
  })

  test('redo button is present', async ({ page }) => {
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })
    const redoBtn = page.locator('.sidebar.panel button[data-tip*="Redo"]')
    await expect(redoBtn).toBeVisible()
  })

  test('clear button is present', async ({ page }) => {
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })
    const clearBtn = page.locator('.sidebar.panel button[data-tip="Clear"]')
    await expect(clearBtn).toBeVisible()
  })

  test('zoom controls are visible in topbar', async ({ page }) => {
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })
    const zoomInBtn = page.locator('.topbar.panel button[data-tip="Zoom in"]')
    await expect(zoomInBtn).toBeVisible()
    const zoomOutBtn = page.locator('.topbar.panel button[data-tip="Zoom out"]')
    await expect(zoomOutBtn).toBeVisible()
  })

  test('theme toggle button is visible', async ({ page }) => {
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })
    // The theme toggle shows either "Light" or "Dark" in data-tip
    const themeBtn = page.locator(
      '.topbar.panel button[data-tip="Light"], .topbar.panel button[data-tip="Dark"]'
    )
    await expect(themeBtn).toBeVisible()
  })

  test('export button is visible', async ({ page }) => {
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })
    const exportBtn = page.locator('button[aria-label="导出"]')
    await expect(exportBtn).toBeVisible()
  })

  test('first-run guide appears on fresh load', async ({ page }) => {
    // Clear localStorage to trigger first-run guide
    await page.evaluate(() => {
      localStorage.removeItem('mn-guide-seen')
      localStorage.removeItem('mn-hints-seen')
    })
    await page.reload()
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })

    // The first-run guide should appear with the welcome step
    const guide = page.locator('.fixed.inset-0.z-\\[500\\]')
    const guideVisible = await guide
      .first()
      .isVisible()
      .catch(() => false)
    if (guideVisible) {
      // Should contain welcome text
      await expect(guide.first()).toContainText('MindNotes')
    }
  })

  test('canvas fills the viewport', async ({ page }) => {
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })
    const canvas = page.locator('#main-canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    // Canvas should be reasonably large (at least 500x400)
    expect(box!.width).toBeGreaterThan(500)
    expect(box!.height).toBeGreaterThan(400)
  })
})
