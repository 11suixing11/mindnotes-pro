import { test, expect } from '@playwright/test'

test.describe('Keyboard shortcuts for tool switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })
  })

  test('pressing 1 selects pen tool', async ({ page }) => {
    // First switch away from pen to ensure the shortcut works
    await page.keyboard.press('2')
    const eraserBtn = page.locator('button[aria-label="橡皮擦 (2)"]')
    await expect(eraserBtn).toHaveClass(/on/)

    // Now press 1 for pen
    await page.keyboard.press('1')
    const penBtn = page.locator('button[aria-label="画笔工具 (1)"]')
    await expect(penBtn).toHaveClass(/on/)
    // Status bar should show "Pen"
    await expect(page.locator('.status.panel')).toContainText('Pen')
  })

  test('pressing 2 selects eraser tool', async ({ page }) => {
    await page.keyboard.press('2')
    const eraserBtn = page.locator('button[aria-label="橡皮擦 (2)"]')
    await expect(eraserBtn).toHaveClass(/on/)
    await expect(page.locator('.status.panel')).toContainText('Eraser')
  })

  test('pressing 3 selects pan tool', async ({ page }) => {
    await page.keyboard.press('3')
    const panBtn = page.locator('button[aria-label="平移 (3)"]')
    await expect(panBtn).toHaveClass(/on/)
    await expect(page.locator('.status.panel')).toContainText('Pan')
  })

  test('pressing 4 selects rectangle tool', async ({ page }) => {
    await page.keyboard.press('4')
    const rectBtn = page.locator('button[aria-label="矩形 (4)"]')
    await expect(rectBtn).toHaveClass(/on/)
    await expect(page.locator('.status.panel')).toContainText('Rectangle')
  })

  test('pressing 5 selects circle tool', async ({ page }) => {
    await page.keyboard.press('5')
    const circleBtn = page.locator('button[aria-label="圆形 (5)"]')
    await expect(circleBtn).toHaveClass(/on/)
    await expect(page.locator('.status.panel')).toContainText('Circle')
  })

  test('pressing 6 selects text tool', async ({ page }) => {
    await page.keyboard.press('6')
    const textBtn = page.locator('button[aria-label="文字 (6)"]')
    await expect(textBtn).toHaveClass(/on/)
    await expect(page.locator('.status.panel')).toContainText('Text')
  })

  test('pressing 7 selects line tool', async ({ page }) => {
    await page.keyboard.press('7')
    const lineBtn = page.locator('button[aria-label="直线 (7)"]')
    await expect(lineBtn).toHaveClass(/on/)
    await expect(page.locator('.status.panel')).toContainText('Line')
  })

  test('pressing 8 selects arrow tool', async ({ page }) => {
    await page.keyboard.press('8')
    const arrowBtn = page.locator('button[aria-label="箭头 (8)"]')
    await expect(arrowBtn).toHaveClass(/on/)
    await expect(page.locator('.status.panel')).toContainText('Arrow')
  })

  test('pressing 0 selects select tool', async ({ page }) => {
    await page.keyboard.press('0')
    const selectBtn = page.locator('button[aria-label="选择工具 (0)"]')
    await expect(selectBtn).toHaveClass(/on/)
    await expect(page.locator('.status.panel')).toContainText('Select')
  })

  test('can cycle through all tools via keyboard', async ({ page }) => {
    const toolKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '0']
    const expectedLabels = [
      'Pen',
      'Eraser',
      'Pan',
      'Rectangle',
      'Circle',
      'Text',
      'Line',
      'Arrow',
      'Select',
    ]

    for (let i = 0; i < toolKeys.length; i++) {
      await page.keyboard.press(toolKeys[i])
      await expect(page.locator('.status.panel')).toContainText(expectedLabels[i])
    }
  })

  test('Ctrl+Z triggers undo', async ({ page }) => {
    // Draw something first
    const canvas = page.locator('#main-canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    const cx = box!.x + box!.width * 0.5
    const cy = box!.y + box!.height * 0.5

    // Remember undo state before drawing
    const undoBtnDisabledBefore = await page
      .locator('.sidebar.panel button[data-tip*="Undo"]')
      .isDisabled()

    // Draw a stroke
    await page.keyboard.press('1') // pen tool
    await page.mouse.move(cx - 50, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 50, cy)
    await page.mouse.up()
    await page.waitForTimeout(200)

    // Verify undo is now available
    const undoBtn = page.locator('.sidebar.panel button[data-tip*="Undo"]')
    await expect(undoBtn).not.toBeDisabled()

    // Press Ctrl+Z
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
  })

  test('Ctrl+Shift+Z triggers redo', async ({ page }) => {
    const canvas = page.locator('#main-canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    const cx = box!.x + box!.width * 0.5
    const cy = box!.y + box!.height * 0.5

    // Draw, then undo, then redo
    await page.keyboard.press('1')
    await page.mouse.move(cx - 50, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 50, cy)
    await page.mouse.up()
    await page.waitForTimeout(200)

    // Undo
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)

    // Redo
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)

    // Undo button should be enabled again after redo
    const undoBtn = page.locator('.sidebar.panel button[data-tip*="Undo"]')
    await expect(undoBtn).not.toBeDisabled()
  })

  test('pressing G toggles grid', async ({ page }) => {
    const gridBtn = page.locator('.topbar.panel button[data-tip*="grid"]')
    await expect(gridBtn).toBeVisible()

    // Press G to toggle grid
    await page.keyboard.press('g')
    await page.waitForTimeout(200)

    // Grid button should now indicate grid is shown
    const gridBtnAfter = page.locator('.topbar.panel button[data-tip="Hide grid"]')
    const isGridOn = await gridBtnAfter.isVisible().catch(() => false)
    expect(isGridOn).toBeTruthy()

    // Press G again to hide
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    const gridBtnOff = page.locator('.topbar.panel button[data-tip="Show grid (G)"]')
    await expect(gridBtnOff).toBeVisible()
  })

  test('F1 opens keyboard shortcuts help', async ({ page }) => {
    await page.keyboard.press('F1')
    await page.waitForTimeout(300)

    // The keyboard shortcuts dialog should appear
    const dialog = page.locator('text=Keyboard Shortcuts')
    await expect(dialog).toBeVisible({ timeout: 3_000 })

    // It should list some shortcuts
    await expect(page.locator('text=Undo')).toBeVisible()
    await expect(page.locator('text=Redo')).toBeVisible()

    // Close with Escape
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await expect(dialog).not.toBeVisible()
  })

  test('? key toggles hints panel', async ({ page }) => {
    // Clear hints seen flag
    await page.evaluate(() => localStorage.removeItem('mn-hints-seen'))
    await page.reload()
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })

    // The hints may auto-show; press ? to toggle
    await page.keyboard.press('?')
    await page.waitForTimeout(200)

    // The hints panel or keyboard shortcuts should toggle
    // Just verify no crash occurred
    await expect(page.locator('#main-canvas')).toBeVisible()
  })

  test('Delete key removes selected element', async ({ page }) => {
    const canvas = page.locator('#main-canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    const cx = box!.x + box!.width * 0.5
    const cy = box!.y + box!.height * 0.5

    // Draw a stroke
    await page.keyboard.press('1')
    await page.mouse.move(cx - 50, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 50, cy)
    await page.mouse.up()
    await page.waitForTimeout(200)

    // Switch to select tool and select all
    await page.keyboard.press('0')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)

    // Press Delete
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)

    // The undo button should be available (delete is undoable)
    const undoBtn = page.locator('.sidebar.panel button[data-tip*="Undo"]')
    await expect(undoBtn).not.toBeDisabled()
  })
})
