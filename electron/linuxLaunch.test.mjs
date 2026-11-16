import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawn } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { linuxLaunchArgs } from './linuxLaunch.mjs'

const source = fileURLToPath(new URL('./linuxLaunch.mjs', import.meta.url))
const display = { DISPLAY: ':90', WAYLAND_DISPLAY: 'owned-unused', XDG_SESSION_TYPE: 'wayland' }

test('adds X11 before Electron startup for Linux DISPLAY without mutating caller arguments', () => {
  const argv = ['.', '--workspace']
  const result = linuxLaunchArgs('linux', display, argv)
  assert.deepEqual(result, ['--ozone-platform=x11', '.', '--workspace'])
  assert.deepEqual(argv, ['.', '--workspace'])
  assert.notEqual(result, argv)
})

test('preserves explicit Ozone keys including split, hint, auto and empty values', () => {
  for (const argv of [
    ['.', '--ozone-platform=wayland'],
    ['--ozone-platform', 'wayland', '.'],
    ['--ozone-platform-hint=x11', '.'],
    ['.', '--ozone-platform-hint', 'auto'],
    ['--ozone-platform=auto', '.'],
    ['--ozone-platform=', '.', ''],
    ['--ozone-platform', '', '.'],
    ['--ozone-platform-hint=', '.'],
  ])
    assert.deepEqual(linuxLaunchArgs('linux', display, argv), argv)
})

test('only recognizes exact pre-terminator switch keys and preserves URL/space/empty tokens', () => {
  for (const argv of [
    ['.', '--', '--ozone-platform=wayland'],
    ['--', '--ozone-platform-hint=wayland'],
    ['.', 'https://example.test/?--ozone-platform=wayland', 'a b', ''],
    ['.', '--ozone-platform-other=wayland'],
  ])
    assert.deepEqual(linuxLaunchArgs('linux', display, argv), ['--ozone-platform=x11', ...argv])
})

test('passes all arguments through outside Linux or when DISPLAY is absent/empty', () => {
  const argv = ['.', '--workspace', 'a b', '']
  for (const [platform, env] of [
    ['win32', display],
    ['darwin', display],
    ['linux', {}],
    ['linux', { DISPLAY: '' }],
  ]) {
    assert.deepEqual(linuxLaunchArgs(platform, env, argv), argv)
  }
})

async function fixture(script) {
  const directory = path.join(process.env.TMP ?? path.resolve('tmp'), 'linux-launch-tests')
  await mkdir(directory, { recursive: true })
  const root = await mkdtemp(path.join(directory, 'cli-'))
  const launcher = path.join(root, 'linuxLaunch.mjs')
  const executable = path.join(root, 'owned dummy.mjs')
  await copyFile(source, launcher)
  await writeFile(executable, `#!${process.execPath}\n${script}\n`, { mode: 0o755 })
  const dependency = path.join(root, 'node_modules/electron')
  await mkdir(dependency, { recursive: true })
  await writeFile(path.join(dependency, 'package.json'), JSON.stringify({ main: 'index.cjs' }))
  await writeFile(
    path.join(dependency, 'index.cjs'),
    `module.exports=${JSON.stringify(executable)}\n`
  )
  return { root, launcher, executable, dependency }
}

function cli(launcher, args = [], env = display) {
  const child = spawn(process.execPath, [launcher, ...args], {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stdout = '',
    stderr = ''
  child.stdout.on('data', (bytes) => {
    stdout = (stdout + bytes).slice(-16000)
  })
  child.stderr.on('data', (bytes) => {
    stderr = (stderr + bytes).slice(-16000)
  })
  const closed = new Promise((resolve) =>
    child.once('close', (code, signal) => resolve({ code, signal, stdout, stderr }))
  )
  return { child, closed }
}

async function deadline(promise) {
  let timer
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Owned CLI deadline')), 3000)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

test(
  'real CLI resolves its Electron dependency, preserves argv bytes and returns the child exit code',
  { skip: process.platform === 'win32' },
  async () => {
    const { launcher } = await fixture(
      'console.log(JSON.stringify(process.argv.slice(2)));process.exit(37)'
    )
    const args = ['.', '--workspace', 'a b', '', '$(literal)', '`literal`']
    const run = cli(launcher, args)
    try {
      const result = await deadline(run.closed)
      assert.equal(result.code, 37)
      assert.equal(result.signal, null)
      assert.deepEqual(JSON.parse(result.stdout), ['--ozone-platform=x11', ...args])
    } finally {
      if (run.child.exitCode === null && run.child.signalCode === null) run.child.kill('SIGKILL')
    }
  }
)

test(
  'real CLI preserves explicit flags and -- terminator behavior without shell interpretation',
  { skip: process.platform === 'win32' },
  async () => {
    const { launcher } = await fixture('console.log(JSON.stringify(process.argv.slice(2)))')
    for (const [args, env, expected] of [
      [['.', '--ozone-platform=wayland', 'a b'], display, ['.', '--ozone-platform=wayland', 'a b']],
      [['.', '--ozone-platform-hint=', ''], display, ['.', '--ozone-platform-hint=', '']],
      [
        ['.', '--', '--ozone-platform=wayland'],
        display,
        ['--ozone-platform=x11', '.', '--', '--ozone-platform=wayland'],
      ],
      [['.', '--workspace'], { DISPLAY: '' }, ['.', '--workspace']],
    ]) {
      const run = cli(launcher, args, env)
      try {
        const result = await deadline(run.closed)
        assert.equal(result.code, 0)
        assert.deepEqual(JSON.parse(result.stdout), expected)
      } finally {
        if (run.child.exitCode === null && run.child.signalCode === null) run.child.kill('SIGKILL')
      }
    }
  }
)

test('importing the module neither resolves Electron nor starts a child', async () => {
  const { launcher, dependency } = await fixture('process.exit(99)')
  await writeFile(
    path.join(dependency, 'index.cjs'),
    "throw new Error('Electron must not be resolved on import')\n"
  )
  const driver = path.join(path.dirname(launcher), 'import-only.mjs')
  await writeFile(
    driver,
    `await import(${JSON.stringify(pathToFileURL(launcher).href)});console.log('imported')\n`
  )
  const run = cli(driver)
  try {
    const result = await deadline(run.closed)
    assert.equal(result.code, 0)
    assert.equal(result.stdout.trim(), 'imported')
    assert.equal(result.stderr, '')
  } finally {
    if (run.child.exitCode === null && run.child.signalCode === null) run.child.kill('SIGKILL')
  }
})

test(
  'real CLI preserves a child signal as a signal exit',
  { skip: process.platform === 'win32' },
  async () => {
    const { launcher } = await fixture("process.kill(process.pid,'SIGTERM')")
    const run = cli(launcher)
    try {
      const result = await deadline(run.closed)
      assert.equal(result.code, null)
      assert.equal(result.signal, 'SIGTERM')
    } finally {
      if (run.child.exitCode === null && run.child.signalCode === null) run.child.kill('SIGKILL')
    }
  }
)

test(
  'forwards a parent signal only to its own child and observes that child exit',
  { skip: process.platform !== 'linux' },
  async () => {
    const { launcher, executable } = await fixture(
      "process.on('SIGTERM',()=>process.exit(41));console.log(JSON.stringify({pid:process.pid}));setInterval(()=>{},1000)"
    )
    const bystander = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {
      stdio: 'ignore',
    })
    const bystanderClosed = new Promise((resolve) => bystander.once('close', resolve))
    const run = cli(launcher)
    let ownedPid
    let cleanupError
    try {
      const ready = await deadline(new Promise((resolve) => run.child.stdout.once('data', resolve)))
      ownedPid = JSON.parse(String(ready)).pid
      run.child.kill('SIGTERM')
      const result = await deadline(run.closed)
      assert.equal(result.code, 41)
      assert.equal(result.signal, null)
      assert.equal(bystander.exitCode, null)
      assert.equal(bystander.signalCode, null)
    } finally {
      if (run.child.exitCode === null && run.child.signalCode === null) run.child.kill('SIGKILL')
      if (ownedPid) {
        try {
          const argv = (await readFile(`/proc/${ownedPid}/cmdline`, 'utf8')).split('\0')
          if (argv.includes(executable)) process.kill(ownedPid, 'SIGKILL')
        } catch (error) {
          if (!['ENOENT', 'ESRCH'].includes(error.code)) cleanupError = error
        }
      }
      bystander.kill('SIGKILL')
      await deadline(bystanderClosed)
    }
    if (cleanupError) throw cleanupError
  }
)

test('real CLI reports a missing runtime as a nonzero exit', async () => {
  const { launcher, dependency, root } = await fixture('process.exit(0)')
  await writeFile(
    path.join(dependency, 'index.cjs'),
    `module.exports=${JSON.stringify(path.join(root, 'absent-runtime'))}\n`
  )
  const run = cli(launcher)
  try {
    const result = await deadline(run.closed)
    assert.equal(result.code, 1)
    assert.match(result.stderr, /ENOENT/)
  } finally {
    if (run.child.exitCode === null && run.child.signalCode === null) run.child.kill('SIGKILL')
  }
})
