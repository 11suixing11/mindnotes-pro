import { appStatus, expect, openApp, test } from './helpers'

test.describe('Space 键原生交互回归', () => {
  test('文字、图层和模板名称都能输入空格', async ({ page }) => {
    await openApp(page)

    await page.getByRole('button', { name: /^文字工具/ }).click()
    await page.mouse.click(420, 260)
    const editor = page.getByTestId('canvas-text-editor')
    await editor.pressSequentially('hello world 中文 输入')
    await expect(editor).toHaveValue('hello world 中文 输入')
    await editor.press('Control+Enter')
    await expect(appStatus(page)).toContainText('1 个元素')

    await page.getByRole('button', { name: '展开图层' }).click()
    await page.getByRole('button', { name: '重命名 图层 1' }).click()
    const layerName = page.getByRole('textbox', { name: '重命名 图层 1' })
    await layerName.fill('')
    await layerName.pressSequentially('Project Layer')
    await expect(layerName).toHaveValue('Project Layer')
    await layerName.press('Enter')
    await expect(page.getByRole('group', { name: 'Project Layer', exact: true })).toBeVisible()

    await page.getByRole('button', { name: '模板库' }).click()
    const templateName = page.getByRole('textbox', { name: '自定义模板名称' })
    await templateName.pressSequentially('Project Template')
    await expect(templateName).toHaveValue('Project Template')
  })

  test('Space 和 Enter 保留按钮的原生激活行为', async ({ page }) => {
    await openApp(page)

    const rectangle = page.getByRole('button', { name: /^矩形工具/ })
    await rectangle.focus()
    await page.keyboard.press('Space')
    await expect(rectangle).toHaveClass(/on/)

    const select = page.getByRole('button', { name: /^选择工具/ })
    await select.focus()
    await page.keyboard.press('Enter')
    await expect(select).toHaveClass(/on/)
  })
})
