import { appStatus, drawStroke, expect, openApp, test } from './helpers'

test('单画板内容在刷新后保留且不显示文档面板', async ({ page }) => {
  await openApp(page)
  await expect(page.getByRole('button', { name: '打开文档面板' })).toHaveCount(0)
  await drawStroke(page)
  await expect(appStatus(page)).toContainText('1 个元素')
  await expect(page.getByLabel('已保存')).toBeVisible({ timeout: 5_000 })

  await page.reload()
  await expect(page.getByRole('application', { name: 'MindNotes Pro 白板' })).toBeVisible()
  await expect(appStatus(page)).toContainText('1 个元素')
  await expect(appStatus(page)).toContainText('单画板')
  await expect(appStatus(page)).not.toContainText('个文档')
})
