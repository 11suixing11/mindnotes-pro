import { expect, test as base, type Download, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

export const test = base.extend<{ diagnostics: void }>({
  diagnostics: [
    async ({ page }, use) => {
      const diagnostics: string[] = []
      page.on('pageerror', (error) => diagnostics.push(`pageerror: ${error.message}`))
      page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
          diagnostics.push(`console.${message.type()}: ${message.text()}`)
        }
      })

      await use()
      expect(diagnostics, 'the browser page should not emit errors or warnings').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

export function appStatus(page: Page) {
  return page.getByRole('status', { name: '应用状态' })
}

export async function openApp(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('application', { name: 'MindNotes Pro 白板' })).toBeVisible()
  await expect(page.locator('#main-canvas')).toBeVisible()
  await expect(appStatus(page)).toContainText('1 个文档')
}

export async function drawStroke(
  page: Page,
  options: { startX?: number; endX?: number; y?: number } = {}
) {
  const canvas = page.locator('#main-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()

  const startX = box!.x + (options.startX ?? box!.width * 0.38)
  const endX = box!.x + (options.endX ?? box!.width * 0.62)
  const y = box!.y + (options.y ?? box!.height * 0.52)

  await page.mouse.move(startX, y)
  await page.mouse.down()
  for (let step = 1; step <= 16; step += 1) {
    await page.mouse.move(startX + ((endX - startX) * step) / 16, y)
  }
  await page.mouse.up()

  return { startX, endX, y }
}

export async function insertFlowchart(page: Page) {
  await page.getByRole('button', { name: '模板库' }).click()
  await expect(page.getByRole('dialog', { name: '模板库' })).toBeVisible()
  await page.getByRole('button', { name: '插入 流程图 模板' }).click()
  await expect(page.getByRole('dialog', { name: '模板库' })).toBeHidden()
  await expect(appStatus(page)).toContainText('13 个元素')
}

export async function downloadBuffer(download: Download) {
  const path = await download.path()
  expect(path).toBeTruthy()
  return readFile(path!)
}
