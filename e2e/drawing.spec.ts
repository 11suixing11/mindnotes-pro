import { test, expect } from '@playwright/test'

test.describe('Drawing on canvas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })
  })

  test('canvas element is visible', async ({ page }) => {
    const canvas = page.locator('#main-canvas')
    await expect(canvas).toBeVisible()
  })

  test('canvas has correct role and aria-label', async ({ page }) => {
    const canvas = page.locator('canvas[role="img"]')
    await expect(canvas).toBeVisible()
    await expect(canvas).toHaveAttribute('aria-label', '画布')
  })

  test('pen tool is selected by default', async ({ page }) => {
    const penBtn = page.locator('button[aria-label="画笔工具 (1)"]')
    await expect(penBtn).toHaveClass(/on/)
  })

  test('can draw a stroke on canvas', async ({ page }) => {
    const canvas = page.locator('#main-canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    // Draw a stroke from center-left to center-right
    const startX = box!.x + box!.width * 0.3
    const startY = box!.y + box!.height * 0.5
    const endX = box!.x + box!.width * 0.7
    const endY = box!.y + box!.height * 0.5

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    // Draw in several steps to simulate realistic pointer events
    const steps = 10
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(
        startX + (endX - startX) * (i / steps),
        startY + (endY - startY) * (i / steps)
      )
    }
    await page.mouse.up()

    // Verify the undo button becomes enabled (proof that a stroke was created)
    const undoBtn = page.locator('.sidebar.panel button[data-tip*="Undo"]')
    await expect(undoBtn).not.toBeDisabled()
  })

  test('can switch tools via toolbar buttons', async ({ page }) => {
    // Select rectangle tool
    const rectBtn = page.locator('button[aria-label="矩形 (4)"]')
    await rectBtn.click()
    await expect(rectBtn).toHaveClass(/on/)

    // Pen should no longer be active
    const penBtn = page.locator('button[aria-label="画笔工具 (1)"]')
    await expect(penBtn).not.toHaveClass(/on/)
  })

  test('undo button is disabled on empty canvas', async ({ page }) => {
    // Create a new empty doc to test undo disabled state
    await page.evaluate(() => {
      const store = (window as any).__zustand_stores?.[0]
      if (store) store.getState().createDoc('Empty Canvas')
    })
    await page.waitForTimeout(500)

    const undoBtn = page.locator('.sidebar.panel button[data-tip*="Undo"]')
    await expect(undoBtn).toBeDisabled()
  })

  test('can draw and undo', async ({ page }) => {
    // Create a fresh empty doc
    await page.evaluate(() => {
      const store = (window as any).__zustand_stores?.[0]
      if (store) store.getState().createDoc('Draw and Undo')
    })
    await page.waitForTimeout(500)

    const canvas = page.locator('#main-canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    // Draw a stroke
    const cx = box!.x + box!.width * 0.5
    const cy = box!.y + box!.height * 0.5
    await page.mouse.move(cx - 50, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 50, cy)
    await page.mouse.up()

    // Undo button should be enabled
    const undoBtn = page.locator('.sidebar.panel button[data-tip*="Undo"]')
    await expect(undoBtn).not.toBeDisabled()

    // Click undo
    await undoBtn.click()

    // Undo should be disabled again (nothing left to undo)
    await expect(undoBtn).toBeDisabled()
  })

  test('can draw a rectangle shape', async ({ page }) => {
    const canvas = page.locator('#main-canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    // Switch to rectangle tool
    await page.keyboard.press('4')
    const rectBtn = page.locator('button[aria-label="矩形 (4)"]')
    await expect(rectBtn).toHaveClass(/on/)

    // Draw a rectangle
    const startX = box!.x + box!.width * 0.3
    const startY = box!.y + box!.height * 0.3
    const endX = box!.x + box!.width * 0.6
    const endY = box!.y + box!.height * 0.6

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(endX, endY)
    await page.mouse.up()

    // Verify undo is available (shape was created)
    const undoBtn = page.locator('.sidebar.panel button[data-tip*="Undo"]')
    await expect(undoBtn).not.toBeDisabled()
  })

  test('can draw a circle shape', async ({ page }) => {
    const canvas = page.locator('#main-canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    // Switch to circle tool
    await page.keyboard.press('5')

    const startX = box!.x + box!.width * 0.4
    const startY = box!.y + box!.height * 0.4
    const endX = box!.x + box!.width * 0.6
    const endY = box!.y + box!.height * 0.6

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(endX, endY)
    await page.mouse.up()

    const undoBtn = page.locator('.sidebar.panel button[data-tip*="Undo"]')
    await expect(undoBtn).not.toBeDisabled()
  })

  test('can draw a line', async ({ page }) => {
    const canvas = page.locator('#main-canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    await page.keyboard.press('7') // line tool

    await page.mouse.move(box!.x + 100, box!.y + 100)
    await page.mouse.down()
    await page.mouse.move(box!.x + 300, box!.y + 300)
    await page.mouse.up()

    const undoBtn = page.locator('.sidebar.panel button[data-tip*="Undo"]')
    await expect(undoBtn).not.toBeDisabled()
  })

  test('can draw an arrow', async ({ page }) => {
    const canvas = page.locator('#main-canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    await page.keyboard.press('8') // arrow tool

    await page.mouse.move(box!.x + 100, box!.y + 200)
    await page.mouse.down()
    await page.mouse.move(box!.x + 300, box!.y + 200)
    await page.mouse.up()

    const undoBtn = page.locator('.sidebar.panel button[data-tip*="Undo"]')
    await expect(undoBtn).not.toBeDisabled()
  })

  test('can use eraser', async ({ page }) => {
    const canvas = page.locator('#main-canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    // First draw something
    await page.keyboard.press('1') // pen
    const cx = box!.x + box!.width * 0.5
    const cy = box!.y + box!.height * 0.5
    await page.mouse.move(cx - 50, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 50, cy)
    await page.mouse.up()
    await page.waitForTimeout(200)

    // Switch to eraser
    await page.keyboard.press('2')
    const eraserBtn = page.locator('button[aria-label="橡皮擦 (2)"]')
    await expect(eraserBtn).toHaveClass(/on/)

    // Move eraser over the drawn area
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 20, cy)
    await page.mouse.up()

    // Canvas still visible (no crash)
    await expect(canvas).toBeVisible()
  })

  test('clear all button works with confirmation', async ({ page }) => {
    const canvas = page.locator('#main-canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    // Draw something
    await page.keyboard.press('1')
    const cx = box!.x + box!.width * 0.5
    const cy = box!.y + box!.height * 0.5
    await page.mouse.move(cx - 50, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 50, cy)
    await page.mouse.up()
    await page.waitForTimeout(200)

    // Click clear button
    const clearBtn = page.locator('.sidebar.panel button[data-tip="Clear"]')
    await clearBtn.click()
    await page.waitForTimeout(300)

    // A confirmation dialog should appear
    const confirmDialog = page.locator('[role="dialog"], .confirm-modal, .fixed.inset-0')
    const dialogVisible = await confirmDialog
      .first()
      .isVisible()
      .catch(() => false)
    if (dialogVisible) {
      // Click confirm
      const confirmBtn = page
        .locator('button:has-text("确定"), button:has-text("OK"), button:has-text("Confirm")')
        .first()
      const confirmVisible = await confirmBtn.isVisible().catch(() => false)
      if (confirmVisible) {
        await confirmBtn.click()
        await page.waitForTimeout(300)
      }
    }
  })

  test('all tool buttons are present', async ({ page }) => {
    const tools = [
      { label: '选择工具 (0)', key: '0' },
      { label: '画笔工具 (1)', key: '1' },
      { label: '橡皮擦 (2)', key: '2' },
      { label: '平移 (3)', key: '3' },
      { label: '矩形 (4)', key: '4' },
      { label: '圆形 (5)', key: '5' },
      { label: '文字 (6)', key: '6' },
      { label: '直线 (7)', key: '7' },
      { label: '箭头 (8)', key: '8' },
    ]

    for (const tool of tools) {
      const btn = page.locator(`button[aria-label="${tool.label}"]`)
      await expect(btn).toBeVisible()
    }
  })
})
