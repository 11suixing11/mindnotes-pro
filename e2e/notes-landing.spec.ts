import { expect, test } from './helpers'

test('website presents floating annotations and explains beta availability', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /在屏幕上/ })).toBeVisible()
  await expect(page.getByRole('link', { name: '查看已发布版本' })).toHaveAttribute(
    'href',
    'https://github.com/11suixing11/mindnotes-pro/releases'
  )
  await expect(
    page.getByText('Windows 悬浮批注桌面版目前为测试版，安装包由维护者提供。')
  ).toBeVisible()
  await expect(page.getByText(/将原截图、可编辑笔迹和结论存入笔记库/)).toBeVisible()
  await page.getByRole('link', { name: '打开原有白板' }).click()
  await expect(page.getByRole('region', { name: '交互式绘图画布' })).toBeVisible()
})
