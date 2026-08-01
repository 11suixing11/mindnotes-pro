import { downloadBuffer, expect, insertFlowchart, openApp, test, appStatus } from './helpers'

test.describe('模板与导入导出', () => {
  test('内置模板插入后仍是可编辑元素', async ({ page }) => {
    await openApp(page)
    await insertFlowchart(page)

    await page.keyboard.press('Delete')
    await expect(appStatus(page)).toContainText('0 个元素')
    await page.getByRole('button', { name: '撤销' }).click()
    await expect(appStatus(page)).toContainText('13 个元素')
  })

  test('插入模板后可以直接编辑其中的文本节点', async ({ page }) => {
    await openApp(page)
    await insertFlowchart(page)

    const canvas = page.locator('#main-canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    const zoomLabel = await page
      .getByRole('button', { name: /重置缩放，当前/ })
      .getAttribute('aria-label')
    const zoom = Number(zoomLabel?.match(/(\d+)%/)?.[1] ?? 100) / 100

    // The process text is a stable point in the built-in flowchart. Use the
    // current fitted zoom so the assertion remains valid across viewports.
    await page.mouse.dblclick(
      box!.x + box!.width / 2 + (280 - 322) * zoom,
      box!.y + box!.height / 2 + (163 - 251) * zoom
    )

    const editor = page.locator('textarea')
    await expect(editor).toHaveValue('处理')
    await editor.fill('已编辑节点')
    await editor.press('Enter')
    await expect(appStatus(page)).toContainText('13 个元素')

    await page.getByRole('button', { name: '导出' }).click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'JSON 备份' }).click()
    const backup = JSON.parse((await downloadBuffer(await downloadPromise)).toString('utf8'))
    expect(backup.document.elements).toEqual(
      expect.arrayContaining([expect.objectContaining({ content: '已编辑节点' })])
    )
  })

  test('JSON 导出遵循 v4 备份协议', async ({ page }) => {
    await openApp(page)
    await insertFlowchart(page)

    await page.getByRole('button', { name: '导出' }).click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'JSON 备份' }).click()
    const download = await downloadPromise
    const backup = JSON.parse((await downloadBuffer(download)).toString('utf8'))

    expect(download.suggestedFilename()).toMatch(/^未命名画布-.*\.json$/)
    expect(backup).toMatchObject({
      format: 'mindnotes-pro-backup',
      version: 4,
      document: { title: '未命名画布' },
    })
    expect(backup.document.elements).toHaveLength(13)
    expect(backup.document.layers.length).toBeGreaterThan(0)
  })

  test('PNG 按完整文档内容导出而不是截取当前视口', async ({ page }) => {
    await openApp(page)
    await insertFlowchart(page)

    await page.getByRole('button', { name: '导出' }).click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'PNG 图片' }).click()
    const png = await downloadBuffer(await downloadPromise)

    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    const width = png.readUInt32BE(16)
    const height = png.readUInt32BE(20)
    expect(width).toBeGreaterThan(100)
    expect(height).toBeGreaterThan(300)
    expect(width).toBeLessThan(800)
    expect(height).toBeLessThan(750)
  })

  test('JSON 导入会创建独立的可编辑文档', async ({ page }) => {
    await openApp(page)
    const backup = {
      format: 'mindnotes-pro-backup',
      version: 4,
      exportedAt: new Date(0).toISOString(),
      document: {
        title: '导入验收',
        elements: [
          {
            type: 'shape',
            id: 'imported-rectangle',
            layerId: 'layer-imported',
            kind: 'rectangle',
            x: 120,
            y: 100,
            w: 220,
            h: 120,
            color: '#0f766e',
            fillColor: '#ccfbf1',
            size: 3,
          },
        ],
        layers: [
          {
            id: 'layer-imported',
            name: '导入图层',
            visible: true,
            locked: false,
            order: 0,
            createdAt: 1,
            updatedAt: 1,
          },
        ],
        activeLayerId: 'layer-imported',
        bgColor: '#ffffff',
        backgroundStyle: 'plain',
      },
    }

    await page.getByLabel('选择 JSON 文件').setInputFiles({
      name: 'mindnotes-v4.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backup)),
    })

    await expect(appStatus(page)).toContainText('1 个元素')
    await expect(appStatus(page)).toContainText('2 个文档')
    await page.getByRole('button', { name: '打开文档面板' }).click()
    await expect(page.locator('.sb-doc-item[aria-current="page"]')).toContainText(
      '导入验收（导入）'
    )
  })
})
