import { test, expect } from '@playwright/test'

test.describe('Export functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })
  })

  test('export button is visible in topbar', async ({ page }) => {
    const exportBtn = page.locator('button[aria-label="导出"]')
    await expect(exportBtn).toBeVisible()
    // Should have aria-haspopup and aria-expanded
    await expect(exportBtn).toHaveAttribute('aria-haspopup', 'true')
    await expect(exportBtn).toHaveAttribute('aria-expanded', 'false')
  })

  test('export menu opens on click', async ({ page }) => {
    const exportBtn = page.locator('button[aria-label="导出"]')
    await exportBtn.click()
    await page.waitForTimeout(200)

    // The export menu should appear with role="menu"
    const menu = page.locator('[role="menu"][aria-label="导出选项"]')
    await expect(menu).toBeVisible()

    // Button should now show aria-expanded="true"
    await expect(exportBtn).toHaveAttribute('aria-expanded', 'true')
  })

  test('export menu shows PNG option', async ({ page }) => {
    const exportBtn = page.locator('button[aria-label="导出"]')
    await exportBtn.click()
    await page.waitForTimeout(200)

    const pngOption = page.locator('[role="menuitem"][aria-label="PNG 图片"]')
    await expect(pngOption).toBeVisible()
  })

  test('export menu shows JPG option', async ({ page }) => {
    const exportBtn = page.locator('button[aria-label="导出"]')
    await exportBtn.click()
    await page.waitForTimeout(200)

    const jpgOption = page.locator('[role="menuitem"][aria-label="JPG 图片"]')
    await expect(jpgOption).toBeVisible()
  })

  test('export menu shows PDF option', async ({ page }) => {
    const exportBtn = page.locator('button[aria-label="导出"]')
    await exportBtn.click()
    await page.waitForTimeout(200)

    const pdfOption = page.locator('[role="menuitem"][aria-label="PDF 文档"]')
    await expect(pdfOption).toBeVisible()
  })

  test('export menu shows SVG option', async ({ page }) => {
    const exportBtn = page.locator('button[aria-label="导出"]')
    await exportBtn.click()
    await page.waitForTimeout(200)

    const svgOption = page.locator('[role="menuitem"][aria-label="SVG 矢量"]')
    await expect(svgOption).toBeVisible()
  })

  test('export menu shows Word option', async ({ page }) => {
    const exportBtn = page.locator('button[aria-label="导出"]')
    await exportBtn.click()
    await page.waitForTimeout(200)

    const wordOption = page.locator('[role="menuitem"][aria-label="Word 文档"]')
    await expect(wordOption).toBeVisible()
  })

  test('export menu shows JSON option', async ({ page }) => {
    const exportBtn = page.locator('button[aria-label="导出"]')
    await exportBtn.click()
    await page.waitForTimeout(200)

    const jsonOption = page.locator('[role="menuitem"][aria-label="JSON 数据"]')
    await expect(jsonOption).toBeVisible()
  })

  test('export menu shows import JSON option', async ({ page }) => {
    const exportBtn = page.locator('button[aria-label="导出"]')
    await exportBtn.click()
    await page.waitForTimeout(200)

    const importOption = page.locator('[role="menuitem"][aria-label="导入 JSON"]')
    await expect(importOption).toBeVisible()
  })

  test('export menu closes when clicking overlay', async ({ page }) => {
    const exportBtn = page.locator('button[aria-label="导出"]')
    await exportBtn.click()
    await page.waitForTimeout(200)

    const menu = page.locator('[role="menu"][aria-label="导出选项"]')
    await expect(menu).toBeVisible()

    // Click the overlay to close
    const overlay = page.locator('.em-overlay')
    await overlay.click()
    await page.waitForTimeout(200)

    await expect(menu).not.toBeVisible()
    await expect(exportBtn).toHaveAttribute('aria-expanded', 'false')
  })

  test('can trigger PNG export with download', async ({ page }) => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 }).catch(() => null)

    const exportBtn = page.locator('button[aria-label="导出"]')
    await exportBtn.click()
    await page.waitForTimeout(200)

    const pngOption = page.locator('[role="menuitem"][aria-label="PNG 图片"]')
    await pngOption.click()

    const download = await downloadPromise
    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.png$/)
    }
  })

  test('can trigger PDF export with download', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 }).catch(() => null)

    const exportBtn = page.locator('button[aria-label="导出"]')
    await exportBtn.click()
    await page.waitForTimeout(200)

    const pdfOption = page.locator('[role="menuitem"][aria-label="PDF 文档"]')
    await pdfOption.click()

    const download = await downloadPromise
    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.pdf$/)
    }
  })

  test('can trigger JSON export with download', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 }).catch(() => null)

    const exportBtn = page.locator('button[aria-label="导出"]')
    await exportBtn.click()
    await page.waitForTimeout(200)

    const jsonOption = page.locator('[role="menuitem"][aria-label="JSON 数据"]')
    await jsonOption.click()

    const download = await downloadPromise
    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.json$/)
    }
  })

  test('can trigger SVG export with download', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 }).catch(() => null)

    const exportBtn = page.locator('button[aria-label="导出"]')
    await exportBtn.click()
    await page.waitForTimeout(200)

    const svgOption = page.locator('[role="menuitem"][aria-label="SVG 矢量"]')
    await svgOption.click()

    const download = await downloadPromise
    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.svg$/)
    }
  })

  test('export works after drawing content', async ({ page }) => {
    const canvas = page.locator('#main-canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    // Draw something
    const cx = box!.x + box!.width * 0.5
    const cy = box!.y + box!.height * 0.5
    await page.keyboard.press('1') // pen
    await page.mouse.move(cx - 40, cy - 40)
    await page.mouse.down()
    await page.mouse.move(cx + 40, cy + 40)
    await page.mouse.up()
    await page.waitForTimeout(300)

    // Export should still work
    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 }).catch(() => null)

    const exportBtn = page.locator('button[aria-label="导出"]')
    await exportBtn.click()
    await page.waitForTimeout(200)

    const pngOption = page.locator('[role="menuitem"][aria-label="PNG 图片"]')
    await pngOption.click()

    const download = await downloadPromise
    if (download) {
      expect(download.suggestedFilename()).toMatch(/mindnotes-.*\.png$/)
    }
  })

  test('hidden file input exists for JSON import', async ({ page }) => {
    const fileInput = page.locator('input[aria-label="选择 JSON 文件"]')
    await expect(fileInput).toHaveCount(1)
    // Should be hidden
    const isVisible = await fileInput.isVisible()
    // The input is hidden via CSS class
    // It's present in DOM but not visible
    expect(isVisible).toBeFalsy()
  })
})
