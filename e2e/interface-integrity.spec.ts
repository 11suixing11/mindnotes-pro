import type { Locator, Page } from '@playwright/test'
import { expect, insertFlowchart, openApp, test } from './helpers'

async function expectInsideViewport(page: Page, locator: Locator, margin = 8) {
  const box = await locator.boundingBox()
  const viewport = page.viewportSize()
  expect(box).not.toBeNull()
  expect(viewport).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(margin - 0.5)
  expect(box!.y).toBeGreaterThanOrEqual(margin - 0.5)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width - margin + 0.5)
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height - margin + 0.5)
}

test.describe('v5.3 界面完整性', () => {
  test('工作区提供 main landmark 和视觉隐藏的唯一一级标题', async ({ page }) => {
    await openApp(page)

    const main = page.getByRole('main', { name: 'MindNotes Pro 画板' })
    const heading = page.getByRole('heading', { level: 1, name: 'MindNotes Pro 画板' })
    await expect(main).toBeVisible()
    await expect(main).toHaveAttribute('aria-labelledby', 'workspace-title')
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(heading).toHaveClass(/sr-only/)

    const hiddenStyle = await heading.evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        position: style.position,
        width: style.width,
        height: style.height,
        overflow: style.overflow,
        clip: style.clip,
      }
    })
    expect(hiddenStyle).toMatchObject({
      position: 'absolute',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
    })
    expect(hiddenStyle.clip).not.toBe('auto')
  })

  test('顶栏原生文件和颜色输入不进入辅助技术树', async ({ page }) => {
    await openApp(page)

    const topbar = page.getByRole('toolbar', { name: '画布工具' })
    const nativeInputs = topbar.locator('input[type="file"], input[type="color"]')
    await expect(nativeInputs).toHaveCount(5)

    for (let index = 0; index < (await nativeInputs.count()); index += 1) {
      const input = nativeInputs.nth(index)
      await expect(input).toHaveAttribute('aria-hidden', 'true')
      await expect(input).toHaveAttribute('tabindex', '-1')
      await expect(input).toHaveCSS('opacity', '0')
      await expect(input).toHaveCSS('pointer-events', 'none')
    }

    const accessibilityTree = await topbar.ariaSnapshot()
    for (const hiddenName of [
      '选择颜色',
      '选择填充颜色',
      '选择图片文件',
      '选择背景颜色',
      '选择 JSON 文件',
    ]) {
      expect(accessibilityTree).not.toContain(hiddenName)
    }

    for (const visibleName of ['颜色', '插入图片', '画布更多', '文件']) {
      await expect(topbar.getByRole('button', { name: visibleName, exact: true })).toBeVisible()
    }
  })

  test('Toast 关闭按钮可由键盘触发', async ({ page }) => {
    await openApp(page)
    await insertFlowchart(page)

    const closeToast = page.getByRole('button', {
      name: '关闭通知：已插入并选中 流程图',
      exact: true,
    })
    await expect(closeToast).toBeVisible()
    await closeToast.focus()
    await expect(closeToast).toBeFocused()
    await closeToast.press('Enter')
    await expect(closeToast).toHaveCount(0)
  })

  test('深色右键菜单与子菜单使用主题颜色并保持在视口边界内', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 720 })
    await openApp(page)
    await insertFlowchart(page)
    await page.getByRole('button', { name: '关闭通知：已插入并选中 流程图', exact: true }).click()

    await page.getByRole('button', { name: '画布更多', exact: true }).click()
    const canvasMore = page.getByRole('menu', { name: '画布更多' })
    await canvasMore.getByRole('menuitemcheckbox', { name: '切换到深色模式' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.keyboard.press('Escape')
    await expect(canvasMore).toHaveCount(0)

    const viewport = page.viewportSize()!
    await page.locator('#main-canvas').evaluate(
      (canvas, point) => {
        canvas.dispatchEvent(
          new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            button: 2,
            clientX: point.x,
            clientY: point.y,
          })
        )
      },
      { x: viewport.width - 2, y: viewport.height - 2 }
    )

    const menu = page.getByRole('menu', { name: '画布上下文菜单' })
    await expect(menu).toBeVisible()
    await expectInsideViewport(page, menu)

    const themeColors = await menu.evaluate((element) => {
      const rootStyle = getComputedStyle(document.documentElement)
      const probe = document.createElement('div')
      probe.style.backgroundColor = rootStyle.getPropertyValue('--card-solid').trim()
      probe.style.color = rootStyle.getPropertyValue('--text').trim()
      probe.style.border = `1px solid ${rootStyle.getPropertyValue('--border').trim()}`
      document.body.appendChild(probe)
      const expectedStyle = getComputedStyle(probe)
      const actualStyle = getComputedStyle(element)
      const result = {
        actualBackground: actualStyle.backgroundColor,
        expectedBackground: expectedStyle.backgroundColor,
        actualColor: actualStyle.color,
        expectedColor: expectedStyle.color,
        actualBorder: actualStyle.borderTopColor,
        expectedBorder: expectedStyle.borderTopColor,
      }
      probe.remove()
      return result
    })
    expect(themeColors.actualBackground).toBe(themeColors.expectedBackground)
    expect(themeColors.actualColor).toBe(themeColors.expectedColor)
    expect(themeColors.actualBorder).toBe(themeColors.expectedBorder)

    await menu.getByRole('menuitem', { name: '对齐' }).click()
    const submenu = page.getByRole('menu', { name: '对齐选项' })
    await expect(submenu).toBeVisible()
    await expect(submenu).toHaveAttribute('data-placement', 'left')
    await expectInsideViewport(page, submenu)
  })
})
