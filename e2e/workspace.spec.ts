import { appStatus, drawStroke, expect, openApp, test } from './helpers'

test.describe('核心画布', () => {
  test('首次打开是可直接绘制的空白画布', async ({ page }) => {
    await openApp(page)

    await expect(appStatus(page)).toContainText('0 个元素')
    await expect(page.locator('.brand-text')).toHaveText('MindNotes Pro')
    await expect(page.getByRole('button', { name: '撤销' })).toBeDisabled()
    await expect(page.getByRole('button', { name: '重做' })).toBeDisabled()
  })

  test('绘制、撤销和重做保持同一条历史记录', async ({ page }) => {
    await openApp(page)

    await drawStroke(page)
    await expect(appStatus(page)).toContainText('1 个元素')

    await page.getByRole('button', { name: '撤销' }).click()
    await expect(appStatus(page)).toContainText('0 个元素')
    await expect(page.getByRole('button', { name: '重做' })).toBeEnabled()

    await page.getByRole('button', { name: '重做' }).click()
    await expect(appStatus(page)).toContainText('1 个元素')
  })

  test('橡皮擦可以完整清除一条笔迹并一次撤销', async ({ page }) => {
    await openApp(page)

    const stroke = await drawStroke(page)
    await expect(appStatus(page)).toContainText('1 个元素')
    await page.getByRole('button', { name: /^橡皮擦工具/ }).click()

    await page.mouse.move(stroke.startX - 20, stroke.y)
    await page.mouse.down()
    for (let step = 1; step <= 40; step += 1) {
      await page.mouse.move(
        stroke.startX - 20 + ((stroke.endX - stroke.startX + 40) * step) / 40,
        stroke.y
      )
    }
    await page.mouse.up()

    await expect(appStatus(page)).toContainText('0 个元素')
    await page.getByRole('button', { name: '撤销' }).click()
    await expect(appStatus(page)).toContainText('1 个元素')
  })
})
