import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'

export interface LinuxSessionState {
  known: boolean
  locked: boolean
  active: boolean
  sessionId?: string
  sessionPath?: string
  reason?: string
}

interface CommandLimits {
  timeout: number
  maxBuffer: number
  encoding: 'utf8'
}

export interface LinuxSessionOptions {
  uid?: number
  env?: Readonly<Record<string, string | undefined>>
  execute?: (file: string, args: string[], limits: CommandLimits) => Promise<{ stdout: string }>
}

const execute = promisify(execFile)
const limits: CommandLimits = { timeout: 2000, maxBuffer: 16000, encoding: 'utf8' }
const validId = (value: string | undefined): value is string =>
  Boolean(value && /^[a-zA-Z0-9_-]{1,128}$/.test(value))
const unknown = (reason: string): LinuxSessionState => ({
  known: false,
  active: false,
  locked: false,
  reason,
})

function properties(text: string): Record<string, string> {
  if (text.length > limits.maxBuffer) throw new Error('Session output too large')
  const result: Record<string, string> = {}
  for (const line of text.trim().split(/\r?\n/)) {
    const match = /^([a-zA-Z]+)=(.*)$/.exec(line)
    if (!match || Object.hasOwn(result, match[1])) throw new Error('Invalid session output')
    result[match[1]] = match[2]
  }
  return result
}

/** Only a complete, current-user graphical logind session can grant access. */
export async function readLinuxSessionState(
  options: LinuxSessionOptions = {}
): Promise<LinuxSessionState> {
  const uid = options.uid ?? process.getuid?.()
  const env = options.env ?? process.env
  const query = options.execute ?? execute
  if (!Number.isSafeInteger(uid) || uid === undefined || uid < 0)
    return unknown('无法确认当前 Linux 用户。')
  const read = async (id: string): Promise<LinuxSessionState> => {
    const output = await query(
      'loginctl',
      [
        'show-session',
        id,
        '--property=User',
        '--property=Type',
        '--property=Class',
        '--property=Active',
        '--property=State',
        '--property=LockedHint',
      ],
      limits
    )
    const value = properties(output.stdout)
    if (
      value.User !== String(uid) ||
      !['x11', 'wayland'].includes(value.Type) ||
      value.Class !== 'user' ||
      !['yes', 'no'].includes(value.Active) ||
      !['yes', 'no'].includes(value.LockedHint) ||
      !['active', 'online'].includes(value.State) ||
      (value.Active === 'yes') !== (value.State === 'active')
    )
      throw new Error('Unverified graphical user session')
    // GetSession supplies the actual object path; never guess its escaping.
    const pathOutput = await query(
      'gdbus',
      [
        'call',
        '--system',
        '--dest',
        'org.freedesktop.login1',
        '--object-path',
        '/org/freedesktop/login1',
        '--method',
        'org.freedesktop.login1.Manager.GetSession',
        id,
      ],
      limits
    )
    const pathMatch =
      /^\(objectpath '(\/org\/freedesktop\/login1\/session\/[a-zA-Z0-9_]+)',\)\s*$/.exec(
        pathOutput.stdout
      )
    if (!pathMatch) throw new Error('Unverified session object path')
    return {
      known: true,
      locked: value.LockedHint === 'yes',
      active: value.Active === 'yes',
      sessionId: id,
      sessionPath: pathMatch[1],
    }
  }
  if (validId(env.XDG_SESSION_ID)) {
    try {
      return await read(env.XDG_SESSION_ID)
    } catch {
      /* Verify the user's Display fallback. */
    }
  }
  try {
    const output = await query('loginctl', ['show-user', String(uid), '--property=Display'], limits)
    const id = properties(output.stdout).Display
    if (!validId(id)) throw new Error('No graphical user Display session')
    return await read(id)
  } catch {
    return unknown('无法确认 Linux 桌面会话状态，绘制和截图暂不可用。')
  }
}

interface MonitorHandlers {
  onReady(): void
  onData(text: string): void
  onError(error: Error): void
}
interface OwnedMonitor {
  stop(): Promise<void>
}
export interface LinuxSessionObserverOptions extends LinuxSessionOptions {
  read?: () => Promise<LinuxSessionState>
  subscribe?: (handlers: MonitorHandlers) => OwnedMonitor
  pollIntervalMs?: number
}

/** An owned, bounded-memory stream; stop observes exit and kills only this child. */
function subscribeMonitor(handlers: MonitorHandlers): OwnedMonitor {
  const child = spawn('gdbus', ['monitor', '--system', '--dest', 'org.freedesktop.login1'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, LC_ALL: 'C' },
  })
  let stopped = false
  let ready = false
  let line = ''
  let stderrBytes = 0
  let exit: (() => void) | undefined
  const exited = new Promise<void>((resolve) => {
    exit = resolve
  })
  const failure = (error: Error): void => {
    if (!stopped) handlers.onError(error)
  }
  const startup = setTimeout(() => failure(new Error('Session monitor startup timed out')), 2000)
  child.stdout.setEncoding('utf8')
  child.stdout.on('data', (chunk: string) => {
    if (stopped) return
    if (chunk.length > 65536) {
      failure(new Error('Session signal output too large'))
      return
    }
    line += chunk
    if (line.length > 65536) {
      failure(new Error('Session signal buffer too large'))
      return
    }
    let newline: number
    while ((newline = line.indexOf('\n')) !== -1) {
      const next = line.slice(0, newline)
      line = line.slice(newline + 1)
      if (next.length > 16000) {
        failure(new Error('Session signal line too large'))
        return
      }
      if (next.startsWith('The name org.freedesktop.login1 is owned by ')) {
        if (ready) failure(new Error('Session bus owner changed'))
        else {
          ready = true
          clearTimeout(startup)
          handlers.onReady()
        }
      } else if (next.startsWith('The name org.freedesktop.login1 does not have an owner')) {
        failure(new Error('Session bus owner unavailable'))
      } else if (ready) handlers.onData(next)
    }
  })
  child.stderr.on('data', (chunk: Buffer) => {
    stderrBytes += chunk.length
    if (stderrBytes > 8000) failure(new Error('Session monitor error output too large'))
  })
  child.on('error', failure)
  child.on('close', () => {
    clearTimeout(startup)
    exit?.()
    failure(new Error('Session monitor closed'))
  })
  let stopping: Promise<void> | undefined
  return {
    stop: () => {
      if (stopping) return stopping
      stopped = true
      clearTimeout(startup)
      stopping = (async () => {
        if (child.exitCode !== null || child.signalCode !== null) return
        child.kill('SIGTERM')
        let timer: ReturnType<typeof setTimeout> | undefined
        await Promise.race([
          exited,
          new Promise<void>((resolve) => {
            timer = setTimeout(resolve, 500)
          }),
        ])
        if (timer) clearTimeout(timer)
        if (child.exitCode === null && child.signalCode === null) {
          child.kill('SIGKILL')
          await Promise.race([
            exited,
            new Promise<void>((resolve) => {
              timer = setTimeout(resolve, 500)
            }),
          ])
          if (timer) clearTimeout(timer)
        }
      })()
      return stopping
    },
  }
}

export function observeLinuxSession(
  callback: (state: LinuxSessionState) => void,
  options: LinuxSessionObserverOptions = {}
): () => Promise<void> {
  const uid = options.uid ?? process.getuid?.()
  const read = options.read ?? (() => readLinuxSessionState(options))
  let stopped = false
  let failed = false
  let ready = false
  let generation = 0
  let querying = false
  let state: LinuxSessionState = unknown('正在确认 Linux 桌面会话。')
  let verifiedSession: Pick<LinuxSessionState, 'sessionId' | 'sessionPath'> | null = null
  let timer: ReturnType<typeof setInterval> | undefined
  let monitor: OwnedMonitor | undefined
  const refresh = (): void => {
    generation += 1
    if (!ready || querying || stopped || failed) return
    querying = true
    void (async () => {
      let current: number
      do {
        current = generation
        let next: LinuxSessionState
        try {
          next = await read()
        } catch {
          next = unknown('Linux 桌面会话查询失败。')
        }
        if (stopped || failed) break
        if (current === generation) {
          state = next
          if (next.known)
            verifiedSession = { sessionId: next.sessionId, sessionPath: next.sessionPath }
          callback(next)
        }
      } while (current !== generation)
      querying = false
    })()
  }
  const onError = (): void => {
    if (stopped || failed) return
    failed = true
    generation += 1
    if (timer) clearInterval(timer)
    callback(unknown('Linux 桌面会话监听失效，绘制和截图暂不可用。'))
    void monitor?.stop()
  }
  try {
    monitor = (options.subscribe ?? subscribeMonitor)({
      onReady: () => {
        if (stopped || failed || ready) return
        ready = true
        refresh()
        timer = setInterval(
          refresh,
          Math.max(1000, Math.min(options.pollIntervalMs ?? 5000, 60000))
        )
      },
      onData: (text) => {
        if (stopped || failed || text.length > 65536) {
          if (text.length > 65536) onError()
          return
        }
        const ownPath = verifiedSession?.sessionPath
        const selectionUnknown = querying || !state.known || !ownPath
        const userPath = uid === undefined ? undefined : `/org/freedesktop/login1/user/_${uid}`
        const sessionProperties = /^\/org\/freedesktop\/login1\/session\/[a-zA-Z0-9_]+:/.test(text)
        const sessionRemoved = text.includes('org.freedesktop.login1.Manager.SessionRemoved')
        if (
          (text.includes('org.freedesktop.DBus.Properties.PropertiesChanged') &&
            ((sessionProperties &&
              (selectionUnknown || (ownPath && text.startsWith(`${ownPath}:`)))) ||
              (userPath && text.startsWith(`${userPath}:`)))) ||
          (text.startsWith('/org/freedesktop/login1:') &&
            (sessionRemoved || text.includes('org.freedesktop.login1.Manager.SessionNew')) &&
            (selectionUnknown ||
              (sessionRemoved &&
                verifiedSession?.sessionId &&
                text.includes(`'${verifiedSession.sessionId}'`))))
        ) {
          // Release drawing/capture immediately; a bounded query can still be in flight.
          // The retained route cannot exclude a newly selected session while unknown.
          state = unknown('Linux 桌面会话正在变化，绘制和截图暂不可用。')
          callback(state)
          refresh()
        }
      },
      onError,
    })
    if (failed) void monitor.stop()
  } catch {
    onError()
  }
  let stopping: Promise<void> | undefined
  return () => {
    if (stopping) return stopping
    stopped = true
    generation += 1
    if (timer) clearInterval(timer)
    stopping = monitor?.stop() ?? Promise.resolve()
    return stopping
  }
}
