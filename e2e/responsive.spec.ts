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
