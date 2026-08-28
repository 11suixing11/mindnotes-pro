import type { Page } from '@playwright/test'
import { appStatus, downloadBuffer, expect, focusCanvas, openApp, test } from './helpers'

async function exportBackup(page: Page) {
  await page.getByRole('button', { name: '文件', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'JSON 备份', exact: true }).click()
  return JSON.parse((await downloadBuffer(await downloadPromise)).toString('utf8'))
}

async function drawRectangle(
  page: Page,
  start: { x: number; y: number },
  end: { x: number; y: number }
) {
  await page.getByRole('button', { name: /^矩形工具/ }).click()
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps: 8 })
  await page.mouse.up()
}

test.describe('核心编辑交互回归', () => {
  test('选择、拖动、撤销、复制、缩放与旋转均修改真实文档', async ({ page }) => {
    await openApp(page)

    await drawRectangle(page, { x: 380, y: 220 }, { x: 580, y: 370 })
    await expect(appStatus(page)).toContainText('1 个元素')

    const initialBackup = await exportBackup(page)
    const initial = initialBackup.document.elements[0]
    expect(initial).toMatchObject({ type: 'shape', kind: 'rectangle' })

    await page.getByRole('button', { name: /^选择工具/ }).click()
    await page.mouse.move(480, 295)
    await page.mouse.down()
    await page.mouse.move(580, 345, { steps: 8 })
    await page.mouse.up()

    const movedBackup = await exportBackup(page)
    const moved = movedBackup.document.elements[0]
    expect(moved.x).toBeCloseTo(initial.x + 100, 0)
    expect(moved.y).toBeCloseTo(initial.y + 50, 0)

    await page.getByRole('button', { name: '撤销' }).click()
    const undoneBackup = await exportBackup(page)
    expect(undoneBackup.document.elements[0]).toMatchObject({ x: initial.x, y: initial.y })

    await focusCanvas(page)
    await page.keyboard.press('Control+d')
    await expect(appStatus(page)).toContainText('2 个元素')

    await page.keyboard.press('Delete')
    await expect(appStatus(page)).toContainText('1 个元素')

    await page.mouse.click(480, 295)
    await page.mouse.move(580, 370)
    await page.mouse.down()
    await page.mouse.move(640, 420, { steps: 8 })
    await page.mouse.up()

    const resizedBackup = await exportBackup(page)
    const resized = resizedBackup.document.elements[0]
    expect(resized.w).toBeGreaterThan(initial.w)
    expect(resized.h).toBeGreaterThan(initial.h)

    const rotateStart = {
      x: resized.x + resized.w / 2,
      y: resized.y - 20,
    }
    const rotateEnd = {
      x: resized.x + resized.w + 30,
      y: resized.y + resized.h / 2,
    }
    await page.mouse.move(rotateStart.x, rotateStart.y)
    await page.mouse.down()
    await page.mouse.move(rotateEnd.x, rotateEnd.y, { steps: 12 })
    await page.mouse.up()

    const rotatedBackup = await exportBackup(page)
    expect(Math.abs(rotatedBackup.document.elements[0].rotation ?? 0)).toBeGreaterThan(0.2)
  })

  test('框选、多选、分组、右键菜单和图层操作可用', async ({ page }) => {
    await openApp(page)
    await drawRectangle(page, { x: 300, y: 180 }, { x: 420, y: 260 })
    await drawRectangle(page, { x: 520, y: 320 }, { x: 650, y: 410 })

    await page.getByRole('button', { name: /^选择工具/ }).click()
    await page.mouse.move(240, 140)
    await page.mouse.down()
    await page.mouse.move(700, 460, { steps: 8 })
    await page.mouse.up()
    await expect(appStatus(page)).toContainText('2 个元素')

    await focusCanvas(page)
    await page.keyboard.press('Control+g')
    const grouped = await exportBackup(page)
    expect(grouped.document.elements.filter((element: any) => element.groupId)).toHaveLength(2)

    await page.mouse.click(360, 220, { button: 'right' })
    await expect(page.locator('.context-menu')).toBeVisible()
    await page.getByRole('menuitem', { name: '取消分组' }).click()
    await expect(appStatus(page)).toContainText('2 个元素')

    await page.getByRole('button', { name: '展开图层' }).click()
    await page.getByRole('button', { name: '新建图层' }).click()
    await expect(page.getByRole('group', { name: '图层 2' })).toBeVisible()
    await page.getByRole('button', { name: '锁定 图层 2' }).click()
    await expect(page.getByRole('button', { name: '解锁 图层 2' })).toBeVisible()
  })

  test('文字编辑、颜色、填充、背景与键盘工具切换可用', async ({ page }) => {
    await openApp(page)

    await page.keyboard.press('6')
    await page.mouse.click(420, 260)
    const editor = page.locator('textarea')
    await expect(editor).toBeVisible()
    await editor.fill('第一段文字')
    await editor.press('Control+Enter')
    await expect(appStatus(page)).toContainText('1 个元素')

    await page.getByRole('button', { name: '颜色' }).click()
    await page.getByRole('button', { name: '红色' }).click()
    await focusCanvas(page)
    await page.keyboard.press('4')
    await expect(page.getByRole('button', { name: '无填充' })).toBeVisible()
    await page.getByRole('button', { name: '无填充' }).click()
    await page.mouse.move(700, 260)
    await page.mouse.down()
    await page.mouse.move(820, 340, { steps: 6 })
    await page.mouse.up()

    await page.getByRole('button', { name: '背景设置' }).click()
    await page.getByRole('menuitemradio', { name: '点阵' }).click()
    await focusCanvas(page)
    await page.keyboard.press('0')
    await expect(page.getByRole('button', { name: /^选择工具/ })).toHaveClass(/on/)

    const backup = await exportBackup(page)
    expect(backup.document.elements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'text', content: '第一段文字' }),
        expect.objectContaining({
          type: 'shape',
          fillColor: expect.not.stringMatching(/^transparent$/),
        }),
      ])
    )
    expect(backup.document.backgroundStyle).toBe('dots')
  })

  test('平移、滚轮缩放、Space 临时平移和右键拖动画布可用', async ({ page }) => {
    await openApp(page)
    const zoomButton = page.getByRole('button', { name: /重置缩放/ })
    await expect(zoomButton).toHaveAttribute('aria-label', /100%/)

    await page.mouse.move(900, 450)
    await page.mouse.wheel(0, -300)
    await expect(zoomButton).toHaveAttribute('aria-label', /110%/)

    await page.getByRole('button', { name: /^平移工具/ }).click()
    await page.mouse.move(900, 450)
    await page.mouse.down()
    await page.mouse.move(980, 500, { steps: 5 })
    await page.mouse.up()
    await expect(zoomButton).toHaveAttribute('aria-label', /110%/)

    await focusCanvas(page)
    await page.keyboard.down('Space')
    await page.mouse.move(980, 500)
    await page.mouse.down()
    await page.mouse.move(1020, 530, { steps: 5 })
    await page.mouse.up()
    await page.keyboard.up('Space')
    await expect(page.getByRole('button', { name: /^平移工具/ })).toHaveClass(/on/)

    await page.mouse.move(700, 400)
    await page.mouse.down({ button: 'right' })
    await page.mouse.move(740, 430, { steps: 4 })
    await page.mouse.up({ button: 'right' })
    await expect(page.getByRole('menu')).toBeHidden()
  })

  test('切换工具会立即更新画布光标反馈', async ({ page }) => {
    await openApp(page)
    const canvas = page.locator('#main-canvas')
    await expect(canvas).toHaveCSS('cursor', 'crosshair')
    await page.getByRole('button', { name: /^选择工具/ }).click()
    await expect(canvas).toHaveCSS('cursor', 'default')
    await page.getByRole('button', { name: /^平移工具/ }).click()
    await expect(canvas).toHaveCSS('cursor', 'grab')
    await page.getByRole('button', { name: /^橡皮擦工具/ }).click()
    await expect(canvas).toHaveCSS('cursor', 'none')
  })

  test('画笔类型、线宽、颜色与橡皮擦撤销作用于真实元素', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: /画笔：/ }).click()
    await page.getByRole('menuitemradio', { name: '荧光笔' }).click()
    await page.getByRole('button', { name: '颜色' }).click()
    await page.getByRole('button', { name: '蓝色' }).click()
    await page.getByRole('button', { name: '粗 16像素' }).click()

    await page.mouse.move(360, 260)
    await page.mouse.down()
    await page.mouse.move(680, 260, { steps: 20 })
    await page.mouse.up()

    const drawn = await exportBackup(page)
    expect(drawn.document.elements[0]).toMatchObject({
      type: 'stroke',
      brush: 'highlighter',
      color: '#1971C2',
      size: 16,
    })

    await page.getByRole('button', { name: /^橡皮擦工具/ }).click()
    await page.mouse.move(330, 260)
    await page.mouse.down()
    await page.mouse.move(710, 260, { steps: 30 })
    await page.mouse.up()
    await expect(appStatus(page)).toContainText('0 个元素')

    await page.getByRole('button', { name: '撤销' }).click()
    await expect(appStatus(page)).toContainText('1 个元素')
  })

  test('图片选择导入与拖放导入都创建可编辑图片元素', async ({ page }) => {
    await openApp(page)
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8Dwn4GBgYGJAQoAHgQCAcT9W2kAAAAASUVORK5CYII=',
      'base64'
    )

    await page.getByLabel('选择图片文件').setInputFiles({
      name: 'fixture.png',
      mimeType: 'image/png',
      buffer: png,
    })
    await expect(appStatus(page)).toContainText('1 个元素')

    await page.evaluate(
      ({ base64 }) => {
        const binary = atob(base64)
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
        const file = new File([bytes], 'dropped.png', { type: 'image/png' })
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        const surface = document.querySelector('.canvas-surface')
        if (!surface) throw new Error('canvas surface missing')
        surface.dispatchEvent(
          new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            clientX: 760,
            clientY: 420,
            dataTransfer,
          })
        )
      },
      { base64: png.toString('base64') }
    )
    await expect(appStatus(page)).toContainText('2 个元素')

    const backup = await exportBackup(page)
    expect(
      backup.document.elements.filter((element: any) => element.type === 'image')
    ).toHaveLength(2)
  })

  test('双击文字和形状都能进入编辑并提交内容', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: /^文字工具/ }).click()
    await page.mouse.click(360, 220)
    await page.locator('textarea').fill('旧文字')
    await page.locator('textarea').press('Control+Enter')
    await drawRectangle(page, { x: 620, y: 220 }, { x: 780, y: 340 })

    await page.getByRole('button', { name: /^选择工具/ }).click()
    await page.mouse.dblclick(380, 235)
    await expect(page.locator('textarea')).toHaveValue('旧文字')
    await page.locator('textarea').fill('新文字')
    await page.locator('textarea').press('Control+Enter')

    await page.mouse.dblclick(700, 280)
    await expect(page.locator('textarea')).toBeVisible()
    await page.locator('textarea').fill('形状说明')
    await page.locator('textarea').press('Control+Enter')

    const backup = await exportBackup(page)
    expect(backup.document.elements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'text', content: '新文字' }),
        expect.objectContaining({ type: 'text', content: '形状说明' }),
      ])
    )
  })

  test('文字工具点击形状内部不会把形状误当成文字元素', async ({ page }) => {
    await openApp(page)
    await drawRectangle(page, { x: 360, y: 220 }, { x: 560, y: 340 })
    await page.getByRole('button', { name: /^文字工具/ }).click()
    await page.mouse.click(460, 280)
    await expect(page.locator('textarea')).toBeVisible()
    await expect(page.locator('textarea')).toHaveValue('')
    await page.locator('textarea').fill('形状上的文字')
    await page.locator('textarea').press('Control+Enter')
    await expect(appStatus(page)).toContainText('2 个元素')
  })

  test('单画板不会暴露文档搜索、复制或删除入口', async ({ page }) => {
    await openApp(page)
    await expect(page.getByRole('button', { name: '打开文档面板' })).toHaveCount(0)
    await expect(page.getByRole('searchbox', { name: '搜索文档' })).toHaveCount(0)
    await expect(page.getByText('新建文档')).toHaveCount(0)
    await expect(appStatus(page)).toContainText('单画板')
  })

  test('PNG、JPEG、PDF、SVG 与 JSON 均能实际下载', async ({ page }) => {
    await openApp(page)
    await drawRectangle(page, { x: 360, y: 220 }, { x: 580, y: 360 })

    for (const label of ['PNG 图片', 'JPEG 图片', 'PDF 文档', 'SVG 矢量图', 'JSON 备份']) {
      await page.getByRole('button', { name: '文件', exact: true }).click()
      const downloadPromise = page.waitForEvent('download')
      await page.getByRole('button', { name: label, exact: true }).click()
      const download = await downloadPromise
      const buffer = await downloadBuffer(download)
      expect(buffer.byteLength).toBeGreaterThan(20)
    }
  })
})
