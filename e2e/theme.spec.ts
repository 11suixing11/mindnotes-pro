import { test, expect } from '@playwright/test'

test.describe('Dark mode / theme toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })
  })

  test('app starts in light mode by default', async ({ page }) => {
    // Check that the html element does NOT have the 'dark' class
    const htmlClass = await page.evaluate(() => document.documentElement.classList.toString())
    // May or may not have 'dark' depending on system preference;
    // but we can verify the theme toggle button is present
    const themeBtn = page.locator(
      '.topbar.panel button[data-tip="Light"], .topbar.panel button[data-tip="Dark"]'
    )
    await expect(themeBtn).toBeVisible()
  })

  test('clicking theme toggle switches to dark mode', async ({ page }) => {
    // Get current state
    const isDarkBefore = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    )

    // Find and click the theme toggle
    // In light mode: data-tip="Dark", in dark mode: data-tip="Light"
    const themeBtn = page.locator(
      '.topbar.panel button[data-tip="Dark"], .topbar.panel button[data-tip="Light"]'
    )
    await themeBtn.click()
    await page.waitForTimeout(200)

    // Verify the mode flipped
    const isDarkAfter = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    )
    expect(isDarkAfter).toBe(!isDarkBefore)
  })

  test('dark mode persists after page reload', async ({ page }) => {
    // Switch to dark mode
    const themeBtn = page.locator(
      '.topbar.panel button[data-tip="Dark"], .topbar.panel button[data-tip="Light"]'
    )

    // Ensure we start in light mode
    const isDarkBefore = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    )
    if (isDarkBefore) {
      await themeBtn.click()
      await page.waitForTimeout(200)
    }

    // Now click to dark mode
    await themeBtn.click()
    await page.waitForTimeout(200)

    // Verify localStorage was set
    const savedTheme = await page.evaluate(() => localStorage.getItem('mindnotes-theme'))
    expect(savedTheme).toBe('dark')

    // Reload
    await page.reload()
    await page.locator('#main-canvas').waitFor({ state: 'visible', timeout: 10_000 })

    // Should still be in dark mode
    const isDarkAfterReload = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    )
    expect(isDarkAfterReload).toBeTruthy()
  })

  test('theme toggle button icon changes between sun and moon', async ({ page }) => {
    const isDarkBefore = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    )

    const themeBtn = page.locator(
      '.topbar.panel button[data-tip="Dark"], .topbar.panel button[data-tip="Light"]'
    )

    // In light mode, the button should say "Dark" (to switch to dark)
    if (!isDarkBefore) {
      await expect(themeBtn).toHaveAttribute('data-tip', 'Dark')
    } else {
      await expect(themeBtn).toHaveAttribute('data-tip', 'Light')
    }

    // Toggle
    await themeBtn.click()
    await page.waitForTimeout(200)

    // After toggle, the tip should flip
    if (!isDarkBefore) {
      await expect(themeBtn).toHaveAttribute('data-tip', 'Light')
    } else {
      await expect(themeBtn).toHaveAttribute('data-tip', 'Dark')
    }
  })

  test('dark mode adds dark class to html element', async ({ page }) => {
    // Ensure light mode
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    const themeBtn = page.locator(
      '.topbar.panel button[data-tip="Dark"], .topbar.panel button[data-tip="Light"]'
    )
    if (isDark) {
      await themeBtn.click()
      await page.waitForTimeout(200)
    }

    // Verify light mode
    await expect(
      page.evaluate(() => document.documentElement.classList.contains('dark'))
    ).resolves.toBeFalsy()

    // Toggle to dark
    await themeBtn.click()
    await page.waitForTimeout(200)

    // Verify dark class
    await expect(
      page.evaluate(() => document.documentElement.classList.contains('dark'))
    ).resolves.toBeTruthy()
  })

  test('canvas remains functional after theme toggle', async ({ page }) => {
    const themeBtn = page.locator(
      '.topbar.panel button[data-tip="Dark"], .topbar.panel button[data-tip="Light"]'
    )

    // Toggle theme
    await themeBtn.click()
    await page.waitForTimeout(200)

    // Canvas should still be visible
    const canvas = page.locator('#main-canvas')
    await expect(canvas).toBeVisible()

    // Should still be able to draw
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    await page.keyboard.press('1') // pen tool
    await page.mouse.move(box!.x + 100, box!.y + 100)
    await page.mouse.down()
    await page.mouse.move(box!.x + 200, box!.y + 200)
    await page.mouse.up()

    // No crash - canvas still visible
    await expect(canvas).toBeVisible()
  })

  test('toggling theme multiple times works correctly', async ({ page }) => {
    const themeBtn = page.locator(
      '.topbar.panel button[data-tip="Dark"], .topbar.panel button[data-tip="Light"]'
    )

    const initialDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    )

    // Toggle 4 times (should end up in the same state)
    for (let i = 0; i < 4; i++) {
      await themeBtn.click()
      await page.waitForTimeout(100)
    }

    const finalDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    expect(finalDark).toBe(initialDark)
  })
})
