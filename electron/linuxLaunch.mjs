import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

export function linuxLaunchArgs(platform, env, argv) {
  const args = [...argv]
  if (platform !== 'linux' || !env.DISPLAY) return args
  for (const arg of args) {
    if (arg === '--') break
    const key = arg.split('=', 1)[0]
    if (key === '--ozone-platform' || key === '--ozone-platform-hint') return args
  }
  return ['--ozone-platform=x11', ...args]
}

export async function runElectron(argv = process.argv.slice(2), options = {}) {
  const platform = options.platform ?? process.platform
  const env = options.env ?? process.env
  const executable = options.executable ?? require('electron')
  const child = spawn(executable, linuxLaunchArgs(platform, env, argv), {
    env,
    stdio: 'inherit',
    shell: false,
  })
  const handlers = new Map()
  for (const signal of ['SIGINT', 'SIGTERM']) {
    const forward = () => {
      if (child.exitCode === null && child.signalCode === null) child.kill(signal)
    }
    handlers.set(signal, forward)
    process.on(signal, forward)
  }
  const cleanup = () => {
    for (const [signal, handler] of handlers) process.removeListener(signal, handler)
  }
  return await new Promise((resolve, reject) => {
    child.once('error', (error) => {
      cleanup()
      reject(error)
    })
    child.once('close', (code, signal) => {
      cleanup()
      resolve({ code, signal })
    })
  })
}

if (import.meta.main) {
  try {
    const { code, signal } = await runElectron()
    if (signal) process.kill(process.pid, signal)
    else process.exitCode = code ?? 1
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
