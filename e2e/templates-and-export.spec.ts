import {
  appStatus,
  downloadBuffer,
  drawStroke,
  expect,
  focusCanvas,
  getFittedZoom,
  insertFlowchart,
  openApp,
  test,
} from './helpers'

interface BackupElement {
  type: string
  x?: number
  y?: number
  w?: number
  h?: number
  width?: number
  height?: number
  points?: number[][]
}

// 镜像 src/core/geometry.ts elementBounds 的外扩语义（各类型 ±5）。
function elementWorldBounds(element: BackupElement) {
  if (element.type === 'stroke' && element.points) {
    const xs = element.points.map(([x]) => x)
    const ys = element.points.map(([, y]) => y)
    return {
      left: Math.min(...xs) - 5,
      right: Math.max(...xs) + 5,
      top: Math.min(...ys) - 5,
      bottom: Math.max(...ys) + 5,
    }
  }
  return {
    left: (element.x ?? 0) - 5,
    right: (element.x ?? 0) + (element.w ?? element.width ?? 0) + 5,
    top: (element.y ?? 0) - 5,
    bottom: (element.y ?? 0) + (element.h ?? element.height ?? 0) + 5,
  }
}

function boundsIntersect(
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number }
) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

test.describe('模板与导入导出', () => {
  test('内置模板插入后仍是可编辑元素', async ({ page }) => {
    await openApp(page)
    await insertFlowchart(page)

    await focusCanvas(page)
    await page.keyboard.press('Delete')
    const confirmDialog = page.getByRole('dialog', { name: '确认操作' })
    await expect(confirmDialog).toBeVisible()
    await confirmDialog.getByRole('button', { name: '确定' }).click()
    await expect(appStatus(page)).toContainText('0 个元素')
    await page.getByRole('button', { name: '撤销' }).click()
    await expect(appStatus(page)).toContainText('13 个元素')
  })

  test('插入模板后不点击画布也能直接撤销', async ({ page }) => {
    await openApp(page)
    await insertFlowchart(page)

    // 模板库关闭后浏览器焦点曾停留在"模板"按钮上，画布快捷键会被
    // 交互目标守卫拦下；关闭后焦点必须已交还画布，Ctrl+Z 才能生效。
    await page.keyboard.press('Control+z')
    await expect(appStatus(page)).toContainText('0 个元素')
  })

  test('插入模板后可以直接编辑其中的文本节点', async ({ page }) => {
    await openApp(page)
    await insertFlowchart(page)

    const canvas = page.locator('#main-canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    const zoom = await getFittedZoom(page)

    // The process text is a stable point in the built-in flowchart. Use the
    // current fitted zoom so the assertion remains valid across viewports.
    await page.mouse.dblclick(
      box!.x + box!.width / 2 + (280 - 322) * zoom,
      box!.y + box!.height / 2 + (163 - 251) * zoom
    )

    const editor = page.locator('textarea')
    await expect(editor).toHaveValue('处理')
    await editor.fill('已编辑节点')
    await editor.press('Control+Enter')
    await expect(appStatus(page)).toContainText('13 个元素')

    await page.getByRole('button', { name: '文件', exact: true }).click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'JSON 备份', exact: true }).click()
    const backup = JSON.parse((await downloadBuffer(await downloadPromise)).toString('utf8'))
    expect(backup.document.elements).toEqual(
      expect.arrayContaining([expect.objectContaining({ content: '已编辑节点' })])
    )
  })

  test('双击节点框体直接编辑节点文字而不是新建文本', async ({ page }) => {
    await openApp(page)
    await insertFlowchart(page)

    const canvas = page.locator('#main-canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    const zoom = await getFittedZoom(page)

    // 先双击"开始"文字本身（命中区宽松），借原位编辑器的 textarea 左上角
    // 量出该文本锚点的精确客户端坐标，避免手算视口适配的取整/居中误差。
    await page.mouse.dblclick(
      box!.x + box!.width / 2 + (280 - 322) * zoom,
      box!.y + box!.height / 2 + (39 - 251) * zoom
    )
    const probe = page.locator('textarea')
    await expect(probe).toHaveValue('开始')
    const anchor = await probe.boundingBox()
    expect(anchor).not.toBeNull()
    await probe.press('Control+Enter')

    // 模板把节点框体和文字存成两个元素。"开始"框体的命中区（padded AABB
    // 205,5,150,68）远大于文字命中区（230,25,100,28 再外扩 12/zoom）。
    // 取框体内、文字命中区之外的一点，确保双击命中的是 shape 本身，
    // 走"框体转所属标签"的原位编辑路径而不是新建错位文本。
    const labelAnchor = { x: 230, y: 25 }
    const shapeOnlyPoint = { x: 210.6, y: 39 }
    await page.mouse.dblclick(
      anchor!.x + (shapeOnlyPoint.x - labelAnchor.x) * zoom,
      anchor!.y + (shapeOnlyPoint.y - labelAnchor.y) * zoom
    )

    const nodeEditor = page.locator('textarea')
    await expect(nodeEditor).toHaveValue('开始')
    await expect(appStatus(page)).toContainText('13 个元素')

    await nodeEditor.fill('起点')
    await nodeEditor.press('Control+Enter')
    await expect(appStatus(page)).toContainText('13 个元素')

    await page.getByRole('button', { name: '文件', exact: true }).click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'JSON 备份', exact: true }).click()
    const backup = JSON.parse((await downloadBuffer(await downloadPromise)).toString('utf8'))
    expect(backup.document.elements).toEqual(
      expect.arrayContaining([expect.objectContaining({ content: '起点' })])
    )
  })

  test('插入模板时避让画布上已有内容', async ({ page }) => {
    await openApp(page)
    await drawStroke(page)
    await expect(appStatus(page)).toContainText('1 个元素')

    await page.getByRole('button', { name: '模板库' }).click()
    await expect(page.getByRole('dialog', { name: '模板库' })).toBeVisible()
    await page.getByRole('button', { name: '插入 流程图 模板' }).click()
    await expect(page.getByRole('dialog', { name: '模板库' })).toBeHidden()
    await expect(appStatus(page)).toContainText('14 个元素')

    // 用 JSON 备份读回世界坐标：模板 13 个元素的包围盒必须与先画的
    // 笔画包围盒不相交，否则用户分不清模板自带线条和自己画的内容。
    await page.getByRole('button', { name: '文件', exact: true }).click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'JSON 备份', exact: true }).click()
    const backup = JSON.parse((await downloadBuffer(await downloadPromise)).toString('utf8'))
    const elements = backup.document.elements as BackupElement[]
    const strokes = elements.filter((element) => element.type === 'stroke')
    const templateElements = elements.filter((element) => element.type !== 'stroke')
    expect(strokes).toHaveLength(1)
    expect(templateElements).toHaveLength(13)

    const strokeBounds = elementWorldBounds(strokes[0])
    const templateBounds = templateElements
      .map(elementWorldBounds)
      .reduce((acc, bounds) => ({
        left: Math.min(acc.left, bounds.left),
        right: Math.max(acc.right, bounds.right),
        top: Math.min(acc.top, bounds.top),
        bottom: Math.max(acc.bottom, bounds.bottom),
      }))
    expect(boundsIntersect(strokeBounds, templateBounds)).toBe(false)
  })

  test('JSON 导出遵循 v5 备份协议', async ({ page }) => {
    await openApp(page)
    await insertFlowchart(page)

    await page.getByRole('button', { name: '文件', exact: true }).click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'JSON 备份', exact: true }).click()
    const download = await downloadPromise
    const backup = JSON.parse((await downloadBuffer(download)).toString('utf8'))

    expect(download.suggestedFilename()).toMatch(/^未命名画布-.*\.json$/)
    expect(backup).toMatchObject({
      format: 'mindnotes-pro-backup',
      version: 5,
      document: { title: '未命名画布' },
    })
    expect(backup.document.elements).toHaveLength(13)
    expect(backup.document.layers.length).toBeGreaterThan(0)
  })

  test('PNG 按完整文档内容导出而不是截取当前视口', async ({ page }) => {
    await openApp(page)
    await insertFlowchart(page)

    await page.getByRole('button', { name: '文件', exact: true }).click()
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

  test('JSON 导入会替换当前唯一画板', async ({ page }) => {
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

    // Import is a destructive replacement and must be explicitly confirmed.
    const confirmDialog = page.getByRole('dialog', { name: '确认操作' })
    await expect(confirmDialog).toBeVisible()
    await expect(confirmDialog).toContainText('将替换当前画板')
    await confirmDialog.getByLabel('替换并导入').click()

    await expect(appStatus(page)).toContainText('1 个元素')
    await expect(appStatus(page)).toContainText('单画板')
    await expect(appStatus(page)).not.toContainText('个文档')
    await expect(page.getByText('已导入并替换当前画板')).toBeVisible()
  })

  test('模板元素可以独立选择和删除', async ({ page }) => {
    await openApp(page)
    await insertFlowchart(page)

    const canvas = page.locator('#main-canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    const zoom = await getFittedZoom(page)

    // Clear the insertion selection before targeting a single template node.
    await page.mouse.click(box!.x + 120, box!.y + 120)
    await page.mouse.click(
      box!.x + box!.width / 2 + (280 - 322) * zoom,
      box!.y + box!.height / 2 + (163 - 251) * zoom
    )
    await expect(page.getByRole('region', { name: '图层' })).toContainText('已选 1 个元素')

    await focusCanvas(page)
    await page.keyboard.press('Delete')
    await expect(appStatus(page)).toContainText('12 个元素')
  })
})
