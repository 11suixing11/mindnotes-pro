import { test, expect } from '@playwright/test'

test.describe('Drawing on canvas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for app to load (the loading screen disappears)
    await page.waitForTimeout(1500)
  })

  test('canvas element is visible', async ({ page }) => {
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()
  })

  test('pen tool is selected by default', async ({ page }) => {
    const penBtn = page.locator('button[aria-label*="鐢荤瑪"]')
    await expect(penBtn).toHaveClass(/on/)
  })

  test('can draw a stroke on canvas', async ({ page }) => {
    const canvas = page.locator('canvas')
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

    // The store should now have at least one element
    const count = await page.evaluate(() => {
      // Access the Zustand store directly
      const store = (window as any).__zustand_stores?.[0]
      if (store) return store.getState().elements.length
      return -1
    })
    // If store not accessible via window, just verify undo button becomes enabled
    // (it's disabled when there's nothing to undo)
    const undoBtn = page.locator('button[aria-label="鎾ら攢"]')
    await expect(undoBtn).not.toBeDisabled()
  })

  test('can switch tools via toolbar buttons', async ({ page }) => {
    // Select rectangle tool
    const rectBtn = page.locator('button[aria-label*="鐭╁舰"]')
    await rectBtn.click()
    await expect(rectBtn).toHaveClass(/on/)

    // Pen should no longer be active
    const penBtn = page.locator('button[aria-label*="鐢荤瑪"]')
    await expect(penBtn).not.toHaveClass(/on/)
  })

  test('undo button is disabled initially', async ({ page }) => {
    const undoBtn = page.locator('button[aria-label="鎾ら攢"]')
    await expect(undoBtn).toBeDisabled()
  })

  test('can draw and undo', async ({ page }) => {
    const canvas = page.locator('canvas')
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
    const undoBtn = page.locator('button[aria-label="鎾ら攢"]')
    await expect(undoBtn).not.toBeDisabled()

    // Click undo
    await undoBtn.click()

    // Undo should be disabled again (nothing left to undo)
    await expect(undoBtn).toBeDisabled()
  })
})
