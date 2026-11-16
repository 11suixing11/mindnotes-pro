import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { PNG } from 'pngjs'
import {
  launchIsolated,
  withDesktopWorkspace,
  prepareFixture,
  openLibrary,
  measureGesture,
  currentDisplay,
} from '../../benchmark/local/electron-harness.mjs'
import type { DesktopSession } from '../../benchmark/local/electron-harness.mjs'
import type { ScreenNote } from '../../src/notes/screenNotebook'
import type { PageNotebook } from '../../src/notes/model'

// The ordinary desktop config has a broad glob. Only the explicit offline wrapper registers these journeys.
const offlineEnabled = process.env.MINDNOTES_BASELINE_ALLOW_VISIBLE === '1'
if (offlineEnabled)
  test.beforeAll(() => {
    expect(process.env.MINDNOTES_BASELINE_ALLOW_VISIBLE, 'Use the explicit offline wrapper').toBe(
      '1'
    )
    expect(process.platform, 'Native offline suite requires its target Windows environment').toBe(
      'win32'
    )
  })

async function launch(directory: string) {
  const session = await launchIsolated({
    directory,
    executable: process.env.MINDNOTES_BASELINE_EXECUTABLE,
    allowVisible: process.env.MINDNOTES_BASELINE_ALLOW_VISIBLE === '1',
    offline: true,
  })
  try {
    expect(session.offlineEvidence?.directControl).toBe(true)
    expect(session.offlineEvidence?.directApplicationHits).toBe(0)
    expect(session.offlineEvidence?.defaultControl.response).toBe(503)
    expect(session.offlineEvidence?.pageControl.response).toBe(503)
    expect(session.offlineEvidence?.pageControl.partition).toBe('persist:mindnotes-pages')
    const controls = [
      session.offlineEvidence!.defaultControl,
      session.offlineEvidence!.lazyNavigation,
      session.offlineEvidence!.pageControl,
    ]
    expect(new Set(controls.map((control) => control.target)).size).toBe(3)
    for (const control of controls)
      expect(
        control.proxyRequests.some(
          (request) =>
            request.method === 'GET' && request.url === control.target && request.status === 503
        )
      ).toBe(true)
    expect(session.offlineEvidence?.proxyRequests.length).toBeGreaterThanOrEqual(3)
    return session
  } catch (error) {
    await session.close()
    throw error
  }
}

async function closeSessions(sessions: Set<DesktopSession>) {
  const results = await Promise.allSettled([...sessions].map((session) => session.close()))
  if (results.some((result) => result.status === 'rejected'))
    throw new Error('Offline app cleanup failed.')
}

async function savedPage(shell: Page, url: string, comment: string) {
  await shell.evaluate(() => window.mindnotesNotebook!.flushEdits())
  await expect
    .poll(async () => {
      const state = await shell.evaluate(() => window.mindnotes!.getState())
      return {
        comment: state.pages.find((page) => page.url === url)?.annotations[0]?.comment,
        saved: state.saveState,
      }
    })
    .toEqual({ comment, saved: 'saved' })
}

async function saveDialog(session: DesktopSession, filePath: string) {
  await session.app.evaluate(({ dialog }, target) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: target })
  }, filePath)
}

async function openDialog(session: DesktopSession, filePath: string) {
  await session.app.evaluate(({ dialog }, target) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [target] })
  }, filePath)
}

if (offlineEnabled)
  test('generated screen/page notes stay editable offline, survive restart, and restore into an empty directory', async () => {
    await withDesktopWorkspace(async (directory) => {
      const original = path.join(directory, 'original')
      const fixture = await prepareFixture(original, 100)
      const sessions = new Set<DesktopSession>()
      const own = async (data: string) => {
        const session = await launch(data)
        sessions.add(session)
        return session
      }
      try {
        const session = await own(original)
        const shell = await openLibrary(session)
        const search = shell.getByRole('textbox', { name: '搜索全部笔记' })
        await search.fill('Baseline screen note 0')
        await shell
          .getByRole('button', { name: '打开屏幕笔记 Baseline screen note 0', exact: true })
          .click()
        await expect(shell.getByRole('region', { name: '屏幕笔记编辑器' })).toBeVisible()
        await shell.getByRole('textbox', { name: '屏幕笔记标题' }).fill('Offline edited screen')
        await shell
          .getByRole('textbox', { name: '屏幕笔记结论' })
          .fill('Offline durable screen comment')
        await shell.evaluate(() => window.mindnotesNotebook!.flushEdits())
        const screen = await shell.evaluate(() =>
          window.mindnotesNotebook!.getNote('fixture-screen-0')
        )
        expect(screen.title).toBe('Offline edited screen')
        expect(screen.comment).toBe('Offline durable screen comment')
        expect(screen.revision).toBeGreaterThan(fixture.entries[0].note.revision)
        expect(screen.strokes).toEqual(fixture.entries[0].note.strokes)
        await expect(shell.getByRole('status', { name: '屏幕笔记保存状态' })).toContainText(
          '已保存'
        )
        await shell.getByRole('button', { name: '返回笔记', exact: true }).click()
        await search.fill('Baseline article 0')
        await shell
          .getByRole('button', { name: '打开网页笔记 Baseline article 0', exact: true })
          .click()
        await shell
          .getByRole('textbox', { name: '第 1 条批注的笔记' })
          .fill('Offline durable page comment')
        await savedPage(shell, fixture.pages[0].url, 'Offline durable page comment')
        await shell.evaluate(() => window.mindnotes!.navigate('https://baseline.invalid/blocked'))
        await expect(
          shell.getByText('网页暂时无法打开，请检查地址或网络后重试。', { exact: true })
        ).toBeVisible()
        await shell.evaluate(() => window.mindnotes!.command('home'))
        await expect(shell.getByRole('region', { name: '统一笔记库' })).toBeVisible()
        await savedPage(shell, fixture.pages[0].url, 'Offline durable page comment')
        expect((await shell.evaluate(() => window.mindnotesNotebook!.list())).total).toBe(100)

        // This command also awaits page workspace.flush, independently of the editor IPC queue.
        await shell.evaluate(() => window.mindnotes!.command('floating'))
        const gesture = await measureGesture(session)
        expect(gesture.stroke.points).toHaveLength(24)
        await session.toolbar.evaluate(() => window.mindnotesFloating!.command('undo'))
        await expect
          .poll(() =>
            session.overlay.evaluate(async () => (await window.mindnotesScreen!.getState()).strokes)
          )
          .toEqual([])
        await session.toolbar.evaluate(() => window.mindnotesFloating!.command('redo'))
        await expect
          .poll(() =>
            session.overlay.evaluate(async () => (await window.mindnotesScreen!.getState()).strokes)
          )
          .toEqual([gesture.stroke])
        await expect
          .poll(() =>
            session.toolbar.evaluate(
              async () => (await window.mindnotesFloating!.getState()).saveState
            )
          )
          .toBe('saved')

        const draftFile = path.join(directory, 'draft-backup.json')
        await saveDialog(session, draftFile)
        await session.toolbar.evaluate(() => window.mindnotesFloating!.command('export-draft'))
        const draftBackup = JSON.parse(await readFile(draftFile, 'utf8')) as {
          drafts: { strokes: (typeof gesture.stroke)[] }[]
        }
        expect(draftBackup.drafts).toHaveLength(1)
        expect(draftBackup.drafts[0].strokes).toEqual([gesture.stroke])
        await session.close()

        const restarted = await own(original)
        await expect
          .poll(() =>
            restarted.overlay.evaluate(
              async () => (await window.mindnotesScreen!.getState()).strokes
            )
          )
          .toEqual([gesture.stroke])
        const restartedShell = await openLibrary(restarted)
        expect(
          await restartedShell.evaluate(() => window.mindnotesNotebook!.getNote('fixture-screen-0'))
        ).toEqual(screen)
        await savedPage(restartedShell, fixture.pages[0].url, 'Offline durable page comment')
        const pages = (await restartedShell.evaluate(() => window.mindnotes!.getState())).pages
        expect(pages).toHaveLength(fixture.pages.length)
        const screenFile = path.join(directory, 'screen-backup.json'),
          pageFile = path.join(directory, 'page-backup.json')
        await saveDialog(restarted, screenFile)
        expect(await restartedShell.evaluate(() => window.mindnotesNotebook!.exportAll())).toBe(
          screenFile
        )
        await saveDialog(restarted, pageFile)
        expect(
          await restartedShell.evaluate(() => window.mindnotes!.exportNotes('json', 'all'))
        ).toBe(pageFile)
        const exported = JSON.parse(await readFile(screenFile, 'utf8')) as {
          notes: { note: ScreenNote; image: string }[]
        }
        const exportedPages = JSON.parse(await readFile(pageFile, 'utf8')) as {
          pages: PageNotebook[]
        }
        expect(exported.notes).toHaveLength(100)
        expect(exported.notes.find((entry) => entry.note.id === screen.id)?.note).toEqual(screen)
        expect(
          Buffer.from(exported.notes.find((entry) => entry.note.id === screen.id)!.image, 'base64')
        ).toEqual(Buffer.from(fixture.entries[0].png))
        expect(exportedPages.pages).toEqual(pages)
        await restarted.close()

        const recovery = path.join(directory, 'recovery-empty')
        await mkdir(recovery)
        const restored = await own(recovery)
        const restoredShell = await openLibrary(restored)
        expect((await restoredShell.evaluate(() => window.mindnotesNotebook!.list())).total).toBe(0)
        expect((await restoredShell.evaluate(() => window.mindnotes!.getState())).pages).toEqual([])
        await openDialog(restored, screenFile)
        expect(await restoredShell.evaluate(() => window.mindnotesNotebook!.importBackup())).toBe(
          100
        )
        await restoredShell.getByLabel('导入笔记文件').setInputFiles(pageFile)
        await savedPage(restoredShell, fixture.pages[0].url, 'Offline durable page comment')
        expect((await restoredShell.evaluate(() => window.mindnotesNotebook!.list())).total).toBe(
          100
        )
        expect(
          await restoredShell.evaluate(() => window.mindnotesNotebook!.getNote('fixture-screen-0'))
        ).toEqual(screen)
        expect((await restoredShell.evaluate(() => window.mindnotes!.getState())).pages).toEqual(
          pages
        )
        expect(
          await restoredShell.evaluate(() => window.mindnotesNotebook!.getImage('fixture-screen-0'))
        ).toBe(`data:image/png;base64,${Buffer.from(fixture.entries[0].png).toString('base64')}`)
        await restoredShell.evaluate(() => window.mindnotes!.command('floating'))
        await openDialog(restored, draftFile)
        await restored.toolbar.evaluate(() => window.mindnotesFloating!.command('import-draft'))
        await expect
          .poll(() =>
            restored.overlay.evaluate(
              async () => (await window.mindnotesScreen!.getState()).strokes
            )
          )
          .toEqual([gesture.stroke])
        await expect
          .poll(() =>
            restored.toolbar.evaluate(
              async () => (await window.mindnotesFloating!.getState()).saveState
            )
          )
          .toBe('saved')
        await restored.close()
        const recoveredRestart = await own(recovery)
        expect(
          (await recoveredRestart.overlay.evaluate(() => window.mindnotesScreen!.getState()))
            .strokes
        ).toEqual([gesture.stroke])
        const recoveredShell = await openLibrary(recoveredRestart)
        expect(
          await recoveredShell.evaluate(() => window.mindnotesNotebook!.getNote('fixture-screen-0'))
        ).toEqual(screen)
        await savedPage(recoveredShell, fixture.pages[0].url, 'Offline durable page comment')
      } finally {
        await closeSessions(sessions)
      }
    })
  })

if (offlineEnabled)
  test('offline Windows capture saves pixels from the existing native desktop fixture', async () => {
    await withDesktopWorkspace(async (directory) => {
      const data = path.join(directory, 'capture-data')
      await mkdir(data)
      const session = await launch(data)
      let child: ReturnType<typeof spawn> | undefined
      let exited: Promise<number | null> | undefined
      const stateFile = path.join(directory, 'capture-state.txt')
      try {
        const display = await currentDisplay(session)
        const physical = await session.app.evaluate(
          ({ screen }, bounds) => screen.dipToScreenRect(null, bounds),
          display.bounds
        )
        const shell = await openLibrary(session)
        await shell.evaluate(() => window.mindnotes!.command('floating'))
        await measureGesture(session)
        // Reuse the repository's real PowerShell/Win32 fixture; own the child here so failed setup also closes it.
        child = spawn(
          'powershell.exe',
          [
            '-NoProfile',
            '-NonInteractive',
            '-File',
            path.resolve('e2e/desktop/desktop-fixture.ps1'),
            '-StatePath',
            stateFile,
            '-Left',
            String(physical.x),
            '-Top',
            String(physical.y),
            '-Width',
            String(physical.width),
            '-Height',
            String(physical.height),
          ],
          {
            windowsHide: true,
            stdio: 'ignore',
            env: { ...process.env, TEMP: directory, TMP: directory, TMPDIR: directory },
          }
        )
        exited = new Promise<number | null>((resolve, reject) => {
          child!.once('exit', resolve)
          child!.once('error', reject)
        })
        void exited.catch(() => {})
        await expect
          .poll(async () => {
            if (child!.exitCode !== null)
              throw new Error('Native capture fixture exited during setup.')
            return readFile(`${stateFile}.ready`, 'utf8').catch(() => '')
          })
          .toBe('A')
        await session.toolbar.evaluate(() => window.mindnotesFloating!.command('save'))
        const library = await openLibrary(session)
        await expect
          .poll(async () => (await library.evaluate(() => window.mindnotesNotebook!.list())).total)
          .toBe(1)
        const id = (await library.evaluate(() => window.mindnotesNotebook!.list())).notes[0].id
        const captured = await library.evaluate(
          (noteId) => window.mindnotesNotebook!.getNote(noteId),
          id
        )
        const image = await library.evaluate(
          (noteId) => window.mindnotesNotebook!.getImage(noteId),
          id
        )
        expect(captured.source.title).toBe('MindNotes capture fixture A')
        expect(captured.source.app.toLowerCase()).toBe('powershell')
        expect(captured.strokes).toHaveLength(1)
        const png = PNG.sync.read(
          Buffer.from(image.slice('data:image/png;base64,'.length), 'base64')
        )
        const pixel = (Math.floor(png.height / 2) * png.width + Math.floor(png.width / 2)) * 4
        for (const [index, expected] of [25, 87, 147].entries())
          expect(Math.abs(png.data[pixel + index] - expected)).toBeLessThanOrEqual(3)
        expect(png.data[pixel + 3]).toBe(255)
      } finally {
        try {
          if (child && exited) {
            let timer: ReturnType<typeof setTimeout> | undefined
            try {
              await writeFile(stateFile, 'exit')
              const code = await Promise.race([
                exited,
                new Promise<never>((_resolve, reject) => {
                  timer = setTimeout(() => {
                    child!.kill('SIGKILL')
                    reject(new Error('Native capture fixture close timed out.'))
                  }, 10_000)
                }),
              ])
              expect(code).toBe(0)
            } finally {
              if (timer) clearTimeout(timer)
              if (child.exitCode === null) {
                child.kill('SIGKILL')
                await exited.catch(() => {})
              }
            }
          }
        } finally {
          await session.close()
        }
      }
    })
  })
