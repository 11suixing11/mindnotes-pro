import { chromium, expect } from '@playwright/test'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { createServer as createNetServer } from 'node:net'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import { PNG } from 'pngjs'
import os from 'node:os'
import path from 'node:path'
import { ScreenNotebookRepository } from '../../dist-electron/electron/screenNotebookRepository.mjs'

export async function startFixture() {
  const server = createServer((_request, response) => {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.end(
      '<!doctype html><html lang="zh-CN"><head><title>发行版笔记验收</title><style>body{margin:0;background:#fafdf5;font-family:system-ui}article{margin:60px auto;width:650px;line-height:2}#space{height:1500px}</style></head><body><article><h1>阅读笔记与屏幕批注</h1><p id="target">批注必须能保存、恢复和继续编辑，升级也要保留已经记录的想法。</p><div id="space"></div></article></body></html>'
    )
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return {
    url: `http://127.0.0.1:${server.address().port}/article`,
    close: () => new Promise((resolve) => server.close(resolve)),
  }
}

async function unusedPort() {
  const server = createNetServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise((resolve) => server.close(resolve))
  return port
}

export async function killDistribution(instance) {
  if (instance.child.exitCode !== null) return
  const cleanup = spawn('taskkill.exe', ['/PID', String(instance.child.pid), '/T', '/F'], {
    windowsHide: true,
    stdio: 'ignore',
  })
  await new Promise((resolve) => cleanup.once('exit', resolve))
  await instance.browser?.close().catch(() => {})
}

export async function launchDistribution(executable, directory) {
  const port = await unusedPort()
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) =>
        !['ELECTRON_RUN_AS_NODE', 'MINDNOTES_START_WORKSPACE', 'MINDNOTES_EXECUTABLE'].includes(key)
    )
  )
  const child = spawn(executable, [`--remote-debugging-port=${port}`], {
    env: { ...env, MINDNOTES_USER_DATA_DIR: directory },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', (data) => {
    output += data
  })
  child.stderr.on('data', (data) => {
    output += data
  })
  const exited = new Promise((resolve, reject) => {
    child.once('exit', resolve)
    child.once('error', reject)
  })
  void exited.catch(() => {})
  const instance = { child, exited }
  try {
    await expect
      .poll(
        async () => {
          if (child.exitCode !== null)
            throw new Error(`Distribution exited ${child.exitCode}: ${output}`)
          return fetch(`http://127.0.0.1:${port}/json/version`)
            .then((response) => response.ok)
            .catch(() => false)
        },
        { timeout: 45_000 }
      )
      .toBe(true)
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 15_000 })
    Object.assign(instance, { browser })
    const context = browser.contexts()[0]
    await expect
      .poll(() => context.pages().filter((page) => page.url().includes('surface=')).length)
      .toBe(2)
    const toolbar = context.pages().find((page) => page.url().includes('surface=toolbar'))
    const overlay = context.pages().find((page) => page.url().includes('surface=screen'))
    await expect(toolbar.locator('button').first()).toBeVisible()
    if (await toolbar.getByRole('button', { name: '展开悬浮批注' }).count())
      await toolbar.getByRole('button', { name: '展开悬浮批注' }).click()
    await expect(toolbar.getByRole('toolbar', { name: '悬浮批注工具条' })).toBeVisible()
    Object.assign(instance, { context, toolbar, overlay, directory, executable })
    console.log(JSON.stringify({ stage: 'launched', executable, pid: child.pid, directory }))
    return instance
  } catch (error) {
    await killDistribution(instance)
    throw error
  }
}

export async function openLibrary(instance, legacy = false) {
  if (await instance.toolbar.getByRole('button', { name: '展开悬浮批注' }).count())
    await instance.toolbar.getByRole('button', { name: '展开悬浮批注' }).click()
  const more = instance.toolbar.getByRole('button', { name: '更多操作' })
  if ((await more.count()) && (await more.getAttribute('aria-expanded')) !== 'true')
    await more.click()
  await instance.toolbar.getByRole('button', { name: '我的笔记', exact: true }).click()
  await expect
    .poll(() =>
      instance.context
        .pages()
        .some((page) => page.url().startsWith('file:') && !page.url().includes('surface='))
    )
    .toBe(true)
  const shell = instance.context
    .pages()
    .find((page) => page.url().startsWith('file:') && !page.url().includes('surface='))
  if (legacy) await expect(shell.getByRole('heading', { name: /在网页上/ })).toBeVisible()
  else await expect(shell.getByRole('region', { name: '统一笔记库' })).toBeVisible()
  instance.shell = shell
  return shell
}

export async function openArticle(instance, url) {
  await instance.shell.getByRole('textbox', { name: '要批注的网页地址' }).fill(url)
  await instance.shell.getByRole('button', { name: '打开网页', exact: true }).click()
  await expect.poll(() => instance.context.pages().some((page) => page.url() === url)).toBe(true)
  const webpage = instance.context.pages().find((page) => page.url() === url)
  await expect(webpage.locator('#target')).toBeVisible()
  await expect(webpage.locator('#mindnotes-page-layer')).toBeAttached()
  return webpage
}

export async function createExcerpt(instance, webpage, comment) {
  await webpage.evaluate(() => {
    const range = document.createRange()
    range.selectNodeContents(document.getElementById('target'))
    const selection = window.getSelection()
    selection.removeAllRanges()
    selection.addRange(range)
  })
  await instance.shell.getByRole('button', { name: '摘录', exact: true }).click()
  await instance.shell.getByRole('textbox', { name: '第 1 条批注的笔记' }).fill(comment)
  await expect(instance.shell.getByRole('status', { name: '笔记保存状态' })).toContainText(
    '已保存在本地'
  )
}

export async function closeDistribution(instance) {
  if (
    instance.shell &&
    (await instance.shell.getByRole('button', { name: '悬浮批注', exact: true }).count())
  ) {
    // DOM visibility does not reflect a hidden native Electron window. Await the
    // same command used by the return button before expanding its suspended bubble.
    await instance.shell.evaluate(async () => {
      await window.mindnotesNotebook?.flushEdits()
      await window.mindnotes.command('floating')
    })
  }
  await expect(instance.toolbar.locator('button').first()).toBeVisible()
  if (await instance.toolbar.getByRole('button', { name: '展开悬浮批注' }).count())
    await instance.toolbar.getByRole('button', { name: '展开悬浮批注' }).click()
  await expect(instance.toolbar.getByRole('toolbar', { name: '悬浮批注工具条' })).toBeVisible()
  const more = instance.toolbar.getByRole('button', { name: '更多操作' })
  if ((await more.count()) && (await more.getAttribute('aria-expanded')) !== 'true')
    await more.click()
  await instance.toolbar.getByRole('button', { name: '退出 MindNotes Pro' }).click()
  const code = await Promise.race([
    instance.exited,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Distribution did not exit normally')), 15_000).unref()
    ),
  ])
  if (code !== 0) throw new Error(`Distribution exited ${code}`)
  await instance.browser.close().catch(() => {})
}

export async function seedEditableScreen(directory, title = '发行版编辑样本') {
  // A generated blue PNG is a storage fixture, never evidence of desktop capture.
  const image = new PNG({ width: 320, height: 200 })
  for (let index = 0; index < image.data.length; index += 4) {
    image.data[index] = 25
    image.data[index + 1] = 87
    image.data[index + 2] = 147
    image.data[index + 3] = 255
  }
  const png = PNG.sync.write(image)
  const repository = new ScreenNotebookRepository(directory)
  try {
    await repository.load()
    await repository.create(
      {
        id: 'distribution_note',
        title,
        comment: '',
        source: { app: '测试样本', title: '发行版编辑验收', display: '样本' },
        width: 1000,
        height: 625,
        strokes: [
          {
            id: 'distribution_ink',
            tool: 'pen',
            color: '#e05d52',
            width: 4,
            points: [
              { x: 100, y: 160 },
              { x: 280, y: 170 },
            ],
          },
        ],
        createdAt: 1,
        updatedAt: 1,
        revision: 1,
        trashedAt: null,
      },
      png,
      `data:image/png;base64,${png.toString('base64')}`
    )
  } finally {
    await repository.close()
  }
}

export async function drawLive(instance) {
  await instance.toolbar.getByRole('button', { name: '画笔', exact: true }).click()
  await instance.overlay.mouse.move(160, 180)
  await instance.overlay.mouse.down()
  await instance.overlay.mouse.move(380, 190, { steps: 12 })
  await instance.overlay.mouse.up()
  await expect(instance.overlay.locator('[data-stroke-id]')).toHaveCount(1)
  await expect
    .poll(() =>
      instance.toolbar.evaluate(() =>
        window.mindnotesFloating.getState().then((state) => state.saveState)
      )
    )
    .toBe('saved')
}

export async function editScreen(instance, title, comment) {
  await instance.shell.getByRole('button', { name: /^打开屏幕笔记/ }).click()
  await instance.shell.getByRole('textbox', { name: '屏幕笔记标题' }).fill(title)
  await instance.shell.getByRole('textbox', { name: '屏幕笔记结论' }).fill(comment)
  const stage = await instance.shell.locator('.screen-note-stage svg').boundingBox()
  await instance.shell.mouse.move(stage.x + 50, stage.y + 60)
  await instance.shell.mouse.down()
  await instance.shell.mouse.move(stage.x + 140, stage.y + 75, { steps: 8 })
  await instance.shell.mouse.up()
  await expect(instance.shell.locator('[data-stroke-id]')).toHaveCount(2)
  await instance.shell.getByRole('button', { name: '返回笔记' }).click()
}

export async function verifyRecovery(instance, { title, screenComment, pageComment }) {
  await expect(instance.overlay.locator('[data-stroke-id]')).toHaveCount(1)
  await openLibrary(instance)
  await instance.shell.getByRole('textbox', { name: '搜索全部笔记' }).fill(screenComment)
  await instance.shell.getByRole('button', { name: `打开屏幕笔记 ${title}`, exact: true }).click()
  await expect(instance.shell.getByRole('textbox', { name: '屏幕笔记结论' })).toHaveValue(
    screenComment
  )
  await expect(instance.shell.locator('[data-stroke-id]')).toHaveCount(2)
  await instance.shell.getByRole('button', { name: '返回笔记' }).click()
  await instance.shell.getByRole('textbox', { name: '搜索全部笔记' }).fill(pageComment)
  await instance.shell.getByRole('button', { name: /^打开网页笔记/ }).click()
  await expect(instance.shell.getByRole('textbox', { name: '第 1 条批注的笔记' })).toHaveValue(
    pageComment
  )
}

export async function persistedData(directory) {
  const connection = new DatabaseSync(path.join(directory, 'screen-notes.sqlite'), {
    readOnly: true,
  })
  try {
    return {
      page: JSON.parse(await readFile(path.join(directory, 'page-notes.json'), 'utf8')),
      note: JSON.parse(
        String(
          connection.prepare("SELECT document FROM notes WHERE id='distribution_note'").get()
            .document
        )
      ),
      drafts: connection
        .prepare('SELECT document FROM drafts')
        .all()
        .map((row) => JSON.parse(String(row.document))),
    }
  } finally {
    connection.close()
  }
}

async function portable() {
  const version = JSON.parse(await readFile('package.json', 'utf8')).version
  const executable = path.resolve(`release/MindNotes-Pro-${version}-Portable-x64.exe`)
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-portable-release-'))
  const fixture = await startFixture()
  const expected = {
    title: '便携版复盘',
    screenComment: '便携版结论与可编辑笔迹必须恢复。',
    pageComment: '便携版退出后保留网页摘录与想法。',
  }
  let instance
  try {
    await seedEditableScreen(directory)
    instance = await launchDistribution(executable, directory)
    await drawLive(instance)
    await instance.toolbar.getByRole('button', { name: '橡皮', exact: true }).click()
    await instance.overlay.mouse.move(270, 120)
    await instance.overlay.mouse.down()
    await instance.overlay.mouse.move(270, 250)
    await instance.overlay.mouse.up()
    await expect(instance.overlay.locator('[data-stroke-id]')).toHaveCount(0)
    await instance.toolbar.getByRole('button', { name: '撤销屏幕批注' }).click()
    await expect(instance.overlay.locator('[data-stroke-id]')).toHaveCount(1)
    await openLibrary(instance)
    await editScreen(instance, expected.title, expected.screenComment)
    const webpage = await openArticle(instance, fixture.url)
    await createExcerpt(instance, webpage, expected.pageComment)
    await closeDistribution(instance)
    instance = null
    const data = await persistedData(directory)
    expect(data.note.comment).toBe(expected.screenComment)
    expect(data.note.strokes).toHaveLength(2)
    expect(data.drafts.some((draft) => draft.strokes.length === 1)).toBe(true)
    expect(data.page.pages[0].annotations[0].comment).toBe(expected.pageComment)
    instance = await launchDistribution(executable, directory)
    await verifyRecovery(instance, expected)
    await closeDistribution(instance)
    instance = null
    const result = {
      status: 'passed',
      version,
      executable,
      directory,
      screenFixture: 'generated PNG; desktop capture not exercised',
      checks: [
        'actual-portable-extraction-launch',
        'screen-ink-and-erase',
        'undo',
        'automatic-draft-save',
        'screen-note-edit',
        'real-webpage-excerpt-comment',
        'normal-exit',
        'draft-restart-recovery',
        'unified-search',
        'both-note-types-restart-recovery',
      ],
    }
    await mkdir('tmp/qa', { recursive: true })
    await writeFile(
      `tmp/qa/portable-${version.replace(/^6\.0\.0-beta\./, 'beta')}-release.json`,
      JSON.stringify(result, null, 2)
    )
    console.log(JSON.stringify(result))
  } finally {
    if (instance) await closeDistribution(instance).catch(() => killDistribution(instance))
    await fixture.close()
  }
}

if (process.argv[2] === 'portable') await portable()
