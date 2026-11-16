import { _electron as electron, expect, test } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { createServer } from 'node:http'
import type { Server } from 'node:http'
import { mkdtemp, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

let server: Server
let origin: string
let dataDirectory: string

test.beforeAll(async () => {
  dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-page-notes-'))
  server = createServer((request, response) => {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; style-src 'unsafe-inline'; script-src 'self'"
    )
    if (request.url?.startsWith('/compat')) {
      response.end(
        `<!doctype html><html lang="zh-CN"><head><title>动态阅读兼容样本</title><style>body{margin:0;font:17px system-ui}main{margin:36px}#reader{height:420px;overflow:auto;line-height:2;border:1px solid #ddd;padding:24px}p{margin:20px 0}.space{height:1100px}</style></head><body><main><h1>内部滚动与页面改写</h1><section id="reader"><p id="target">原文节点会被复用，记录的想法必须保留；定位不确定时不能贴到另一段正文。</p><div class="space"></div></section></main></body></html>`
      )
      return
    }
    response.end(
      `<!doctype html><html lang="zh-CN"><head><title>${request.url === '/second' ? '第二篇文章' : '双层架构阅读示例'}</title><style>body{margin:0;font-family:system-ui;background:#fcfcf8;color:#303d32}article{width:70%;max-width:750px;margin:70px auto;line-height:2}h1{font-size:32px}p{font-size:17px;margin:45px 0}#after{height:1800px}.reflow{height:160px}</style></head><body><article><h1>网页与批注，回到双层架构</h1><p id="first">阅读发生在真实网页中。页面的链接、滚动和正文保留原有行为。</p><p id="target">双层结构让网页保持可交互，批注与正文一起滚动。笔记能够复用，下一次阅读继续思考。</p><a id="next" href="/second">打开第二篇文章</a><div id="after"></div><p>页面底部。</p></article></body></html>`
    )
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Fixture server unavailable')
  origin = `http://127.0.0.1:${address.port}`
})

test.afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

async function launch(
  directory = dataDirectory
): Promise<{ app: ElectronApplication; shell: Page; webpage: Page }> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env))
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value
  const app = await electron.launch({
    ...(process.env.MINDNOTES_EXECUTABLE
      ? { executablePath: process.env.MINDNOTES_EXECUTABLE, args: [] }
      : { args: ['.'] }),
    env: {
      ...env,
      MINDNOTES_USE_DIST: '1',
      MINDNOTES_USER_DATA_DIR: directory,
      MINDNOTES_START_WORKSPACE: '1',
    },
  })
  const shell = await app.firstWindow()
  await expect(shell.getByRole('region', { name: '统一笔记库' })).toBeVisible()
  await shell.screenshot({ path: test.info().outputPath('homepage.png') })
  await shell.getByRole('textbox', { name: '要批注的网页地址' }).fill(`${origin}/article`)
  const pagePromise = app.waitForEvent('window', { predicate: (page) => page !== shell })
  await shell.getByRole('button', { name: '打开网页', exact: true }).click()
  const webpage = await pagePromise
  await expect(webpage.locator('#target')).toBeVisible()
  await expect(webpage.locator('#mindnotes-page-layer')).toBeAttached()
  return { app, shell, webpage }
}

test('page pointer cancellation preserves owned ink and releases interrupted gestures', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-page-pointer-'))
  const { app, shell, webpage } = await launch(directory)
  const svg = webpage.locator('#mindnotes-page-layer').locator('svg')
  const ink = webpage.locator('#mindnotes-page-layer').locator('polyline')
  try {
    await shell.getByRole('button', { name: '画笔', exact: true }).click()
    const target = (await webpage.locator('#target').boundingBox())!
    const x = Math.floor(target.x + 20)
    const y = Math.floor(target.y + 20)
    await webpage.mouse.move(x, y)
    await webpage.mouse.down()
    await webpage.mouse.move(x + 60, y + 5)
    // A rejected second pointer's cancellation must leave the mouse stroke intact.
    await svg.dispatchEvent('pointercancel', { pointerId: 99, pointerType: 'touch' })
    await webpage.mouse.move(x + 120, y + 10)
    await webpage.mouse.up()
    await expect(ink).toHaveCount(1)
    await expect
      .poll(() =>
        shell.evaluate(() => window.mindnotes!.getState().then((state) => state.saveState))
      )
      .toBe('saved')
    const before = (await shell.evaluate(() => window.mindnotes!.getState())).pages[0].annotations
    expect(before).toHaveLength(1)
    expect(before[0].points).toHaveLength(3)
    expect(before[0].points[0]).toEqual({ x, y })

    await webpage.mouse.move(x, y + 70)
    await webpage.mouse.down()
    await webpage.mouse.move(x + 60, y + 75)
    await expect(ink).toHaveCount(2)
    await svg.evaluate((element) => (element as SVGSVGElement).releasePointerCapture(1))
    await webpage.mouse.move(x + 80, y + 78)
    await expect(ink).toHaveCount(1)
    await webpage.mouse.up()
    expect((await shell.evaluate(() => window.mindnotes!.getState())).pages[0].annotations).toEqual(
      before
    )

    await webpage.mouse.move(x, y + 90)
    await webpage.mouse.down()
    await webpage.mouse.move(x + 40, y + 95)
    await shell.evaluate(() => window.mindnotes!.configure('browse', '#e0a11b'))
    await expect
      .poll(() => svg.evaluate((element) => (element as SVGSVGElement).hasPointerCapture(1)))
      .toBe(false)
    await expect(ink).toHaveCount(1)
    await webpage.mouse.up()
    await webpage.locator('#next').click()
    await expect(webpage).toHaveURL(`${origin}/second`)
    const stored = JSON.parse(await readFile(path.join(directory, 'page-notes.json'), 'utf8'))
    expect(
      stored.pages.find((page: { url: string }) => page.url === `${origin}/article`).annotations
    ).toEqual(before)
    await writeFile(
      test.info().outputPath('page-pointer-cancellation.json'),
      JSON.stringify(
        {
          status: 'passed',
          scope:
            'Actual Electron webpage mouse gesture; explicitly synthetic unrelated cancellation and DOM capture release. No native touch hardware claim.',
          savedAnnotations: before,
          interruptedGesturesCommitted: false,
          browseReleasedCapture: true,
          underlyingLinkNavigated: true,
        },
        null,
        2
      )
    )
  } finally {
    await app.close()
  }
})

test('page release coordinates complete fast strokes and remain exact after restart', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-page-endpoint-'))
  const first = await launch(directory)
  let annotations
  try {
    await first.shell.getByRole('button', { name: '画笔', exact: true }).click()
    const bounds = (await first.webpage.locator('#target').boundingBox())!
    const x = Math.floor(bounds.x + 20)
    const y = Math.floor(bounds.y + 20)
    const cdp = await first.webpage.context().newCDPSession(first.webpage)
    for (const offset of [0, 40]) {
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x,
        y: y + offset,
        button: 'left',
        buttons: 1,
        clickCount: 1,
      })
      if (!offset)
        await cdp.send('Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          x: x + 40,
          y: y + 5,
          buttons: 1,
        })
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: x + 120,
        y: y + offset + 15,
        button: 'left',
        buttons: 0,
        clickCount: 1,
      })
    }
    await cdp.detach()
    await expect(first.webpage.locator('#mindnotes-page-layer').locator('polyline')).toHaveCount(2)
    await expect
      .poll(() =>
        first.shell.evaluate(() => window.mindnotes!.getState().then((state) => state.saveState))
      )
      .toBe('saved')
    annotations = (await first.shell.evaluate(() => window.mindnotes!.getState())).pages[0]
      .annotations
    expect(annotations[0].points).toEqual([
      { x, y },
      { x: x + 40, y: y + 5 },
      { x: x + 120, y: y + 15 },
    ])
    expect(annotations[1].points).toEqual([
      { x, y: y + 40 },
      { x: x + 120, y: y + 55 },
    ])
  } finally {
    await first.app.close()
  }
  const reopened = await launch(directory)
  try {
    expect(
      (await reopened.shell.evaluate(() => window.mindnotes!.getState())).pages[0].annotations
    ).toEqual(annotations)
    await writeFile(
      test.info().outputPath('page-released-endpoint.json'),
      JSON.stringify(
        {
          status: 'passed',
          annotations,
          exactRestart: true,
          scope:
            'Actual native webpage with browser CDP release coordinates, including a line with no delivered move. No physical device or pen latency claim.',
        },
        null,
        2
      )
    )
  } finally {
    await reopened.app.close()
  }
})

test('real page: anchored ink, scrolling, reflow, excerpt, persistence, history and navigation', async () => {
  const { app, shell, webpage } = await launch()
  try {
    const errors: string[] = []
    shell.on('pageerror', (error) => errors.push(error.message))
    webpage.on('pageerror', (error) => errors.push(error.message))
    await shell.getByRole('button', { name: '画笔', exact: true }).click()
    const target = await webpage.locator('#target').boundingBox()
    expect(target).not.toBeNull()
    const start = { x: target!.x + 12, y: target!.y + 25 }
    await webpage.mouse.move(start.x, start.y)
    await webpage.mouse.down()
    await webpage.mouse.move(start.x + 160, start.y + 8, { steps: 12 })
    await webpage.mouse.up()
    await expect(shell.getByRole('textbox', { name: '第 1 条批注的笔记' })).toBeVisible()
    const geometry = () =>
      webpage.locator('#mindnotes-page-layer').locator('polyline').first().getAttribute('points')
    const original = (await geometry())!.split(' ')[0].split(',').map(Number)
    await webpage.evaluate(() => {
      window.scrollBy(0, 110)
    })
    await expect
      .poll(async () => Number((await geometry())!.split(' ')[0].split(',')[1]))
      .toBeCloseTo(original[1] - 110, 0)
    await webpage.evaluate(() => {
      const spacer = document.createElement('div')
      spacer.className = 'reflow'
      document.querySelector('#target')?.before(spacer)
    })
    await expect
      .poll(async () => {
        const paragraph = await webpage.locator('#target').boundingBox()
        const y = Number((await geometry())!.split(' ')[0].split(',')[1])
        return y - paragraph!.y
      })
      .toBeCloseTo(original[1] - target!.y, 0)
    await shell.getByRole('button', { name: '浏览', exact: true }).click()
    await webpage.evaluate(() => {
      const element = document.getElementById('target')
      if (!element) throw new Error('Missing paragraph')
      const range = document.createRange()
      range.selectNodeContents(element)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    })
    await shell.getByRole('button', { name: '摘录', exact: true }).click()
    await expect(shell.locator('blockquote')).toContainText('双层结构让网页保持可交互')
    await shell
      .getByRole('textbox', { name: '第 2 条批注的笔记' })
      .fill('这才是产品的核心：阅读时留下可复用的想法。')
    await shell.getByRole('button', { name: '浏览', exact: true }).click()
    const quotePin = webpage
      .locator('#mindnotes-page-layer')
      .getByRole('button', { name: '打开第 2 条批注', exact: true })
    await expect(quotePin).toBeVisible()
    // The injected layer redraws after IPC updates on the next animation frame;
    // its pin can be replaced while Playwright is reading the native bounds.
    await expect
      .poll(async () => {
        const bounds = await quotePin.boundingBox()
        return bounds ? Math.min(bounds.width, bounds.height) : 0
      })
      .toBeGreaterThanOrEqual(44)
    await shell.getByRole('button', { name: '定位第 1 条批注', exact: true }).click()
    // The surrounding target remains clickable beyond the small visible marker.
    await quotePin.click({ position: { x: 2, y: 2 } })
    await expect(shell.locator('.note-card.is-active textarea')).toHaveAttribute(
      'aria-label',
      '第 2 条批注的笔记'
    )
    await expect(shell.getByRole('status', { name: '笔记保存状态' })).toContainText('已保存在本地')
    await expect
      .poll(
        async () =>
          JSON.parse(await readFile(path.join(dataDirectory, 'page-notes.json'), 'utf8')).pages[0]
            .annotations[1].comment
      )
      .toContain('产品的核心')
    await shell.getByRole('button', { name: '刷新网页' }).click()
    await expect(webpage.locator('#mindnotes-page-layer')).toBeAttached()
    await expect(webpage.locator('#mindnotes-page-layer').locator('polyline')).toHaveCount(1)
    await expect(webpage.locator('#mindnotes-page-layer').locator('rect')).not.toHaveCount(0)
    await expect(shell.getByRole('textbox', { name: '第 2 条批注的笔记' })).toHaveValue(
      '这才是产品的核心：阅读时留下可复用的想法。'
    )
    await shell.getByRole('button', { name: '便签', exact: true }).click()
    const position = await webpage.locator('#first').boundingBox()
    await webpage.mouse.click(position!.x + 30, position!.y + 12)
    await expect(shell.getByRole('textbox', { name: '第 3 条批注的笔记' })).toBeVisible()
    await shell.getByRole('button', { name: '撤销批注' }).click()
    await expect(shell.getByRole('textbox', { name: '第 3 条批注的笔记' })).toHaveCount(0)
    await shell.getByRole('button', { name: '重做批注' }).click()
    await expect(shell.getByRole('textbox', { name: '第 3 条批注的笔记' })).toBeVisible()
    await shell.getByRole('button', { name: '浏览', exact: true }).click()
    await webpage.locator('#next').click()
    await expect(webpage).toHaveURL(`${origin}/second`)
    await expect(shell.getByRole('textbox', { name: '第 1 条批注的笔记' })).toHaveCount(0)
    await shell.getByRole('button', { name: '后退', exact: true }).click()
    await expect(webpage).toHaveURL(`${origin}/article`)
    await expect(shell.getByRole('textbox', { name: '第 2 条批注的笔记' })).toHaveValue(
      '这才是产品的核心：阅读时留下可复用的想法。'
    )
    await shell.screenshot({ path: test.info().outputPath('reading-workspace.png') })
    await webpage.screenshot({ path: test.info().outputPath('annotated-page.png') })
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }

  const reopened = await launch()
  try {
    await expect(reopened.shell.getByRole('textbox', { name: '第 2 条批注的笔记' })).toHaveValue(
      '这才是产品的核心：阅读时留下可复用的想法。'
    )
    await expect(reopened.webpage.locator('#mindnotes-page-layer').locator('polyline')).toHaveCount(
      1
    )
  } finally {
    await reopened.app.close()
  }
})

test('comments survive immediate navigation and a native window close', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-immediate-save-'))
  const { app, shell, webpage } = await launch(directory)
  let closed = false
  try {
    await shell.getByRole('button', { name: '便签', exact: true }).click()
    const position = await webpage.locator('#first').boundingBox()
    await webpage.mouse.click(position!.x + 30, position!.y + 12)
    const editor = shell.getByRole('textbox', { name: '第 1 条批注的笔记' })
    await editor.fill('刚输入就切换页面，笔记属于原来的网页。')
    await shell.getByRole('textbox', { name: '网页地址' }).fill(`${origin}/second`)
    await shell.getByRole('button', { name: '打开地址' }).click()
    await expect(webpage).toHaveURL(`${origin}/second`)
    await expect(editor).toHaveCount(0)
    await shell.getByRole('button', { name: '后退', exact: true }).click()
    await expect(webpage).toHaveURL(`${origin}/article`)
    await expect(editor).toHaveValue('刚输入就切换页面，笔记属于原来的网页。')
    await editor.fill('最后一次输入后立即关闭窗口。')
    await Promise.all([
      app.waitForEvent('close'),
      app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0].close()
      }),
    ])
    closed = true
  } finally {
    if (!closed) await app.close()
  }
  const reopened = await launch(directory)
  try {
    await expect(reopened.shell.getByRole('textbox', { name: '第 1 条批注的笔记' })).toHaveValue(
      '最后一次输入后立即关闭窗口。'
    )
    await expect(reopened.webpage.locator('#mindnotes-page-layer').getByRole('button')).toHaveCount(
      1
    )
  } finally {
    await reopened.app.close()
  }
})

test('remote reading pages reject permissions without exposing devices or the desktop', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-page-permissions-app-'))
  const { app, shell, webpage } = await launch(directory)
  try {
    const checks = await webpage.evaluate(async () =>
      Promise.all(
        (['geolocation', 'notifications', 'camera', 'microphone'] as PermissionName[]).map(
          async (name) => ({ name, state: (await navigator.permissions.query({ name })).state })
        )
      )
    )
    expect(checks).toHaveLength(4)
    for (const item of checks) expect(item.state).toBe('denied')
    const notification = await webpage.evaluate(() => Notification.requestPermission())
    expect(notification).toBe('denied')
    const location = await webpage.evaluate(
      () =>
        new Promise<number>((resolve) =>
          navigator.geolocation.getCurrentPosition(
            () => resolve(0),
            (error) => resolve(error.code)
          )
        )
    )
    expect(location).toBe(1)
    const media = await webpage.evaluate(() =>
      navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(
        (stream) => {
          stream.getTracks().forEach((track) => track.stop())
          return 'granted'
        },
        (error: DOMException) => error.name
      )
    )
    expect(media).toBe('NotAllowedError')
    const capture = await app.evaluate(async ({ webContents }, pageUrl) => {
      const contents = webContents.getAllWebContents().find((item) => item.getURL() === pageUrl)!
      return contents.executeJavaScript(
        `navigator.mediaDevices.getDisplayMedia({video:true}).then(stream => {stream.getTracks().forEach(track => track.stop()); return 'granted'}, error => error.name)`,
        true
      )
    }, `${origin}/article`)
    expect(capture).toBe('NotAllowedError')
    const session = await app.evaluate(({ webContents }, pageUrl) => {
      const page = webContents
        .getAllWebContents()
        .find((contents) => contents.getURL() === pageUrl)!
      const shell = webContents
        .getAllWebContents()
        .find((contents) => contents.getURL().startsWith('file:'))!
      return { differentSessions: page.session !== shell.session }
    }, `${origin}/article`)
    expect(session.differentSessions).toBe(true)
    await expect(webpage.locator('#first')).toContainText('阅读发生在真实网页中')
    await shell.getByRole('button', { name: '便签', exact: true }).click()
    const paragraph = await webpage.locator('#first').boundingBox()
    await webpage.mouse.click(paragraph!.x + 20, paragraph!.y + 12)
    await shell
      .getByRole('textbox', { name: '第 1 条批注的笔记' })
      .fill('权限拒绝后阅读批注仍正常。')
    await expect(shell.getByRole('status', { name: '笔记保存状态' })).toContainText('已保存在本地')
  } finally {
    await app.close()
  }
})

test('internal scrolling, reused page nodes and SPA routes preserve notes and report missing positions', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-page-positions-'))
  const { app, shell, webpage } = await launch(directory)
  try {
    await shell.getByRole('textbox', { name: '网页地址' }).fill(`${origin}/compat`)
    await shell.getByRole('button', { name: '打开地址' }).click()
    await expect(webpage).toHaveURL(`${origin}/compat`)
    await expect(webpage.locator('#mindnotes-page-layer')).toBeAttached()
    const target = webpage.locator('#target')
    const originalText = (await target.textContent())!
    await shell.getByRole('button', { name: '画笔', exact: true }).click()
    const bounds = (await target.boundingBox())!
    await webpage.mouse.move(bounds.x + 15, bounds.y + 18)
    await webpage.mouse.down()
    await webpage.mouse.move(bounds.x + 155, bounds.y + 24, { steps: 10 })
    await webpage.mouse.up()
    const ink = webpage.locator('#mindnotes-page-layer').locator('polyline')
    const originalY = Number((await ink.getAttribute('points'))!.split(' ')[0].split(',')[1])
    await webpage.locator('#reader').evaluate((element) => {
      element.scrollTop = 32
    })
    await expect
      .poll(async () => Number((await ink.getAttribute('points'))!.split(' ')[0].split(',')[1]))
      .toBeCloseTo(originalY - 32, 0)
    await shell.getByRole('button', { name: '浏览', exact: true }).click()
    await webpage.evaluate(() => {
      const range = document.createRange()
      range.selectNodeContents(document.getElementById('target')!)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)
    })
    await shell.getByRole('button', { name: '摘录', exact: true }).click()
    const firstComment = shell.getByRole('textbox', { name: '第 1 条批注的笔记' })
    const quoteComment = shell.getByRole('textbox', { name: '第 2 条批注的笔记' })
    await quoteComment.fill('原文变更后，摘录和评论也应保持可复用。')
    await expect(shell.getByRole('status', { name: '笔记保存状态' })).toContainText('已保存在本地')
    const before = JSON.parse(await readFile(path.join(directory, 'page-notes.json'), 'utf8'))
    const originalAnnotations = before.pages.find((page: { url: string }) =>
      page.url.endsWith('/compat')
    ).annotations

    // Recycle the connected paragraph and add the old words elsewhere: the
    // cached annotation must not silently jump onto the replacement paragraph.
    await target.evaluate((element, text) => {
      element.firstChild!.textContent = '这是复用相同节点的全新正文，与之前的摘录没有关系。'
      const repeated = document.createElement('p')
      repeated.id = 'repeated'
      repeated.textContent = text
      element.after(repeated)
    }, originalText)
    await expect(ink).toHaveCount(0)
    await expect(shell.getByRole('status', { name: '第 1 条批注定位状态' })).toContainText(
      '无法确认'
    )
    await expect(shell.getByRole('status', { name: '第 2 条批注定位状态' })).toContainText(
      '仍可编辑和导出'
    )
    await expect(shell.getByRole('button', { name: '定位第 2 条批注' })).toBeDisabled()
    await quoteComment.fill('找不到原文时仍能继续编辑的结论。')
    await expect(shell.getByRole('status', { name: '笔记保存状态' })).toContainText('已保存在本地')
    await expect(firstComment).toBeVisible()

    await target.evaluate((element, text) => {
      document.getElementById('repeated')?.remove()
      element.firstChild!.textContent = text
    }, originalText)
    await expect(ink).toHaveCount(1)
    await expect(shell.getByRole('status', { name: '第 2 条批注定位状态' })).toHaveCount(0)
    await expect(shell.getByRole('button', { name: '定位第 2 条批注' })).toBeEnabled()
    await target.evaluate((element) => {
      ;(element as HTMLElement).hidden = true
    })
    await expect(ink).toHaveCount(0)
    await expect(shell.getByRole('status', { name: '第 2 条批注定位状态' })).toBeVisible()
    await target.evaluate((element) => {
      ;(element as HTMLElement).hidden = false
    })
    await expect(ink).toHaveCount(1)
    await expect(shell.getByRole('status', { name: '第 2 条批注定位状态' })).toHaveCount(0)
    await webpage.locator('#reader').evaluate((element) => {
      element.scrollTop = 600
    })
    await shell.getByRole('button', { name: '定位第 2 条批注' }).click()
    await expect
      .poll(() => webpage.locator('#reader').evaluate((element) => element.scrollTop))
      .toBeLessThan(300)

    await webpage.evaluate(() => {
      history.pushState({}, '', '/compat-second')
    })
    await expect(firstComment).toHaveCount(0)
    await expect(ink).toHaveCount(0)
    await webpage.evaluate(() => {
      history.back()
    })
    await expect(ink).toHaveCount(1)
    await expect(quoteComment).toHaveValue('找不到原文时仍能继续编辑的结论。')
    await expect(shell.getByRole('status', { name: '第 2 条批注定位状态' })).toHaveCount(0)
    const after = JSON.parse(await readFile(path.join(directory, 'page-notes.json'), 'utf8'))
    const saved = after.pages.find((page: { url: string }) =>
      page.url.endsWith('/compat')
    ).annotations
    expect(
      saved.map((annotation: { points: unknown; anchor: unknown }) => ({
        points: annotation.points,
        anchor: annotation.anchor,
      }))
    ).toEqual(
      originalAnnotations.map((annotation: { points: unknown; anchor: unknown }) => ({
        points: annotation.points,
        anchor: annotation.anchor,
      }))
    )

    // A disconnected selector may recover one unique paragraph by text, but two
    // indistinguishable replacements must not silently select the first one.
    await target.evaluate((element) => {
      const one = element.cloneNode(true) as HTMLElement
      const two = element.cloneNode(true) as HTMLElement
      one.id = 'replacement-one'
      two.id = 'replacement-two'
      element.replaceWith(one, two)
    })
    await expect(ink).toHaveCount(0)
    await expect(shell.getByRole('status', { name: '第 1 条批注定位状态' })).toContainText(
      '无法确认'
    )
    await webpage.locator('#replacement-two').evaluate((element) => element.remove())
    await expect(ink).toHaveCount(1)
    await expect(shell.getByRole('status', { name: '第 1 条批注定位状态' })).toHaveCount(0)
  } finally {
    await app.close()
  }
})

test('page and shell renderer failures recover committed notes without leaving a blank workspace', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-renderer-recovery-'))
  const { app, shell, webpage } = await launch(directory)
  try {
    await shell.getByRole('button', { name: '便签', exact: true }).click()
    const position = await webpage.locator('#first').boundingBox()
    await webpage.mouse.click(position!.x + 30, position!.y + 12)
    const editor = shell.getByRole('textbox', { name: '第 1 条批注的笔记' })
    const comment = '进程恢复后继续编辑已经保存的阅读笔记。'
    await editor.fill(comment)
    await expect(shell.getByRole('status', { name: '笔记保存状态' })).toContainText('已保存在本地')
    const contentsIds = await app.evaluate(
      ({ BrowserWindow, webContents }, pageUrl) => ({
        shell: BrowserWindow.getAllWindows()[0].webContents.id,
        page: webContents.getAllWebContents().find((contents) => contents.getURL() === pageUrl)!.id,
      }),
      `${origin}/article`
    )
    await app.evaluate(({ webContents }, id) => {
      webContents.fromId(id)!.forcefullyCrashRenderer()
    }, contentsIds.page)
    await expect(shell.getByRole('alert')).toContainText('网页进程已退出')
    await shell.getByRole('button', { name: '刷新网页' }).click()
    // Playwright marks a crashed Page permanently disconnected. Read the reloaded
    // native renderer directly rather than querying that stale automation session.
    const pageState = () =>
      app.evaluate(({ webContents }, id) => {
        const contents = webContents.fromId(id)!
        if (contents.isCrashed() || contents.isLoading()) return false
        return contents
          .executeJavaScript(
            `Boolean(document.querySelector('#mindnotes-page-layer')?.shadowRoot?.querySelector('button'))`
          )
          .catch(() => false)
      }, contentsIds.page)
    await expect.poll(pageState).toBe(true)
    await expect(editor).toHaveValue(comment)

    const shellState = () =>
      app.evaluate(({ webContents }, id) => {
        const contents = webContents.fromId(id)!
        if (contents.isCrashed() || contents.isLoading()) return null
        return contents
          .executeJavaScript(
            `({
        comment: document.querySelector('textarea')?.value,
        error: document.querySelector('[role="alert"]')?.textContent,
        tool: [...document.querySelectorAll('button')].find(button => button.textContent.trim() === '浏览')?.getAttribute('aria-pressed')
      })`
          )
          .catch(() => null)
      }, contentsIds.shell)
    await app.evaluate(async ({ webContents }, id) => {
      const contents = webContents.fromId(id)!
      const reloaded = new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Shell did not reload')), 10_000)
        contents.once('did-finish-load', () => {
          clearTimeout(timer)
          resolve()
        })
      })
      contents.forcefullyCrashRenderer()
      await reloaded
    }, contentsIds.shell)
    await expect.poll(async () => (await shellState())?.comment, { timeout: 20_000 }).toBe(comment)
    await expect.poll(async () => (await shellState())?.error).toContain('笔记窗口异常中断')
    await expect.poll(async () => (await shellState())?.tool).toBe('true')
    await expect.poll(pageState).toBe(true)
    // A repeated crash returns control to the floating entry instead of looping reloads.
    await app.evaluate(({ webContents }, id) => {
      webContents.fromId(id)!.forcefullyCrashRenderer()
    }, contentsIds.shell)
    await expect
      .poll(() => app.windows().filter((page) => page.url().includes('surface=')).length)
      .toBe(2)
    const toolbar = app.windows().find((page) => page.url().includes('surface=toolbar'))!
    await expect(toolbar.getByRole('button', { name: '展开悬浮批注' })).toBeVisible()
    await toolbar.getByRole('button', { name: '展开悬浮批注' }).click()
    await toolbar.getByRole('button', { name: '更多操作' }).click()
    await toolbar.getByRole('button', { name: '我的笔记', exact: true }).click()
    await expect.poll(async () => (await shellState())?.comment, { timeout: 20_000 }).toBe(comment)
    await app.evaluate(
      ({ webContents }, id) =>
        webContents.fromId(id)!.executeJavaScript(`(() => {
        const editor = document.querySelector('textarea');
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(editor, '恢复后新增的结论也应正常保存。');
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      })()`),
      contentsIds.shell
    )
    await expect
      .poll(async () => {
        const persisted = JSON.parse(
          await readFile(path.join(directory, 'page-notes.json'), 'utf8')
        )
        return persisted.pages[0].annotations[0].comment
      })
      .toBe('恢复后新增的结论也应正常保存。')
  } finally {
    await app.close()
  }
})

test('exports reusable Markdown and editable JSON, then imports and preserves newer edits', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-export-'))
  const markdownFile = path.join(directory, 'reading.md')
  const backupFile = path.join(directory, 'reading.json')
  const { app, shell, webpage } = await launch(directory)
  try {
    await shell.getByRole('button', { name: '画笔', exact: true }).click()
    const position = await webpage.locator('#first').boundingBox()
    await webpage.mouse.move(position!.x + 15, position!.y + 25)
    await webpage.mouse.down()
    await webpage.mouse.move(position!.x + 150, position!.y + 25, { steps: 10 })
    await webpage.mouse.up()
    await shell.getByRole('button', { name: '浏览', exact: true }).click()
    await webpage.evaluate(() => {
      const element = document.getElementById('target')!
      const range = document.createRange()
      range.selectNodeContents(element)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)
    })
    await shell.getByRole('button', { name: '摘录', exact: true }).click()
    await shell
      .getByRole('textbox', { name: '第 2 条批注的笔记' })
      .fill('带着来源复用这条阅读笔记。')
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, markdownFile)
    await shell.getByRole('button', { name: '导出笔记' }).click()
    await shell.getByRole('menuitem', { name: /Markdown 笔记/ }).click()
    await expect
      .poll(async () => readFile(markdownFile, 'utf8').catch(() => ''))
      .toContain('带着来源复用')
    const markdown = await readFile(markdownFile, 'utf8')
    expect(markdown).toContain(`${origin}/article`)
    expect(markdown).toContain('> 双层结构让网页保持可交互')
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, backupFile)
    await shell.getByRole('button', { name: '导出笔记' }).click()
    await shell.getByRole('menuitem', { name: /可编辑备份/ }).click()
    await expect
      .poll(async () => readFile(backupFile, 'utf8').catch(() => ''))
      .toContain('mindnotes-pro.page-notes')
  } finally {
    await app.close()
  }

  const importedDirectory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-import-'))
  const imported = await launch(importedDirectory)
  try {
    await imported.shell.getByRole('button', { name: 'MindNotes Pro 我的笔记' }).click()
    await imported.shell.locator('input[type=file]').setInputFiles(backupFile)
    await expect(imported.shell.getByRole('alert')).toContainText('笔记已合并导入')
    await expect(imported.shell.getByRole('button', { name: /^打开网页笔记/ })).toHaveCount(1)
    await imported.shell.getByRole('button', { name: /^打开网页笔记/ }).click()
    await expect(imported.shell.getByRole('textbox', { name: '第 2 条批注的笔记' })).toHaveValue(
      '带着来源复用这条阅读笔记。'
    )
    await expect(imported.webpage.locator('#mindnotes-page-layer').locator('polyline')).toHaveCount(
      1
    )
    await expect(imported.webpage.locator('#mindnotes-page-layer').locator('rect')).not.toHaveCount(
      0
    )
    await imported.shell
      .getByRole('textbox', { name: '第 2 条批注的笔记' })
      .fill('本地较新的修改需要保留。')
    await imported.shell.getByRole('button', { name: 'MindNotes Pro 我的笔记' }).click()
    await imported.shell.locator('input[type=file]').setInputFiles(backupFile)
    await expect(imported.shell.getByRole('alert')).toContainText('笔记已合并导入')
    await imported.shell.getByRole('button', { name: /^打开网页笔记/ }).click()
    await expect(imported.shell.getByRole('textbox', { name: '第 2 条批注的笔记' })).toHaveValue(
      '本地较新的修改需要保留。'
    )
    await imported.app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].setSize(900, 640)
    })
    await expect(imported.shell.getByRole('button', { name: '摘录', exact: true })).toBeInViewport()
    await expect(imported.shell.getByRole('button', { name: '收起笔记' })).toBeInViewport()
    for (const button of await imported.shell.locator('.notes-workspace-toolbar button').all()) {
      await expect(button).toBeInViewport()
      const bounds = await button.boundingBox()
      expect(bounds!.width).toBeGreaterThanOrEqual(44)
      expect(bounds!.height).toBeGreaterThanOrEqual(44)
    }
    await imported.shell.screenshot({ path: test.info().outputPath('small-workspace.png') })
    const width = await imported.webpage.evaluate(() => window.innerWidth)
    await imported.shell.getByRole('button', { name: '收起笔记' }).click()
    await expect(imported.shell.getByRole('complementary', { name: '当前网页笔记' })).toHaveCount(0)
    await expect
      .poll(async () => imported.webpage.evaluate(() => window.innerWidth))
      .toBeGreaterThan(width)
  } finally {
    await imported.app.close()
  }
})

function recoveryPage() {
  return {
    url: `${origin}/article`,
    title: '双层架构阅读示例',
    createdAt: 1,
    updatedAt: 2,
    annotations: [
      {
        id: 'recovery_ink',
        kind: 'ink',
        color: '#e05d52',
        points: [
          { x: 20, y: 20 },
          { x: 150, y: 20 },
        ],
        anchor: null,
        quote: null,
        comment: '原副本中的想法',
        createdAt: 1,
        updatedAt: 2,
      },
    ],
  }
}

test('earlier page recovery stays visible through navigation and current notes remain editable', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-page-previous-'))
  const file = path.join(directory, 'page-notes.json')
  const previous = `${file}.previous`
  const saved = recoveryPage()
  await writeFile(file, 'corrupt current page notebook')
  const previousBytes = JSON.stringify({
    format: 'mindnotes-pro.page-notes',
    version: 1,
    pages: [saved],
  })
  await writeFile(previous, previousBytes)
  const initial = await launch(directory)
  try {
    const notice = initial.shell.getByRole('status', { name: '网页笔记恢复提示' })
    await expect(notice).toContainText('最近修改可能缺失')
    await expect(initial.shell.getByRole('textbox', { name: '第 1 条批注的笔记' })).toHaveValue(
      '原副本中的想法'
    )
    await initial.shell
      .getByRole('textbox', { name: '第 1 条批注的笔记' })
      .fill('恢复后继续编辑的想法')
    await expect(initial.shell.getByRole('status', { name: '笔记保存状态' })).toHaveText(
      '已保存在本地'
    )
    expect(JSON.parse(await readFile(previous, 'utf8')).pages[0].annotations[0].comment).toBe(
      '原副本中的想法'
    )
    await initial.shell.getByRole('button', { name: 'MindNotes Pro 我的笔记' }).click()
    await expect(notice).toContainText('最近修改可能缺失')
    await initial.shell.getByRole('button', { name: '打开网页笔记 双层架构阅读示例' }).click()
    await expect(notice).toBeVisible()
    await initial.app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setSize(900, 640)
    )
    await expect(notice).toBeInViewport()
    await expect(initial.shell.getByRole('button', { name: '摘录', exact: true })).toBeInViewport()
  } finally {
    await initial.app.close()
  }
  const reopened = await launch(directory)
  try {
    await expect(reopened.shell.getByRole('status', { name: '网页笔记恢复提示' })).toHaveCount(0)
    await expect(reopened.shell.getByRole('textbox', { name: '第 1 条批注的笔记' })).toHaveValue(
      '恢复后继续编辑的想法'
    )
    expect(JSON.parse(await readFile(previous, 'utf8')).pages[0].annotations[0].comment).toBe(
      '恢复后继续编辑的想法'
    )
  } finally {
    await reopened.app.close()
  }
})

test('failed page import keeps an honest error and export restores exact notes after manual file preservation', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-page-import-failure-'))
  const file = path.join(directory, 'page-notes.json')
  const previous = `${file}.previous`
  await writeFile(file, 'corrupt current page notebook')
  await writeFile(previous, 'corrupt previous page notebook')
  const importedPage = recoveryPage()
  const importedFile = path.join(directory, 'to-import.json')
  const recoveryFile = path.join(directory, 'current-memory.json')
  await writeFile(
    importedFile,
    JSON.stringify({ format: 'mindnotes-pro.page-notes', version: 1, pages: [importedPage] })
  )
  const initial = await launch(directory)
  let closed = false
  try {
    await initial.shell.getByRole('button', { name: 'MindNotes Pro 我的笔记' }).click()
    await initial.shell.getByLabel('导入笔记文件').setInputFiles(importedFile)
    await expect(initial.shell.locator('.notes-message')).toContainText('导入内容尚未保存')
    await expect(initial.shell.locator('.notes-message')).not.toContainText('笔记已合并导入')
    await expect(initial.shell.getByRole('status', { name: '笔记保存状态' })).toHaveText('保存失败')
    await expect(
      initial.shell.getByRole('button', { name: '打开网页笔记 双层架构阅读示例' })
    ).toHaveCount(1)
    expect(await readFile(file, 'utf8')).toBe('corrupt current page notebook')
    expect(await readFile(previous, 'utf8')).toBe('corrupt previous page notebook')
    await initial.app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, recoveryFile)
    await initial.shell.getByRole('button', { name: '导出全部' }).click()
    await initial.shell.getByRole('menuitem', { name: /可编辑备份/ }).click()
    await expect
      .poll(() =>
        readFile(recoveryFile, 'utf8')
          .then(JSON.parse)
          .catch(() => null)
      )
      .toMatchObject({ pages: [importedPage] })
    await expect(initial.shell.locator('.notes-message')).toContainText('笔记已导出')
    await expect(initial.shell.locator('.notes-message')).toContainText('原笔记文件无法读取')
    await expect(initial.shell.getByRole('status', { name: '笔记保存状态' })).toHaveText('保存失败')
    await initial.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close())
    await expect(initial.shell.locator('.notes-message')).toContainText('退出已取消')
    expect(initial.app.process().exitCode).toBeNull()
    await initial.app.evaluate(({ dialog }) => {
      dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false })
    })
    await Promise.all([
      initial.app.waitForEvent('close'),
      initial.shell.evaluate(() => window.mindnotes!.command('force-quit')).catch(() => {}),
    ])
    closed = true
  } finally {
    if (!closed) {
      await initial.app
        .evaluate(({ dialog }) => {
          dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false })
        })
        .catch(() => {})
      await initial.shell.evaluate(() => window.mindnotes!.command('force-quit')).catch(() => {})
    }
  }
  await rename(file, path.join(directory, 'page-notes.original.json'))
  await rename(previous, path.join(directory, 'page-notes.original.previous'))
  const restored = await launch(directory)
  try {
    await restored.shell.getByRole('button', { name: 'MindNotes Pro 我的笔记' }).click()
    await restored.shell.getByLabel('导入笔记文件').setInputFiles(recoveryFile)
    await expect(restored.shell.locator('.notes-message')).toContainText('笔记已合并导入')
    await expect(restored.shell.getByRole('status', { name: '笔记保存状态' })).toHaveText(
      '已保存在本地'
    )
    expect(JSON.parse(await readFile(file, 'utf8')).pages).toEqual([importedPage])
  } finally {
    await restored.app.close()
  }
})
