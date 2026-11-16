import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  readLinuxSessionState,
  observeLinuxSession,
} from '../dist-electron/electron/linuxSession.mjs'
import { currentScreenSource } from '../dist-electron/electron/screenSource.mjs'
import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const unlocked = 'User=1000\nType=wayland\nClass=user\nActive=yes\nState=active\nLockedHint=no\n'
const tick = () => new Promise((resolve) => setImmediate(resolve))

function fixture(text = unlocked, env = {}) {
  const calls = []
  return {
    calls,
    options: {
      uid: 1000,
      env,
      execute: async (file, args, limits) => {
        calls.push({ file, args, limits })
        if (file === 'loginctl' && args[0] === 'show-user') {
          assert.equal(args[1], '1000')
          return { stdout: 'Display=21\n' }
        }
        if (file === 'loginctl' && args[0] === 'show-session') {
          return { stdout: args[1] === 'foreign' ? text.replace('User=1000', 'User=2000') : text }
        }
        if (file === 'gdbus')
          return { stdout: "(objectpath '/org/freedesktop/login1/session/_321',)\n" }
        throw new Error(`Unexpected command ${file}`)
      },
    },
  }
}

test('queries the current UID desktop session and separates empty metadata from verified safety', async () => {
  const { options, calls } = fixture()
  const state = await readLinuxSessionState(options)
  assert.equal(state.known, true)
  assert.equal(state.locked, false)
  assert.equal(state.active, true)
  assert.equal(state.sessionId, '21')
  assert.equal(state.sessionPath, '/org/freedesktop/login1/session/_321')
  assert.ok(calls.every(({ limits }) => limits.timeout <= 2000 && limits.maxBuffer <= 16000))
})

test('prefers a verified XDG session and falls back from a foreign XDG session to the own UID Display', async () => {
  const own = fixture(unlocked, { XDG_SESSION_ID: '21' })
  assert.equal((await readLinuxSessionState(own.options)).known, true)
  assert.equal(
    own.calls.some(({ args }) => args[0] === 'show-user'),
    false
  )
  const other = fixture(unlocked, { XDG_SESSION_ID: 'foreign' })
  assert.equal((await readLinuxSessionState(other.options)).sessionId, '21')
  assert.ok(other.calls.some(({ args }) => args[0] === 'show-user'))
})

test('locked and inactive desktop sessions remain known but restricted', async () => {
  const locked = await readLinuxSessionState(
    fixture(unlocked.replace('LockedHint=no', 'LockedHint=yes')).options
  )
  assert.equal(locked.known, true)
  assert.equal(locked.locked, true)
  const inactive = await readLinuxSessionState(
    fixture(unlocked.replace('Active=yes', 'Active=no').replace('State=active', 'State=online'))
      .options
  )
  assert.equal(inactive.known, true)
  assert.equal(inactive.active, false)
})

test('refuses foreign ownership, malformed, incomplete, non-desktop and inconsistent session output', async () => {
  for (const text of [
    unlocked.replace('User=1000', 'User=2000'),
    unlocked.replace('Class=user', 'Class=greeter'),
    unlocked.replace('Type=wayland', 'Type=tty'),
    unlocked.replace('LockedHint=no\n', ''),
    unlocked.replace('LockedHint=no', 'LockedHint=maybe'),
    unlocked.replace('State=active', 'State=closing'),
    unlocked.replace('State=active', 'State=online'),
    unlocked + 'User=2000\n',
  ])
    assert.equal((await readLinuxSessionState(fixture(text).options)).known, false, text)
  assert.equal(
    (
      await readLinuxSessionState({
        uid: 1000,
        env: {},
        execute: async () => {
          throw new Error('timeout')
        },
      })
    ).known,
    false
  )
})

test('does not execute shell or select a malicious session identifier', async () => {
  const { options, calls } = fixture(unlocked, { XDG_SESSION_ID: '21; touch /sentinel' })
  assert.equal((await readLinuxSessionState(options)).known, true)
  assert.ok(calls.every(({ args }) => !args.some((value) => value.includes('touch'))))
})

test(
  'Linux empty source metadata does not block a verified desktop, but locked and unknown sessions do',
  { skip: process.platform !== 'linux' },
  async () => {
    assert.deepEqual(await currentScreenSource('屏幕 60', undefined, fixture().options), {
      app: '',
      title: '',
      display: '屏幕 60',
      restricted: false,
      unavailable: false,
    })
    assert.equal(
      (
        await currentScreenSource(
          '屏幕 60',
          undefined,
          fixture(unlocked.replace('LockedHint=no', 'LockedHint=yes')).options
        )
      ).restricted,
      true
    )
    assert.equal(
      (
        await currentScreenSource('屏幕 60', undefined, {
          uid: 1000,
          execute: async () => {
            throw new Error('timeout')
          },
        })
      ).unavailable,
      true
    )
  }
)

function observerFixture(read, readOptions = {}) {
  let handlers
  let stopped = 0
  const states = []
  const stop = observeLinuxSession((state) => states.push(state), {
    uid: 1000,
    env: {},
    read,
    pollIntervalMs: 60000,
    ...readOptions,
    subscribe: (next) => {
      handlers = next
      queueMicrotask(next.onReady)
      return {
        stop: async () => {
          stopped += 1
        },
      }
    },
  })
  return {
    states,
    stop,
    get handlers() {
      return handlers
    },
    get stopped() {
      return stopped
    },
  }
}

const safe = {
  known: true,
  active: true,
  locked: false,
  sessionId: '21',
  sessionPath: '/org/freedesktop/login1/session/_321',
}

test('observes own session and user Display changes, ignores other users, and releases its subscription on stop', async () => {
  let state = safe
  const observation = observerFixture(async () => state)
  await tick()
  assert.deepEqual(observation.states.at(-1), safe)
  observation.handlers.onData(
    "/org/freedesktop/login1/session/_999: org.freedesktop.DBus.Properties.PropertiesChanged ('other',)\n"
  )
  await tick()
  assert.equal(observation.states.length, 1)
  state = { ...safe, locked: true }
  observation.handlers.onData(
    "/org/freedesktop/login1/session/_321: org.freedesktop.DBus.Properties.PropertiesChanged ('locked',)\n"
  )
  await tick()
  assert.equal(observation.states.at(-1).locked, true)
  state = { ...safe, sessionId: '22', sessionPath: '/org/freedesktop/login1/session/_322' }
  observation.handlers.onData(
    "/org/freedesktop/login1/user/_1000: org.freedesktop.DBus.Properties.PropertiesChanged ('Display',)\n"
  )
  await tick()
  assert.equal(observation.states.at(-1).sessionId, '22')
  await observation.stop()
  await observation.stop()
  assert.equal(observation.stopped, 1)
  observation.handlers.onData(
    '/org/freedesktop/login1/session/_322: org.freedesktop.DBus.Properties.PropertiesChanged ()\n'
  )
  await tick()
  assert.equal(observation.states.filter((next) => next.known).length, 3)
})

test('publishes unknown on monitor failure and prevents a stale read from restoring capture permission', async () => {
  let finish
  const observation = observerFixture(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  await tick()
  observation.handlers.onError(new Error('bus disconnected'))
  finish(safe)
  await tick()
  assert.equal(observation.states.at(-1).known, false)
  assert.equal(
    observation.states.some((state) => state.known),
    false
  )
  await observation.stop()
})

test('releases permission immediately on a session signal while the bounded requery is still pending', async () => {
  let finish
  let count = 0
  const observation = observerFixture(async () => {
    if (++count === 1) return safe
    return new Promise((resolve) => {
      finish = resolve
    })
  })
  try {
    await tick()
    observation.handlers.onData(
      '/org/freedesktop/login1/session/_321: org.freedesktop.DBus.Properties.PropertiesChanged ()\n'
    )
    assert.equal(observation.states.at(-1).known, false)
    await tick()
    finish({ ...safe, locked: true })
    await tick()
    assert.equal(observation.states.at(-1).locked, true)
  } finally {
    await observation.stop()
    finish?.(safe)
  }
})

test('discards old results when a newer signal arrives and can recover unknown to locked then unlocked', async () => {
  let finish
  let count = 0
  let state = { ...safe, locked: true }
  const observation = observerFixture(async () => {
    count += 1
    if (count === 1) return { known: false, active: false, locked: false }
    if (count === 2)
      return new Promise((resolve) => {
        finish = resolve
      })
    return state
  })
  await tick()
  assert.equal(observation.states.at(-1).known, false)
  observation.handlers.onData(
    '/org/freedesktop/login1/user/_1000: org.freedesktop.DBus.Properties.PropertiesChanged ()\n'
  )
  await tick()
  observation.handlers.onData(
    '/org/freedesktop/login1/user/_1000: org.freedesktop.DBus.Properties.PropertiesChanged ()\n'
  )
  finish(safe)
  await tick()
  assert.equal(observation.states.at(-1).locked, true)
  assert.equal(
    observation.states.some((next) => next.known && !next.locked),
    false
  )
  state = safe
  observation.handlers.onData(
    '/org/freedesktop/login1/session/_321: org.freedesktop.DBus.Properties.PropertiesChanged ()\n'
  )
  await tick()
  assert.equal(observation.states.at(-1).locked, false)
  await observation.stop()
})

test('invalidates the initial unlocked loginctl result when a lock signal arrives before GetSession returns', async () => {
  let finishPath
  let locked = false
  let pathQueries = 0
  const observation = observerFixture(undefined, {
    env: { XDG_SESSION_ID: '21' },
    execute: async (file) => {
      if (file === 'loginctl')
        return { stdout: locked ? unlocked.replace('LockedHint=no', 'LockedHint=yes') : unlocked }
      if (++pathQueries === 1)
        return new Promise((resolve) => {
          finishPath = resolve
        })
      return { stdout: "(objectpath '/org/freedesktop/login1/session/_321',)\n" }
    },
  })
  try {
    await tick()
    locked = true
    observation.handlers.onData(
      "/org/freedesktop/login1/session/_321: org.freedesktop.DBus.Properties.PropertiesChanged ('org.freedesktop.login1.Session', {'LockedHint': <true>}, @as [])\n"
    )
    finishPath({ stdout: "(objectpath '/org/freedesktop/login1/session/_321',)\n" })
    await tick()
    assert.equal(
      observation.states.some((state) => state.known && state.active && !state.locked),
      false
    )
    assert.equal(observation.states.at(-1).locked, true)
    assert.equal(pathQueries, 2)
  } finally {
    await observation.stop()
    finishPath?.({ stdout: "(objectpath '/org/freedesktop/login1/session/_321',)\n" })
  }
})

test('invalidates stale recovery results after unknown for both the old own path and a new inactive own session', async () => {
  for (const restricted of [
    { ...safe, locked: true },
    {
      ...safe,
      sessionId: '22',
      sessionPath: '/org/freedesktop/login1/session/_322',
      active: false,
    },
  ]) {
    let finish
    let reads = 0
    const recoverySafe = { ...restricted, locked: false, active: true }
    const observation = observerFixture(async () => {
      if (++reads === 1) return safe
      if (reads === 2) return { known: false, locked: false, active: false }
      if (reads === 3)
        return new Promise((resolve) => {
          finish = resolve
        })
      return restricted
    })
    try {
      await tick()
      observation.handlers.onData(
        '/org/freedesktop/login1/user/_1000: org.freedesktop.DBus.Properties.PropertiesChanged ()\n'
      )
      await tick()
      assert.equal(observation.states.at(-1).known, false)
      const recoveryStart = observation.states.length
      observation.handlers.onData(
        '/org/freedesktop/login1/user/_1000: org.freedesktop.DBus.Properties.PropertiesChanged ()\n'
      )
      await tick()
      observation.handlers.onData(
        `${restricted.sessionPath}: org.freedesktop.DBus.Properties.PropertiesChanged ('restricted',)\n`
      )
      finish(recoverySafe)
      await tick()
      assert.equal(
        observation.states
          .slice(recoveryStart)
          .some((state) => state.known && state.active && !state.locked),
        false
      )
      assert.deepEqual(observation.states.at(-1), restricted)
      const count = observation.states.length
      observation.handlers.onData(
        '/org/freedesktop/login1/session/_999: org.freedesktop.DBus.Properties.PropertiesChanged ()\n'
      )
      await tick()
      assert.equal(observation.states.length, count)
    } finally {
      await observation.stop()
      finish?.(restricted)
    }
  }
})

test('invalidates a new session lock during an own-user Display switch before the next read resolves', async () => {
  let finish
  let reads = 0
  const nextSafe = { ...safe, sessionId: '22', sessionPath: '/org/freedesktop/login1/session/_322' }
  const nextLocked = { ...nextSafe, locked: true }
  const observation = observerFixture(async () => {
    if (++reads === 1) return safe
    if (reads === 2)
      return new Promise((resolve) => {
        finish = resolve
      })
    return nextLocked
  })
  try {
    await tick()
    const start = observation.states.length
    observation.handlers.onData(
      "/org/freedesktop/login1/user/_1000: org.freedesktop.DBus.Properties.PropertiesChanged ('Display',)\n"
    )
    await tick()
    observation.handlers.onData(
      "/org/freedesktop/login1/session/_322: org.freedesktop.DBus.Properties.PropertiesChanged ('LockedHint',)\n"
    )
    finish(nextSafe)
    await tick()
    assert.equal(
      observation.states.slice(start).some((state) => state.known && state.active && !state.locked),
      false
    )
    assert.deepEqual(observation.states.at(-1), nextLocked)
  } finally {
    await observation.stop()
    finish?.(nextLocked)
  }
})

test('conservatively rejects an unknown-path foreign signal but filters foreign and malformed paths once verified', async () => {
  const finishes = []
  const observation = observerFixture(
    () =>
      new Promise((resolve) => {
        finishes.push(resolve)
      })
  )
  try {
    await tick()
    observation.handlers.onData(
      '/org/freedesktop/login1/session/_999: org.freedesktop.DBus.Properties.PropertiesChanged ()\n'
    )
    finishes[0](safe)
    await tick()
    assert.equal(
      observation.states.some((state) => state.known),
      false
    )
    assert.equal(observation.states.at(-1)?.known, false)
    assert.equal(finishes.length, 2)
    finishes[1](safe)
    await tick()
    assert.deepEqual(observation.states.at(-1), safe)
    const count = observation.states.length
    observation.handlers.onData(
      '/org/freedesktop/login1/session/_999: org.freedesktop.DBus.Properties.PropertiesChanged ()\n'
    )
    observation.handlers.onData(
      '/org/freedesktop/login1/session/../../invalid: org.freedesktop.DBus.Properties.PropertiesChanged ()\n'
    )
    await tick()
    assert.equal(observation.states.length, count)
  } finally {
    await observation.stop()
    for (const finish of finishes) finish(safe)
  }
})

test('invalidates an initial pending result on a session removal while selection is unknown', async () => {
  let finish
  let reads = 0
  const observation = observerFixture(async () => {
    if (++reads === 1)
      return new Promise((resolve) => {
        finish = resolve
      })
    return { known: false, active: false, locked: false }
  })
  try {
    await tick()
    observation.handlers.onData(
      "/org/freedesktop/login1: org.freedesktop.login1.Manager.SessionRemoved ('21', objectpath '/org/freedesktop/login1/session/_321')\n"
    )
    finish(safe)
    await tick()
    assert.equal(
      observation.states.some((state) => state.known),
      false
    )
    assert.equal(reads, 2)
  } finally {
    await observation.stop()
    finish?.(safe)
  }
})

async function withOwnedMonitor(script, check) {
  const directory = path.join(process.env.TMP ?? path.resolve('tmp'), 'linux-session-tests')
  await mkdir(directory, { recursive: true })
  const fixtureDirectory = await mkdtemp(path.join(directory, 'monitor-'))
  const pidFile = path.join(fixtureDirectory, 'child.pid')
  await writeFile(
    path.join(fixtureDirectory, 'gdbus'),
    `#!${process.execPath}\nimport { writeFileSync } from 'node:fs';\nwriteFileSync(${JSON.stringify(pidFile)}, String(process.pid));\n${script}\n`,
    { mode: 0o755 }
  )
  // This PATH is local to the test worker and its exact owned fixture child.
  const previousPath = process.env.PATH
  process.env.PATH = fixtureDirectory
  let stop
  try {
    await check((callback) => {
      stop = observeLinuxSession(callback, { uid: 1000, read: async () => safe })
      return stop
    }, pidFile)
  } finally {
    await stop?.()
    process.env.PATH = previousPath
  }
}

test(
  'default monitor stop escalates only its owned child and observes exit within its deadline',
  { skip: process.platform !== 'linux' },
  async () => {
    await withOwnedMonitor(
      "console.log('The name org.freedesktop.login1 is owned by :1.2'); process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)",
      async (start, pidFile) => {
        let complete
        const ready = new Promise((resolve) => {
          complete = resolve
        })
        const stop = start(complete)
        let timer
        try {
          const state = await Promise.race([
            ready,
            new Promise((_, reject) => {
              timer = setTimeout(() => reject(new Error('monitor readiness deadline')), 4000)
            }),
          ])
          assert.equal(state.known, true)
          const pid = Number(await readFile(pidFile, 'utf8'))
          const began = Date.now()
          await stop()
          assert.ok(Date.now() - began < 1500)
          await assert.rejects(access(`/proc/${pid}`), { code: 'ENOENT' })
        } finally {
          clearTimeout(timer)
          await stop()
        }
      }
    )
  }
)

test(
  'default monitor fails closed on oversized output and startup without bus readiness',
  { skip: process.platform !== 'linux' },
  async () => {
    for (const script of [
      "console.log('The name org.freedesktop.login1 is owned by :1.2'); process.stdout.write('x'.repeat(70000)); setInterval(() => {}, 1000)",
      'setInterval(() => {}, 1000)',
    ]) {
      await withOwnedMonitor(script, async (start, pidFile) => {
        let complete
        const failed = new Promise((resolve) => {
          complete = resolve
        })
        const stop = start((state) => {
          if (!state.known) complete(state)
        })
        let timer
        try {
          const state = await Promise.race([
            failed,
            new Promise((_, reject) => {
              timer = setTimeout(() => reject(new Error('monitor failure deadline')), 4000)
            }),
          ])
          assert.equal(state.known, false)
          const pid = Number(await readFile(pidFile, 'utf8'))
          await stop()
          await assert.rejects(access(`/proc/${pid}`), { code: 'ENOENT' })
        } finally {
          clearTimeout(timer)
          await stop()
        }
      })
    }
  }
)
