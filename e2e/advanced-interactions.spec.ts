import type { Page } from '@playwright/test'
import { appStatus, downloadBuffer, expect, openApp, test } from './helpers'

async function exportBackup(page: Page) {
  await page.getByRole('button', { name: '导出', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'JSON 备份' }).click()
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

async function dispatchTouchEvent(
  page: Page,
  type: 'touchstart' | 'touchmove' | 'touchend',
  touches: Array<{ identifier: number; clientX: number; clientY: number }>,
  changedTouches = touches
) {
  await page.locator('#main-canvas').evaluate(
    (canvas, payload) => {
      const toTouch = (touch: { identifier: number; clientX: number; clientY: number }) => ({
        ...touch,
        target: canvas,
        pageX: touch.clientX,
        pageY: touch.clientY,
        screenX: touch.clientX,
        screenY: touch.clientY,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 0.5,
        touchType: 'direct',
      })
      const event = new Event(payload.type, { bubbles: true, cancelable: true })
      Object.defineProperties(event, {
        touches: { value: payload.touches.map(toTouch) },
        targetTouches: { value: payload.touches.map(toTouch) },
        changedTouches: { value: payload.changedTouches.map(toTouch) },
      })
      canvas.dispatchEvent(event)
    },
    { type, touches, changedTouches }
  )
}

test.describe('高级交互回归', () => {
  test('选择框手柄会显示对应的缩放光标', async ({ page }) => {
    await openApp(page)
    await drawRectangle(page, { x: 380, y: 220 }, { x: 580, y: 370 })

    await page.getByRole('button', { name: /^选择工具/ }).click()
    await page.mouse.click(480, 295)
    await page.mouse.move(580, 370)

    await expect(page.locator('#main-canvas')).toHaveCSS('cursor', 'nwse-resize')
  })

  test('文字编辑器在画布缩放时保持锚定并同步缩放', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: /^文字工具/ }).click()
    await page.mouse.click(420, 260)

    const editor = page.locator('textarea').first()
    await expect(editor).toBeVisible()
    const before = await editor.boundingBox()
    expect(before).not.toBeNull()

    await page.mouse.move(900, 450)
    await page.mouse.wheel(0, -300)
    await expect(page.getByRole('button', { name: /重置缩放/ })).toHaveAttribute(
      'aria-label',
      /110%/
    )

    const after = await editor.boundingBox()
    expect(after).not.toBeNull()
    expect(after!.y).not.toBeCloseTo(before!.y, 0)
    expect(after!.width).toBeGreaterThan(before!.width)
  })

  test('自定义快捷键会立即生效并在刷新后保留', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: '键盘快捷键' }).click()
    await page.getByText('自定义', { exact: true }).click()

    const penShortcut = page.getByRole('button', { name: '设置画笔工具快捷键' })
    await penShortcut.click()
    await penShortcut.press('p')
    await expect(page.getByText('画笔工具已设为 P。')).toBeVisible()
    await page.getByRole('button', { name: '关闭快捷键设置' }).click()

    await page.getByRole('button', { name: /^选择工具/ }).click()
    await page.keyboard.press('p')
    await expect(page.getByRole('button', { name: /^画笔工具/ })).toHaveClass(/on/)

    await page.reload()
    await expect(page.getByRole('application', { name: 'MindNotes Pro 白板' })).toBeVisible()
    await expect(page.getByRole('button', { name: '画笔工具（P）' })).toBeVisible()
  })

  test('图层可重命名、排序、隐藏、锁定、移动元素和删除', async ({ page }) => {
    await openApp(page)
    await drawRectangle(page, { x: 380, y: 220 }, { x: 580, y: 370 })
    await page.getByRole('button', { name: /^选择工具/ }).click()
    await page.mouse.click(480, 295)

    await page.getByRole('button', { name: '展开图层' }).click()
    await page.getByRole('button', { name: '新建图层' }).click()
    await page.getByRole('button', { name: '将所选元素移到 图层 2' }).click()

    let backup = await exportBackup(page)
    const layerTwo = backup.document.layers.find((layer: any) => layer.name === '图层 2')
    expect(backup.document.elements[0].layerId).toBe(layerTwo.id)

    await page.getByRole('button', { name: '重命名 图层 2' }).click()
    const rename = page.getByRole('textbox', { name: '重命名 图层 2' })
    await rename.fill('标注层')
    await rename.press('Enter')
    await expect(page.getByRole('group', { name: '标注层', exact: true })).toBeVisible()

    await page.getByRole('button', { name: '下移 标注层' }).click()
    backup = await exportBackup(page)
    expect(backup.document.layers.find((layer: any) => layer.name === '标注层').order).toBe(0)

    await page.getByRole('button', { name: '隐藏 标注层' }).click()
    await expect(page.getByRole('button', { name: '显示 标注层' })).toBeVisible()
    await page.getByRole('button', { name: '显示 标注层' }).click()
    await page.getByRole('button', { name: '锁定 标注层' }).click()
    await expect(page.getByRole('button', { name: '解锁 标注层' })).toBeVisible()
    await page.getByRole('button', { name: '解锁 标注层' }).click()

    // Re-select the rectangle after the layer controls cleared the selection.
    await page.mouse.click(480, 295)
    await page.getByRole('button', { name: '将所选元素移到 图层 1' }).click()
    backup = await exportBackup(page)
    const layerOne = backup.document.layers.find((layer: any) => layer.name === '图层 1')
    expect(backup.document.elements[0].layerId).toBe(layerOne.id)

    await page.getByRole('button', { name: '删除 标注层' }).click()
    await page.getByRole('button', { name: '确认' }).click()
    backup = await exportBackup(page)
    expect(backup.document.layers).toHaveLength(1)
  })

  test('系统文字和图片剪贴板内容都能粘贴到画布', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          readText: async () => '系统剪贴板文字',
          read: async () => [],
          write: async () => undefined,
        },
      })
    })
    await openApp(page)

    await page.keyboard.press('Control+Shift+v')
    await expect(appStatus(page)).toContainText('1 个元素')

    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8Dwn4GBgYGJAQoAHgQCAcT9W2kAAAAASUVORK5CYII='
    await page.evaluate((base64) => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          read: async () => [
            {
              types: ['image/png'],
              getType: async () => {
                const binary = atob(base64)
                const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
                return new Blob([bytes], { type: 'image/png' })
              },
            },
          ],
        },
      })
    }, pngBase64)

    await page.keyboard.press('Control+v')
    await expect(appStatus(page)).toContainText('2 个元素')
    const backup = await exportBackup(page)
    expect(backup.document.elements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'text', content: '系统剪贴板文字' }),
        expect.objectContaining({ type: 'image' }),
      ])
    )
  })

  test('单指可以绘制，双指缩放不会留下残缺笔迹', async ({ page }) => {
    await openApp(page)

    await dispatchTouchEvent(page, 'touchstart', [{ identifier: 1, clientX: 360, clientY: 260 }])
    await dispatchTouchEvent(page, 'touchmove', [{ identifier: 1, clientX: 520, clientY: 260 }])
    await dispatchTouchEvent(page, 'touchend', [], [{ identifier: 1, clientX: 520, clientY: 260 }])
    await expect(appStatus(page)).toContainText('1 个元素')

    await dispatchTouchEvent(page, 'touchstart', [
      { identifier: 2, clientX: 620, clientY: 320 },
      { identifier: 3, clientX: 720, clientY: 320 },
    ])
    await dispatchTouchEvent(page, 'touchmove', [
      { identifier: 2, clientX: 570, clientY: 320 },
      { identifier: 3, clientX: 770, clientY: 320 },
    ])
    await dispatchTouchEvent(
      page,
      'touchend',
      [],
      [
        { identifier: 2, clientX: 570, clientY: 320 },
        { identifier: 3, clientX: 770, clientY: 320 },
      ]
    )

    await expect(page.getByRole('button', { name: /重置缩放/ })).toHaveAttribute(
      'aria-label',
      /200%/
    )
    await expect(appStatus(page)).toContainText('1 个元素')
  })

  test('窗口失焦会撤销进行中的拖动并恢复临时平移工具', async ({ page }) => {
    await openApp(page)
    await drawRectangle(page, { x: 380, y: 220 }, { x: 580, y: 370 })
    await page.getByRole('button', { name: /^选择工具/ }).click()
    await page.mouse.click(480, 295)
    const initial = (await exportBackup(page)).document.elements[0]

    await page.mouse.move(480, 295)
    await page.mouse.down()
    await page.mouse.move(620, 420, { steps: 6 })
    await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    await page.mouse.up()

    const restored = (await exportBackup(page)).document.elements[0]
    expect(restored).toMatchObject({ x: initial.x, y: initial.y })

    await page.getByRole('button', { name: /^矩形工具/ }).click()
    await page.keyboard.down('Space')
    await expect(page.getByRole('button', { name: /^平移工具/ })).toHaveClass(/on/)
    await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    await expect(page.getByRole('button', { name: /^矩形工具/ })).toHaveClass(/on/)
    await page.keyboard.up('Space')
  })

  test('主题切换会实际刷新自定义背景上的画布纹理', async ({ page }) => {
    await openApp(page)
    await page.getByLabel('选择背景颜色').fill('#f0e0d0')
    await page.getByRole('button', { name: '背景设置' }).click()
    await page.getByRole('menuitemradio', { name: '点阵' }).click()
    await page.waitForTimeout(50)

    const before = await page
      .locator('#main-canvas')
      .evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL())
    await page.getByRole('button', { name: /切换到深色模式|切换到浅色模式/ }).click()
    await page.waitForTimeout(50)
    const after = await page
      .locator('#main-canvas')
      .evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL())

    expect(after).not.toBe(before)
  })

  test('多选右键菜单的对齐和分布子菜单可打开并执行', async ({ page }) => {
    await openApp(page)
    await drawRectangle(page, { x: 300, y: 180 }, { x: 400, y: 240 })
    await drawRectangle(page, { x: 500, y: 320 }, { x: 600, y: 380 })
    await drawRectangle(page, { x: 700, y: 430 }, { x: 800, y: 490 })
    await page.getByRole('button', { name: /^选择工具/ }).click()
    await page.keyboard.press('Control+a')
    await page.mouse.click(500, 280, { button: 'right' })
    await page.getByRole('button', { name: '对齐' }).click()
    await expect(page.locator('.context-menu-submenu')).toHaveCount(1)
    await page.getByRole('menuitem', { name: '左对齐' }).click()
    await expect(page.locator('.context-menu')).toBeHidden()

    await page.mouse.click(350, 350, { button: 'right' })
    await page.getByRole('button', { name: '分布' }).click()
    await expect(page.getByRole('menuitem', { name: '垂直分布' })).toBeVisible()
    await page.getByRole('menuitem', { name: '垂直分布' }).click()
    await expect(page.locator('.context-menu')).toBeHidden()

    const shapes = (await exportBackup(page)).document.elements
      .filter((element: any) => element.type === 'shape')
      .sort((a: any, b: any) => a.y - b.y)
    expect(new Set(shapes.map((shape: any) => shape.x)).size).toBe(1)
    expect(shapes[1].y - shapes[0].y).toBeCloseTo(shapes[2].y - shapes[1].y, 5)
  })
})
