import { appStatus, drawStroke, expect, openApp, test } from './helpers'

test('文档重命名和画布内容在刷新后保留', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: '打开文档面板' }).click()
  await page.getByRole('button', { name: '新建文档' }).click()
  await expect(appStatus(page)).toContainText('2 个文档')

  const activeDocument = page.locator('.sb-doc-item[aria-current="page"]')
  await activeDocument.locator('.sb-doc-content').dblclick()
  const renameInput = page.getByRole('textbox', { name: '重命名 未命名画布' })
  await renameInput.fill('项目验收')
  await renameInput.press('Enter')
  await page.getByRole('button', { name: '确认' }).click()
  await expect(activeDocument).toContainText('项目验收')

  await page.getByRole('button', { name: '关闭文档面板' }).click()
  await drawStroke(page)
  await expect(appStatus(page)).toContainText('1 个元素')
  await expect(page.getByLabel('已保存')).toBeVisible({ timeout: 5_000 })

  await page.reload()
  await expect(page.getByRole('application', { name: 'MindNotes Pro 白板' })).toBeVisible()
  await expect(appStatus(page)).toContainText('1 个元素')
  await expect(appStatus(page)).toContainText('2 个文档')
  await page.getByRole('button', { name: '打开文档面板' }).click()
  await expect(page.locator('.sb-doc-item[aria-current="page"]')).toContainText('项目验收')
})
