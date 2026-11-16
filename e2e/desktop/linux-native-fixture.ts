import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import path from 'node:path'
import { verifyOwnedX11 } from '../../benchmark/local/electron-harness.mjs'

export interface NativeState {
  clicks: number
  keys: number
  focus: number
  window: number
  stacking: number[]
  rootStack: number[]
  compositorOwner: number
  hierarchy: Record<
    string,
    {
      parent: number
      rootChild: number
      mapState: number
      overrideRedirect: boolean
      x: number
      y: number
      width: number
      height: number
    }
  >
}

export async function createLinuxNativeFixture() {
  await verifyOwnedX11()
  // This helper only controls authenticated X11; retain the Wayland probe env for Electron itself.
  const nativeEnvironment = { ...process.env }
  delete nativeEnvironment.WAYLAND_DISPLAY
  const child = spawn('python3', [path.resolve('e2e/desktop/linux-native.py')], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: nativeEnvironment,
  })
  let stderr = ''
  child.stderr.on('data', (chunk) => {
    stderr = (stderr + String(chunk)).slice(-8192)
  })
  const lines = createInterface({ input: child.stdout })[Symbol.asyncIterator]()
  const exit = new Promise<number | null>((resolve, reject) => {
    child.once('exit', resolve)
    child.once('error', reject)
  })
  void exit.catch(() => {})
  async function bounded<T>(work: Promise<T>, description: string, timeout = 5000): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        work,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error(`Native fixture timed out: ${description}; ${stderr}`)),
            timeout
          )
        }),
      ])
    } finally {
      if (timer) clearTimeout(timer)
    }
  }
  async function response<T>(): Promise<T> {
    const item = await bounded(lines.next(), 'response')
    if (item.done) throw new Error(`Native fixture exited during input; ${stderr}`)
    const result = JSON.parse(item.value) as T & { error?: string }
    if (result.error) throw new Error(result.error)
    return result
  }
  let closing: Promise<void> | undefined
  const close = () =>
    (closing ??= (async () => {
      try {
        if (child.exitCode === null && child.signalCode === null)
          child.stdin.end(`${JSON.stringify({ action: 'close' })}\n`)
        const code = await bounded(exit, 'owned native process exit')
        if (code !== 0) throw new Error(`Native fixture exited ${code}; ${stderr}`)
      } finally {
        if (child.exitCode === null && child.signalCode === null) {
          child.kill('SIGKILL')
          await bounded(exit, 'owned native forced exit')
        }
      }
    })())
  try {
    const ready = await response<{ ready: boolean; window: number; pid: number }>()
    if (!ready.ready || ready.pid !== child.pid)
      throw new Error('Native fixture process identity mismatch')
    return {
      window: ready.window,
      async input(request: {
        action: string
        x?: number
        y?: number
        key?: string
        rgb?: number
        points?: { x: number; y: number }[]
        windows?: number[]
      }): Promise<NativeState> {
        await verifyOwnedX11()
        child.stdin.write(`${JSON.stringify(request)}\n`)
        return response<NativeState>()
      },
      close,
    }
  } catch (error) {
    try {
      await close()
    } catch (cleanup) {
      throw Object.assign(error instanceof Error ? error : new Error(String(error)), {
        cleanupError: cleanup,
      })
    }
    throw error
  }
}
