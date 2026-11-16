import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import linuxAfterPack, { validateAppImageCopyOrder } from './linuxAfterPack.mjs'

const require = createRequire(import.meta.url)
const { LinuxTargetHelper } = require('app-builder-lib/out/targets/LinuxTargetHelper.js')
const taskRoot = path.resolve('tmp/linux-launch-20261114/packaging-tests')

async function fixture(t, executableName = 'probe app') {
  await fs.mkdir(taskRoot, { recursive: true })
  const appOutDir = await fs.mkdtemp(path.join(taskRoot, 'app-'))
  t.after(() => fs.rm(appOutDir, { recursive: true, force: true }))
  await fs.writeFile(
    path.join(appOutDir, executableName),
    '#!/usr/bin/env bash\nprintf "%s\\0" "$LD_LIBRARY_PATH"\nfor arg in "$@"; do printf "%s\\0" "$arg"; done\nexit "${MINDNOTES_PACKAGING_PROBE_EXIT:-0}"\n',
    { mode: 0o755 }
  )
  await fs.writeFile(path.join(appOutDir, 'unshare'), '#!/usr/bin/env bash\nexit 1\n', {
    mode: 0o755,
  })
  return {
    context: { electronPlatformName: 'linux', appOutDir, packager: { executableName } },
    run(args = [], extracted = false, environment = {}, expectedStatus = 0) {
      const result = spawnSync(path.join(appOutDir, 'AppRun'), args, {
        env: {
          ...process.env,
          DISPLAY: '',
          WAYLAND_DISPLAY: '',
          XDG_SESSION_TYPE: 'x11',
          MINDNOTES_PACKAGING_PROBE_EXIT: '0',
          APPDIR: extracted ? '' : appOutDir,
          APPIMAGE: '',
          LD_LIBRARY_PATH: '/fixture-existing-library',
          PATH: `${appOutDir}:/usr/bin:/bin`,
          ...environment,
        },
        encoding: 'utf8',
        timeout: 3000,
      })
      assert.equal(result.status, expectedStatus, result.stderr || result.error?.message)
      const [libraryPath, ...argv] = result.stdout.split('\0').slice(0, -1)
      return { libraryPath, argv, status: result.status }
    },
  }
}

async function debFixture(t) {
  const owned = await fixture(t, 'mindnotes-pro')
  const packager = {
    info: { metadata: { name: 'mindnotes-pro', desktopName: 'com.mindnotes.pro.desktop' } },
    config: { appId: 'com.mindnotes.pro', productName: 'MindNotes Pro' },
    appInfo: {
      productName: 'MindNotes Pro',
      sanitizedProductName: 'MindNotes Pro',
      description: 'Local notes',
    },
    executableName: 'mindnotes-pro',
    fileAssociations: [],
    platformSpecificBuildOptions: { category: 'Utility' },
  }
  const helper = new LinuxTargetHelper(packager)
  const options = { category: 'Utility', executableArgs: ['--workspace', 'argument with spaces'] }
  const context = { ...owned.context, packager, targets: [{ name: 'deb', helper, options }] }
  return { ...owned, context, helper, options }
}

test('deb default desktop entry routes through AppRun and preserves upstream parameters', async (t) => {
  const { context, helper, options } = await debFixture(t)
  await linuxAfterPack(context)
  const file = await helper.writeDesktopEntry(
    options,
    undefined,
    path.join(context.appOutDir, 'deb.desktop')
  )
  const desktop = await fs.readFile(file, 'utf8')
  assert.match(
    desktop,
    /^Exec="\/opt\/MindNotes Pro\/AppRun" --workspace argument with spaces %U$/m
  )
  assert.match(desktop, /^StartupWMClass=com\.mindnotes\.pro$/m)
  assert.match(desktop, /^Icon=mindnotes-pro$/m)
})

test('shared helper retains AppImage and other explicit exec entries after repeated hook', async (t) => {
  const { context, helper, options } = await debFixture(t)
  const explicit = [
    'AppRun %U',
    'OtherLauncher --workspace %U',
    '"/opt/MindNotes Pro/mindnotes-pro" --explicit %U',
  ]
  const before = await Promise.all(
    explicit.map((exec) => helper.computeDesktopEntry(options, exec))
  )
  context.targets.push({ name: 'appImage', helper })
  await linuxAfterPack(context)
  await linuxAfterPack(context)
  for (let index = 0; index < explicit.length; index++) {
    assert.equal(await helper.computeDesktopEntry(options, explicit[index]), before[index])
  }
  const desktop = await helper.computeDesktopEntry(options, null)
  assert.match(
    desktop,
    /^Exec="\/opt\/MindNotes Pro\/AppRun" --workspace argument with spaces %U$/m
  )
})

test('deb adapter rejects unknown or duplicate default Exec and altered helper output', async (t) => {
  for (const alter of [
    (desktop) => desktop.replace('/opt/MindNotes Pro/mindnotes-pro', '/opt/OtherApp/other'),
    (desktop) => `${desktop}Exec="/opt/MindNotes Pro/mindnotes-pro" %U\n`,
    () => ({ changed: true }),
  ]) {
    const { context, helper, options } = await debFixture(t)
    const original = helper.computeDesktopEntry
    helper.computeDesktopEntry = async function (...args) {
      return alter(await original.apply(this, args))
    }
    await linuxAfterPack(context)
    await assert.rejects(helper.computeDesktopEntry(options), /desktop|Exec/i)
  }
})

test('deb adapter rejects missing interfaces and foreign project before adapting', async (t) => {
  const { context } = await debFixture(t)
  for (const targets of [
    [{ name: 'deb', options: {} }],
    [{ name: 'deb', helper: { computeDesktopEntry: 'changed' }, options: {} }],
    [{ name: 'deb', helper: context.targets[0].helper }],
    [context.targets[0], context.targets[0]],
  ]) {
    await assert.rejects(linuxAfterPack({ ...context, targets }), /deb|helper|target/i)
  }
  await assert.rejects(
    linuxAfterPack({
      ...context,
      packager: { ...context.packager, executableName: 'foreign-app' },
    }),
    /deb|project|helper/i
  )
})

test('AppRun retains sandbox by default even when unshare fails', async (t) => {
  const { context, run } = await fixture(t)
  await linuxAfterPack(context)
  assert.deepEqual(run().argv, [])
})

test('AppRun forwards caller arguments exactly and executes relative to extracted AppDir', async (t) => {
  const { context, run } = await fixture(t)
  await linuxAfterPack(context)
  const args = ['--workspace', 'argument with spaces', "--title=O'Reilly", '--no-sandbox']
  const result = run(args, true)
  assert.deepEqual(result.argv, args)
  assert.equal(result.libraryPath, `${context.appOutDir}/usr/lib:/fixture-existing-library`)
})

test('AppRun selects X11 before exec in a Wayland session with DISPLAY', async (t) => {
  const { context, run } = await fixture(t)
  await linuxAfterPack(context)
  const result = run(['--workspace', 'argument with spaces'], true, {
    XDG_SESSION_TYPE: 'wayland',
    WAYLAND_DISPLAY: 'mnp-unused-test-socket',
    DISPLAY: ':90',
  })
  assert.deepEqual(result.argv, ['--ozone-platform=x11', '--workspace', 'argument with spaces'])
  assert.equal(result.libraryPath, `${context.appOutDir}/usr/lib:/fixture-existing-library`)
})

test('AppRun preserves explicit Ozone keys and exact caller arguments before terminator', async (t) => {
  const { context, run } = await fixture(t)
  await linuxAfterPack(context)
  for (const args of [
    ['--ozone-platform=wayland', '--workspace'],
    ['--ozone-platform', 'wayland', '--workspace'],
    ['--ozone-platform=auto'],
    ['--ozone-platform='],
    ['--ozone-platform', ''],
    ['--ozone-platform'],
    ['--ozone-platform-hint=auto'],
    ['--ozone-platform-hint', 'auto'],
    ['--ozone-platform-hint='],
    ['--ozone-platform-hint', ''],
    ['--ozone-platform-hint'],
    ['argument with spaces', "--title=O'Reilly", '--ozone-platform=x11', '--no-sandbox'],
  ]) {
    assert.deepEqual(run(args, false, { DISPLAY: ':90' }).argv, args)
  }
})

test('AppRun only scans Ozone keys before terminator and retains positional bytes', async (t) => {
  const { context, run } = await fixture(t)
  await linuxAfterPack(context)
  for (const args of [
    ['--', '--ozone-platform=wayland'],
    ['--', '--ozone-platform-hint', 'auto'],
    ['--ozone-platforms=wayland'],
    ['--ozone-platform-hints=auto'],
    ['https://example.invalid/?option=--ozone-platform=wayland'],
    ['', 'unicode 中文', 'line\nbreak', 'quote\'and"double', '\\backslash'],
  ]) {
    assert.deepEqual(run(args, false, { DISPLAY: ':90' }).argv, ['--ozone-platform=x11', ...args])
  }
})

test('AppRun leaves no-display launch arguments and nonzero application exit intact', async (t) => {
  const { context, run } = await fixture(t)
  await linuxAfterPack(context)
  const args = ['--workspace', 'argument with spaces']
  for (const DISPLAY of ['', undefined]) {
    assert.deepEqual(run(args, false, { DISPLAY, XDG_SESSION_TYPE: 'wayland' }).argv, args)
  }
  const result = run(args, false, { DISPLAY: ':90', MINDNOTES_PACKAGING_PROBE_EXIT: '7' }, 7)
  assert.deepEqual(result.argv, ['--ozone-platform=x11', ...args])
  assert.equal(result.status, 7)
})

test('hook rejects unsafe binary names and unknown platform without writing launcher', async (t) => {
  const { context } = await fixture(t)
  for (const executableName of ['../escape', 'name$(command)', "name'quote", '.', '..', '']) {
    await assert.rejects(
      linuxAfterPack({ ...context, packager: { executableName } }),
      /executable/i
    )
  }
  await assert.rejects(linuxAfterPack({ ...context, electronPlatformName: 'unknown' }), /platform/i)
  await assert.rejects(fs.access(path.join(context.appOutDir, 'AppRun')))
})

test('hook leaves Windows and macOS packaging untouched', async (t) => {
  const { context } = await fixture(t)
  await linuxAfterPack({ ...context, electronPlatformName: 'win32' })
  await linuxAfterPack({ ...context, electronPlatformName: 'darwin' })
  await assert.rejects(fs.access(path.join(context.appOutDir, 'AppRun')))
})

test('hook fails closed if either AppImage target stops copying AppDir after generated launcher', async () => {
  const source = await fs.readFile(
    require.resolve('app-builder-lib/out/targets/appimage/appImageUtil.js'),
    'utf8'
  )
  validateAppImageCopyOrder(source)
  assert.throws(
    validateAppImageCopyOrder.bind(
      null,
      source.replaceAll('copyDir)(appDir, stageDir)', 'copyDir)(stageDir, appDir)')
    ),
    /copy order/i
  )
  assert.throws(
    validateAppImageCopyOrder.bind(
      null,
      source.replace('writeAppLauncherAndRelatedFiles(opts)', 'changedLauncher(opts)')
    ),
    /copy order/i
  )
})
