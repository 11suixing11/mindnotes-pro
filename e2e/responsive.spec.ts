import type { Page } from '@playwright/test'
import { expect, insertFlowchart, openApp, test } from './helpers'

async function visibleCanvasContent(page: Page) {
  return page.locator('#main-canvas').evaluate((canvasElement) => {
    const canvas = canvasElement as HTMLCanvasElement
    const context = canvas.getContext('2d')
    if (!context) return 0
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
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
  const target = page.getByRole('button', { name: targetButtonName })

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

test('桌面内容缩到手机宽度后仍在视口内且品牌完整', async ({ page }) => {
  await openApp(page)
  await insertFlowchart(page)
  await page.setViewportSize({ width: 390, height: 844 })

  await expect(page.locator('#main-canvas')).toHaveCSS('width', '390px')
  await expect.poll(() => visibleCanvasContent(page)).toBeGreaterThan(250)
  await expect(page.locator('.sidebar')).toHaveCSS('transform', 'none')

  const brand = page.locator('.toolbar-brand')
  await expect(brand).toContainText('MindNotes Pro')
  const brandBox = await brand.boundingBox()
  expect(brandBox).not.toBeNull()
  expect(brandBox!.x).toBeGreaterThanOrEqual(0)
  expect(brandBox!.x + brandBox!.width).toBeLessThanOrEqual(390)

  const hasHorizontalPageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  )
  expect(hasHorizontalPageOverflow).toBe(false)
})

test('窄手机视口仍完整展示 MindNotes Pro 标识且不产生页面溢出', async ({ page }) => {
  await openApp(page)
  await page.setViewportSize({ width: 320, height: 568 })

  const brand = page.locator('.toolbar-brand')
  await expect(brand).toContainText('MindNotes Pro')
  const brandBox = await brand.boundingBox()
  expect(brandBox).not.toBeNull()
  expect(brandBox!.x).toBeGreaterThanOrEqual(0)
  expect(brandBox!.x + brandBox!.width).toBeLessThanOrEqual(320)

  await expect(page.locator('#main-canvas')).toHaveCSS('width', '320px')
  const hasHorizontalPageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  )
  expect(hasHorizontalPageOverflow).toBe(false)
})

test('窄屏工具带提供可操作的横向导航提示', async ({ page }) => {
  await openApp(page)
  await page.setViewportSize({ width: 390, height: 844 })

  await scrollToolbarUntilVisible({
    page,
    toolbarSelector: '.topbar',
    forwardButtonName: '向右查看更多画布工具',
    targetButtonName: '导出',
  })
  await expect(page.getByRole('button', { name: '导出' })).toBeInViewport()

  await scrollToolbarUntilVisible({
    page,
    toolbarSelector: '.sidebar',
    forwardButtonName: '向右查看更多绘图工具',
    targetButtonName: '清空画布',
  })
  await expect(page.getByRole('button', { name: '清空画布' })).toBeInViewport()

  await expect(page.getByRole('button', { name: '向左查看更多画布工具' })).toBeVisible()
  await expect(page.getByRole('button', { name: '向左查看更多绘图工具' })).toBeVisible()
})

test('平板宽度的顶栏仍提供横向导航提示', async ({ page }) => {
  await openApp(page)
  await page.setViewportSize({ width: 900, height: 700 })

  await scrollToolbarUntilVisible({
    page,
    toolbarSelector: '.topbar',
    forwardButtonName: '向右查看更多画布工具',
    targetButtonName: '导出',
  })
  await expect(page.getByRole('button', { name: '导出' })).toBeInViewport()
  await expect(page.getByRole('button', { name: '向左查看更多画布工具' })).toBeVisible()
  await expect(page.getByRole('button', { name: '向右查看更多绘图工具' })).toBeHidden()
})
