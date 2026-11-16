import { expect } from '@playwright/test'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import {
  startFixture,
  launchDistribution,
  openLibrary,
  openArticle,
  createExcerpt,
  closeDistribution,
  killDistribution,
  seedEditableScreen,
  drawLive,
  editScreen,
  verifyRecovery,
  persistedData,
} from './distribution-smoke.mjs'

const execute = promisify(execFile)
const version = JSON.parse(await readFile('package.json', 'utf8')).version
const releaseLabel = version.replace(/^6\.0\.0-beta\./, 'beta')
const installDirectory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-install-acceptance-'))
const directory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-upgrade-notes-'))
const runner = path.resolve('e2e/acceptance/installer-action.ps1')
const oldInstaller = path.resolve('release/MindNotes-Pro-6.0.0-beta.2-Setup-x64.exe')
const newInstaller = path.resolve(`release/MindNotes-Pro-${version}-Setup-x64.exe`)
const installedExecutable = path.join(installDirectory, 'MindNotes Pro.exe')
const desktopShortcut = path.join(os.homedir(), 'Desktop', 'MindNotes Pro.lnk')
const menuShortcut = path.join(
  process.env.APPDATA,
  'Microsoft',
  'Windows',
  'Start Menu',
  'Programs',
  'MindNotes Pro.lnk'
)
const normalData = path.join(process.env.APPDATA, 'mindnotes-pro')
const stages = []
let instance
let installed = false
const fixture = await startFixture()
const expected = {
  title: '升级验证复盘',
  screenComment: '新版本的屏幕结论与笔迹在重装后继续可用。',
  pageComment: '旧版本中真实创建的网页摘录，升级后必须保留。',
}
const registryScript =
  "$ErrorActionPreference='Stop'; @((Get-ChildItem -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall','HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall' -ErrorAction SilentlyContinue | Get-ItemProperty | Where-Object DisplayName -like '*MindNotes*' | Select-Object DisplayName,DisplayVersion,InstallLocation,UninstallString,PSPath)) | ConvertTo-Json -Compress"
async function registry() {
  const result = await execute(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-File',
      path.resolve('e2e/acceptance/installer-registry.ps1'),
    ],
    { windowsHide: true }
  )
  if (!result.stdout.trim()) return []
  const records = JSON.parse(result.stdout)
  return Array.isArray(records) ? records : [records]
}
async function exists(file) {
  return stat(file)
    .then(() => true)
    .catch(() => false)
}
async function userHashes() {
  const result = {}
  for (const name of [
    'page-notes.json',
    'page-notes.json.previous',
    'screen-notes.sqlite',
    'screen-notes.sqlite-wal',
    'screen-notes.sqlite-shm',
  ])
    result[name] = await readFile(path.join(normalData, name))
      .then((bytes) => createHash('sha256').update(bytes).digest('hex'))
      .catch((error) => {
        if (error.code === 'ENOENT') return null
        throw error
      })
  return result
}
async function action(operation, executable) {
  const result = await execute(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-File',
      runner,
      '-Action',
      operation,
      '-Executable',
      executable,
      '-InstallDirectory',
      installDirectory,
    ],
    { windowsHide: true, timeout: 180_000 }
  )
  console.log(result.stdout.trim())
}
async function install(executable, version) {
  await action('install', executable)
  installed = true
  await expect.poll(() => exists(installedExecutable), { timeout: 30_000 }).toBe(true)
  const records = await registry()
  expect(records).toHaveLength(1)
  expect(records[0].DisplayVersion).toBe(version)
  const uninstallPath = records[0].UninstallString.match(/^"([^"]+)"/)[1]
  expect(path.dirname(uninstallPath).toLowerCase()).toBe(installDirectory.toLowerCase())
  expect(await exists(desktopShortcut)).toBe(true)
  expect(await exists(menuShortcut)).toBe(true)
  // Read the PE metadata through a parameter, preserving paths with spaces.
  const metadata = await execute(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `& { param([string]$exe) $item=Get-Item -LiteralPath $exe; @{version=$item.VersionInfo.ProductVersion;name=$item.VersionInfo.ProductName} | ConvertTo-Json -Compress } '${installedExecutable.replace(/'/g, "''")}'`,
    ],
    { windowsHide: true }
  )
  const peMetadata = JSON.parse(metadata.stdout)
  expect(peMetadata.version.startsWith('6.0.0')).toBe(true)
  const stage = {
    stage: 'installed',
    version,
    installDirectory,
    registry: records[0],
    peMetadata,
    shortcuts: true,
  }
  stages.push(stage)
  console.log(JSON.stringify(stage))
}
async function uninstall() {
  const uninstaller = path.join(installDirectory, 'Uninstall MindNotes Pro.exe')
  await action('uninstall', uninstaller)
  await expect.poll(async () => (await registry()).length, { timeout: 30_000 }).toBe(0)
  await expect.poll(() => exists(installedExecutable), { timeout: 30_000 }).toBe(false)
  await expect.poll(() => exists(desktopShortcut)).toBe(false)
  await expect.poll(() => exists(menuShortcut)).toBe(false)
  installed = false
  stages.push({ stage: 'uninstalled', registryAndShortcutsRemoved: true })
}
const originalHashes = await userHashes()
try {
  if ((await registry()).length || (await exists(desktopShortcut)) || (await exists(menuShortcut)))
    throw new Error(
      'An existing MindNotes installation/shortcut must be preserved; isolated lifecycle test stopped.'
    )
  await install(oldInstaller, '6.0.0-beta.2')
  instance = await launchDistribution(installedExecutable, directory)
  await openLibrary(instance, true)
  let webpage = await openArticle(instance, fixture.url)
  await createExcerpt(instance, webpage, expected.pageComment)
  await closeDistribution(instance)
  instance = null
  const oldNotes = JSON.parse(await readFile(path.join(directory, 'page-notes.json'), 'utf8'))
  expect(oldNotes.pages[0].annotations[0].comment).toBe(expected.pageComment)
  stages.push({ stage: 'old-notes-created', version: '6.0.0-beta.2', actualWebpage: true })

  await install(newInstaller, version)
  await seedEditableScreen(directory)
  instance = await launchDistribution(installedExecutable, directory)
  await drawLive(instance)
  await openLibrary(instance)
  await expect(instance.shell.getByRole('button', { name: /^打开网页笔记/ })).toHaveCount(1)
  await instance.shell.getByRole('button', { name: /^打开网页笔记/ }).click()
  await expect(instance.shell.getByRole('textbox', { name: '第 1 条批注的笔记' })).toHaveValue(
    expected.pageComment
  )
  await instance.shell.getByRole('button', { name: 'MindNotes Pro 我的笔记' }).click()
  await editScreen(instance, expected.title, expected.screenComment)
  await closeDistribution(instance)
  instance = null
  stages.push({
    stage: 'upgrade-preserved-data',
    oldWebpageRecovered: true,
    newScreenNoteAndDraftSaved: true,
  })
  const beforeReinstall = await persistedData(directory)

  await install(newInstaller, version)
  instance = await launchDistribution(installedExecutable, directory)
  await verifyRecovery(instance, expected)
  await closeDistribution(instance)
  instance = null
  stages.push({
    stage: 'reinstall-preserved-both-types',
    editableScreenStrokes: 2,
    recoveredScreenDraft: true,
  })
  await uninstall()
  const afterUninstall = await persistedData(directory)
  expect(afterUninstall.note).toEqual(beforeReinstall.note)
  expect(afterUninstall.page.pages[0].annotations[0].comment).toBe(expected.pageComment)
  expect(afterUninstall.drafts.some((draft) => draft.strokes.length === 1)).toBe(true)
  expect(await userHashes()).toEqual(originalHashes)
  stages.push({
    stage: 'uninstall-preserved-user-data',
    isolatedNotesIntact: true,
    normalUserDataHashesUnchanged: true,
  })

  await install(newInstaller, version)
  instance = await launchDistribution(installedExecutable, directory)
  await verifyRecovery(instance, expected)
  await closeDistribution(instance)
  instance = null
  await uninstall()
  expect(await userHashes()).toEqual(originalHashes)
  stages.push({
    stage: 'reinstall-after-uninstall-recovers-notes',
    bothTypes: true,
    finalInstallationRemoved: true,
  })
  const result = {
    status: 'passed',
    version,
    installDirectory,
    directory,
    screenFixture: 'generated PNG; underlying desktop capture not exercised',
    stages,
  }
  await mkdir('tmp/qa', { recursive: true })
  await writeFile(`tmp/qa/installer-${releaseLabel}-release.json`, JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
} finally {
  if (instance) await closeDistribution(instance).catch(() => killDistribution(instance))
  if (installed)
    await uninstall().catch((error) =>
      console.error('Test installation cleanup needs attention:', error)
    )
  await fixture.close()
}
