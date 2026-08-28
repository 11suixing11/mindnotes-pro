import type { Page } from '@playwright/test'
import { expect, insertFlowchart, openApp, test } from './helpers'

async function visibleCanvasContent(page: Page) {
  return page.locator('#main-canvas').evaluate((canvasElement) => {
    const canvas = canvasElement as HTMLCanvasElement
    // Probe a separate readback surface. The app's render context is created
    // for GPU drawing, so repeatedly calling getImageData on it would emit a
    // browser advisory and distort the diagnostics collected by the test.
    const probe = document.createElement('canvas')
    probe.width = canvas.width
    probe.height = canvas.height
    const context = probe.getContext('2d', { willReadFrequently: true })
    if (!context) return 0
    context.drawImage(canvas, 0, 0)
    const pixels = context.getImageData(0, 0, probe.width, probe.height).data
    let visible = 0
    for (let index = 0; index < pixels.length; index += 16) {
      const red = pixels[index]
      const green = pixels[index + 1]
      const blue = pixels[index + 2]
      const alpha = pixels[index + 3]
      const max = Math.max(red, green, blue)
      const min = Math.min(red, green, blue)
      if (alpha > 0 && (max - min > 18 || max < 190)) visible += 1
    }
    return visible
  })
}

async function scrollToolbarUntilVisible({
  page,
  toolbarSelector,
  forwardButtonName,
  targetButtonName,
}: {
  page: Page
  toolbarSelector: string
  forwardButtonName: string
  targetButtonName: string
}) {
  const toolbar = page.locator(toolbarSelector)
  const target = page.getByRole('button', { name: targetButtonName, exact: true })

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const isTargetVisible = await target.evaluate((element, selector) => {
      const toolbarElement = document.querySelector(selector)
      if (!toolbarElement) return false

      const targetRect = element.getBoundingClientRect()
      const toolbarRect = toolbarElement.getBoundingClientRect()
      return targetRect.left >= toolbarRect.left && targetRect.right <= toolbarRect.right
    }, toolbarSelector)
    if (isTargetVisible) return

    const previousScrollLeft = await toolbar.evaluate((element) => element.scrollLeft)
    const forward = page.getByRole('button', { name: forwardButtonName })
    await expect(forward).toBeVisible()
    await forward.click()
    await expect
      .poll(() => toolbar.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(previousScrollLeft)
  }

  throw new Error(`Could not reveal ${targetButtonName} after scrolling ${toolbarSelector}`)
}

test('手机和平板目标视口无页面溢出且画布内容保持可见', async ({ page }) => {
  await openApp(page)
  await insertFlowchart(page)

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
  ]) {
    await page.setViewportSize(viewport)
    await expect(page.locator('#main-canvas')).toHaveCSS('width', `${viewport.width}px`)
    await expect.poll(() => visibleCanvasContent(page)).toBeGreaterThan(250)
    await expect(page.locator('.mobile-toolbar')).toBeVisible()
    await expect(page.locator('.sidebar')).toBeHidden()
    await expect(page.locator('.topbar')).toBeHidden()
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
      .toBe(false)
  }
})

test('窄手机固定展示核心操作且触控目标不小于 44px', async ({ page }) => {
  await openApp(page)
  await page.setViewportSize({ width: 320, height: 568 })

  const toolbar = page.getByRole('navigation', { name: '移动绘图工具' })
  await expect(toolbar).toBeVisible()
  for (const label of ['选择', '画笔', '橡皮擦', '文字', '撤销', '重做', '文件', '更多工具']) {
    const button = toolbar.getByRole('button', { name: label, exact: true })
    await expect(button).toBeVisible()
    const box = await button.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  }

  await expect(page.locator('.toolbar-scroll-control:visible')).toHaveCount(0)
})

test('手机端次级工具和图层无需横向翻找', async ({ page }) => {
  await openApp(page)
  await page.setViewportSize({ width: 390, height: 844 })

  const toolbar = page.getByRole('navigation', { name: '移动绘图工具' })
  await toolbar.getByRole('button', { name: '更多工具' }).click()
  const more = page.getByRole('dialog', { name: '更多工具' })
  await expect(more).toBeVisible()
  await expect(more.getByRole('button', { name: '矩形' })).toBeVisible()
  await expect(more.getByRole('button', { name: '显示网格' })).toBeVisible()
  await expect(more.getByRole('button', { name: '图层' })).toBeVisible()

  await more.getByRole('button', { name: '图层' }).click()
  await expect(page.locator('.layers-panel-expanded')).toBeVisible()
  const layersBox = await page.locator('.layers-dock').boundingBox()
  expect(layersBox).not.toBeNull()
  expect(layersBox!.height).toBeLessThanOrEqual(844 * 0.45 + 1)

  await expect(page.locator('.toolbar-scroll-control:visible')).toHaveCount(0)
})

test('平板宽度的顶栏仍提供横向导航提示', async ({ page }) => {
  await openApp(page)
  await page.setViewportSize({ width: 900, height: 700 })

  await expect(page.getByRole('status', { name: '应用状态' })).toBeVisible()

  await scrollToolbarUntilVisible({
    page,
    toolbarSelector: '.topbar',
    forwardButtonName: '向右查看更多画布工具',
    targetButtonName: '文件',
  })
  await expect(page.getByRole('button', { name: '文件', exact: true })).toBeInViewport()
  await expect(page.getByRole('button', { name: '向左查看更多画布工具' })).toBeVisible()
  await expect(page.getByRole('button', { name: '向右查看更多绘图工具' })).toBeHidden()
})
