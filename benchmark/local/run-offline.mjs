/* global process */
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { preflightDesktop, selectDesktopExecutable, withDesktopWorkspace } from './electron-harness.mjs'

export function offlineLaunchOptions(argv = [], environment = process.env) {
  let allowVisible = false, executable
  const seen = new Set()
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]
    if (seen.has(argument)) throw new Error('Repeated offline option.')
    seen.add(argument)
    if (argument === '--allow-visible') allowVisible = true
    else if (argument === '--executable') {
      executable = argv[++index]
      if (!executable?.trim() || executable.startsWith('--')) throw new Error('Missing --executable value.')
    } else throw new Error('Unknown offline option.')
  }
  return { allowVisible, executable: selectDesktopExecutable(executable, environment).executable }
}

export async function runOffline(argv = process.argv.slice(2)) {
  let ready
  try {
    ready = await preflightDesktop(offlineLaunchOptions(argv))
  } catch (error) { process.stderr.write(`Offline baseline unavailable: ${error.message}\n`); return 2 }
  const require = createRequire(import.meta.url)
  const cli = require.resolve('@playwright/test/cli')
  // Scope before the CLI initializes Playwright; the SDK caches os.tmpdir at import.
  return withDesktopWorkspace(async directory => {
    const env = { ...process.env, MINDNOTES_BASELINE_ALLOW_VISIBLE: '1' }
    Object.assign(env, { TEMP: directory, TMP: directory, TMPDIR: directory })
    delete env.MINDNOTES_EXECUTABLE
    delete env.MINDNOTES_BASELINE_EXECUTABLE
    if (ready.packaged) env.MINDNOTES_BASELINE_EXECUTABLE = ready.executablePath
    const child = spawn(process.execPath, [cli, 'test', '--config', 'playwright.offline.config.ts'], { cwd: process.cwd(), env, stdio: 'inherit' })
    const interrupt = () => child.kill('SIGTERM')
    process.once('SIGINT', interrupt)
    process.once('SIGTERM', interrupt)
    try {
      return await new Promise(resolve => {
        child.once('error', error => { process.stderr.write(`${error.message}\n`); resolve(1) })
        child.once('exit', code => resolve(code === 0 ? 0 : 1))
      })
    } finally {
      process.removeListener('SIGINT', interrupt)
      process.removeListener('SIGTERM', interrupt)
    }
  })
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await runOffline()
