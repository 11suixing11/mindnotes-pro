import { _electron as electron, expect, test } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { PNG } from 'pngjs'

async function launch(): Promise<{ app: ElectronApplication; shell: Page; directory: string }> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-library-recovery-'))
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value
  }
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
  await expect(shell.getByText('点击悬浮条“保存笔记”，或打开网页开始记录。')).toBeVisible()
  return { app, shell, directory }
}

async function importNotes(
  app: ElectronApplication,
  shell: Page,
  directory: string,
  count: number
) {
  const image = new PNG({ width: 32, height: 20 })
  for (let index = 0; index < image.data.length; index += 4) {
    image.data[index] = 22
    image.data[index + 1] = 88
    image.data[index + 2] = 143
    image.data[index + 3] = 255
  }
  const png = PNG.sync.write(image).toString('base64')
  const notes = Array.from({ length: count }, (_, index) => ({
    note: {
      id: `library_fixture_${index}`,
      title: `分页笔记 ${index}`,
      comment: '由隔离测试生成的可编辑笔记',
      source: { app: 'Generated library fixture', title: 'Library recovery', display: 'Fixture' },
      width: 32,
      height: 20,
      strokes: [],
      createdAt: 1,
      updatedAt: index + 1,
      revision: 1,
      trashedAt: null,
    },
    image: png,
  }))
  const file = path.join(directory, 'library-fixture.json')
  await writeFile(file, JSON.stringify({ format: 'mindnotes-pro.screen-notes', version: 1, notes }))
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] })
  }, file)
  await shell.getByText('备份与恢复', { exact: true }).click()
  await shell.getByRole('button', { name: '导入屏幕备份' }).click()
  await expect(shell.getByText(`已导入 ${count} 条笔记；较新的本地修改会保留。`)).toBeVisible()
  await expect(shell.getByRole('button', { name: /^打开屏幕笔记 / })).toHaveCount(
    Math.min(50, count)
  )
}

async function failNextRead(app: ElectronApplication) {
  await app.evaluate(({ ipcMain }) => {
    const handlers = (
      ipcMain as unknown as {
        _invokeHandlers: Map<string, (event: unknown, ...args: unknown[]) => unknown>
      }
    )._invokeHandlers
    const handler = handlers.get('notebook:list')
    if (!handler) throw new Error('Missing trusted library IPC handler')
    let fail = true
    ipcMain.removeHandler('notebook:list')
    ipcMain.handle('notebook:list', (event, ...args: unknown[]) => {
      if (fail) {
        fail = false
        throw new Error('临时读取失败，请重试。')
      }
      return handler(event, ...args)
    })
  })
}

const longStoragePath = `C:\\Users\\Reader\\AppData\\Local\\MindNotes Pro\\${'file'.repeat(45)}\\screen-notes.sqlite`

async function failNextStorage(app: ElectronApplication, channel: string, message: string) {
  await app.evaluate(
    ({ ipcMain }, { name, failure }) => {
      const handlers = (
        ipcMain as unknown as {
          _invokeHandlers: Map<string, (event: unknown, ...args: unknown[]) => unknown>
        }
      )._invokeHandlers
      const handler = handlers.get(name)
      if (!handler) throw new Error('Missing trusted storage IPC handler')
      let fail = true
      ipcMain.removeHandler(name)
      ipcMain.handle(name, (event, ...args: unknown[]) => {
        if (fail) {
          fail = false
          throw new Error(failure)
        }
        return handler(event, ...args)
      })
    },
    { name: channel, failure: message }
  )
}

async function minimumWorkspace(app: ElectronApplication) {
  await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows().find(
      (candidate) =>
        candidate.webContents.getURL().startsWith('file:') &&
        !candidate.webContents.getURL().includes('surface=')
    )
    if (!window) throw new Error('Missing note workspace')
    window.setContentSize(900, 640)
  })
}

async function expectRecoveryControlsReachable(shell: Page, names: string[]) {
  const evidence = []
  for (const name of names) {
    const button = shell.getByRole('button', { name, exact: true })
    await button.scrollIntoViewIfNeeded()
    await expect(button).toBeVisible()
    const geometry = await button.evaluate((node) => {
      const rect = node.getBoundingClientRect()
      return {
        name: node.textContent?.trim(),
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
      }
    })
    expect(geometry.width).toBeGreaterThanOrEqual(44)
    expect(geometry.height).toBeGreaterThanOrEqual(44)
    expect(geometry.x).toBeGreaterThanOrEqual(0)
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth)
    expect(geometry.y).toBeGreaterThanOrEqual(0)
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight)
    await button.click({ trial: true })
    evidence.push(geometry)
  }
  const overflow = await shell.evaluate(() => {
    const home = document.querySelector('.notes-home')!
    return { scrollWidth: home.scrollWidth, clientWidth: home.clientWidth }
  })
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
  return { controls: evidence, overflow }
}

test('library last-page trash and restore keep remaining notes reachable', async () => {
  const { app, shell, directory } = await launch()
  try {
    await importNotes(app, shell, directory, 51)
    await shell.getByRole('button', { name: '下一页' }).click()
    await expect(shell.getByRole('button', { name: /^打开屏幕笔记 / })).toHaveCount(1)
    await shell.getByRole('button', { name: '移到回收站 分页笔记 0' }).click()
    await expect(shell.getByRole('button', { name: /^打开屏幕笔记 / })).toHaveCount(50)
    await expect(shell.getByRole('button', { name: '上一页' })).toHaveCount(0)
    await expect(shell.getByText('点击悬浮条“保存笔记”，或打开网页开始记录。')).toHaveCount(0)
    await shell.getByRole('button', { name: '回收站', exact: true }).click()
    await expect(shell.getByRole('button', { name: /^打开屏幕笔记 / })).toHaveCount(1)
    await shell.getByRole('button', { name: '恢复屏幕笔记 分页笔记 0' }).click()
    await expect(shell.getByText('回收站是空的。')).toBeVisible()
    await shell.getByRole('button', { name: '全部', exact: true }).click()
    await expect(shell.getByRole('button', { name: /^打开屏幕笔记 / })).toHaveCount(50)
    await expect(shell.getByText('1–50 / 51')).toBeVisible()
    await shell.getByRole('textbox', { name: '搜索全部笔记' }).fill('分页笔记 0')
    await expect(shell.getByRole('button', { name: '打开屏幕笔记 分页笔记 0' })).toBeVisible()
    await shell.getByRole('button', { name: '打开屏幕笔记 分页笔记 0' }).click()
    await expect(shell.getByRole('textbox', { name: '屏幕笔记结论' })).toHaveValue(
      '由隔离测试生成的可编辑笔记'
    )
    await shell.getByRole('textbox', { name: '屏幕笔记结论' }).fill('恢复后继续编辑并保存。')
    await shell.getByRole('button', { name: '返回笔记', exact: true }).click()
    await shell.getByRole('button', { name: '打开屏幕笔记 分页笔记 0' }).click()
    await expect(shell.getByRole('textbox', { name: '屏幕笔记结论' })).toHaveValue(
      '恢复后继续编辑并保存。'
    )
    expect(await shell.evaluate(() => window.mindnotesNotebook!.list('', 0, false))).toMatchObject({
      total: 51,
    })
    await writeFile(
      test.info().outputPath('library-pagination-recovery.json'),
      JSON.stringify(
        {
          status: 'passed',
          notes: 51,
          lastPageTrashReturnsToValidPage: true,
          restoredNoteSearchAndEdit: true,
          generatedImageFixture: true,
        },
        null,
        2
      )
    )
  } finally {
    await app.close()
  }
})

test('library failed search offers retry and preserves the real stored notes', async () => {
  const { app, shell, directory } = await launch()
  try {
    await importNotes(app, shell, directory, 2)
    await failNextRead(app)
    await shell.getByRole('textbox', { name: '搜索全部笔记' }).fill('分页笔记 1')
    await expect(shell.getByText(/临时读取失败，请重试/)).toBeVisible()
    await expect(shell.getByRole('button', { name: /^打开屏幕笔记 / })).toHaveCount(0)
    await expect(shell.getByText('没有匹配的笔记。')).toHaveCount(0)
    await shell.getByRole('button', { name: '重试读取' }).click()
    await expect(shell.getByRole('button', { name: '打开屏幕笔记 分页笔记 1' })).toBeVisible()
    await expect(shell.getByText(/临时读取失败，请重试/)).toHaveCount(0)
    await expect(shell.getByRole('button', { name: '重试读取' })).toHaveCount(0)
    expect(await shell.evaluate(() => window.mindnotesNotebook!.list('', 0, false))).toMatchObject({
      total: 2,
    })
    expect(
      JSON.parse(await readFile(path.join(directory, 'library-fixture.json'), 'utf8')).notes
    ).toHaveLength(2)
    await writeFile(
      test.info().outputPath('library-read-recovery.json'),
      JSON.stringify(
        {
          status: 'passed',
          failure: 'One simulated rejection of the real trusted IPC handler',
          retrySucceeded: true,
          staleReadErrorCleared: true,
          storedNotesUnchanged: 2,
        },
        null,
        2
      )
    )
  } finally {
    await app.close()
  }
})

test('minimum workspace keeps library retry reachable for a long storage-path error', async () => {
  const { app, shell, directory } = await launch()
  try {
    await minimumWorkspace(app)
    await importNotes(app, shell, directory, 1)
    await failNextStorage(
      app,
      'notebook:list',
      `SQLITE_CANTOPEN: unable to open database file '${longStoragePath}'`
    )
    await shell.getByRole('textbox', { name: '搜索全部笔记' }).fill('分页笔记 0')
    await expect(shell.getByRole('alert').filter({ hasText: 'SQLITE_CANTOPEN' })).toBeVisible()
    const reachability = await expectRecoveryControlsReachable(shell, ['重试读取'])
    await shell.getByRole('button', { name: '重试读取' }).click()
    await expect(shell.getByRole('button', { name: '打开屏幕笔记 分页笔记 0' })).toBeVisible()
    await expect(shell.getByRole('alert').filter({ hasText: 'SQLITE_CANTOPEN' })).toHaveCount(0)
    await writeFile(
      test.info().outputPath('library-long-error-recovery.json'),
      JSON.stringify({ status: 'passed', simulatedStorageError: true, ...reachability }, null, 2)
    )
  } finally {
    await app.close()
  }
})

test('minimum workspace keeps screen-note recovery controls reachable after a long error', async () => {
  const { app, shell, directory } = await launch()
  try {
    await minimumWorkspace(app)
    await importNotes(app, shell, directory, 1)
    await shell.getByRole('button', { name: '打开屏幕笔记 分页笔记 0' }).click()
    await expect(shell.getByRole('textbox', { name: '屏幕笔记结论' })).toBeVisible()
    await failNextStorage(
      app,
      'notebook:update',
      `EACCES: permission denied, open '${longStoragePath}'`
    )
    await shell.getByRole('textbox', { name: '屏幕笔记结论' }).fill('当前修改在重试后继续保留。')
    await expect(shell.getByRole('status', { name: '屏幕笔记保存状态' })).toHaveText('保存失败')
    await expect(shell.getByRole('alert').filter({ hasText: 'EACCES' })).toBeVisible()
    const reachability = await expectRecoveryControlsReachable(shell, [
      '重试保存',
      '当前修改备份',
      '异常退出',
    ])
    const backupPath = path.join(directory, 'long-error-recovery.json')
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, backupPath)
    await shell.getByRole('button', { name: '当前修改备份' }).click()
    await expect(shell.getByRole('alert')).toContainText('当前修改已导出为恢复备份')
    expect(JSON.parse(await readFile(backupPath, 'utf8')).notes[0].note.comment).toBe(
      '当前修改在重试后继续保留。'
    )
    await shell.getByRole('button', { name: '重试保存' }).click()
    await expect(shell.getByRole('status', { name: '屏幕笔记保存状态' })).toHaveText('已保存')
    await shell.getByRole('button', { name: '返回笔记', exact: true }).click()
    await shell.getByRole('button', { name: '打开屏幕笔记 分页笔记 0' }).click()
    await expect(shell.getByRole('textbox', { name: '屏幕笔记结论' })).toHaveValue(
      '当前修改在重试后继续保留。'
    )
    await writeFile(
      test.info().outputPath('screen-note-long-error-recovery.json'),
      JSON.stringify({ status: 'passed', simulatedStorageError: true, ...reachability }, null, 2)
    )
  } finally {
    await app.close()
  }
})
