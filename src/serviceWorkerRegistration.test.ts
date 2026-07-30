import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SERVICE_WORKER_UPDATE_BANNER_ID,
  setupServiceWorkerUpdates,
  shouldRegisterServiceWorker,
} from './serviceWorkerRegistration'

interface RegistrationStub {
  unregister: () => Promise<boolean> | boolean
}

function makeRegistration() {
  const worker = new EventTarget() as EventTarget & { state?: string }
  const waiting = { postMessage: vi.fn() }
  const registration = Object.assign(new EventTarget(), {
    installing: worker,
    waiting,
    update: vi.fn(),
  })

  return { registration, waiting, worker }
}

function makeServiceWorker(controller: unknown = null) {
  const { registration, waiting, worker } = makeRegistration()
  const getRegistrations = vi.fn(async (): Promise<RegistrationStub[]> => [])
  const serviceWorker = Object.assign(new EventTarget(), {
    controller,
    getRegistrations,
    register: vi.fn(async () => registration),
  })

  return { registration, serviceWorker, waiting, worker }
}

function makeWindow() {
  return Object.assign(new EventTarget(), {
    document,
    location: new URL('https://example.test/app/'),
    setInterval: vi.fn(),
  }) as unknown as Window
}

async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
}

describe('service worker registration', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('only registers in production on supported http protocols', () => {
    const serviceWorker = makeServiceWorker().serviceWorker

    expect(
      shouldRegisterServiceWorker({ isProd: true, protocol: 'https:', serviceWorker })
    ).toBe(true)
    expect(
      shouldRegisterServiceWorker({ isProd: false, protocol: 'https:', serviceWorker })
    ).toBe(false)
    expect(shouldRegisterServiceWorker({ isProd: true, protocol: 'file:', serviceWorker })).toBe(
      false
    )
    expect(shouldRegisterServiceWorker({ isProd: true, protocol: 'https:' })).toBe(false)
  })

  it('does not register or render an update banner in development', async () => {
    const activeRegistration = { unregister: vi.fn(async () => true) }
    const { serviceWorker } = makeServiceWorker({})
    serviceWorker.getRegistrations.mockResolvedValue([activeRegistration])
    const testWindow = makeWindow()

    setupServiceWorkerUpdates({
      isProd: false,
      serviceWorker,
      serviceWorkerUrl: '/sw.js',
      window: testWindow,
      document,
    })
    testWindow.dispatchEvent(new Event('load'))
    await flushMicrotasks()

    expect(serviceWorker.register).not.toHaveBeenCalled()
    expect(activeRegistration.unregister).toHaveBeenCalled()
    expect(document.getElementById(SERVICE_WORKER_UPDATE_BANNER_ID)).toBeNull()
  })

  it('ignores first-install update messages when no worker controlled the page at startup', () => {
    const { serviceWorker } = makeServiceWorker(null)
    const testWindow = makeWindow()

    setupServiceWorkerUpdates({
      isProd: true,
      serviceWorker,
      serviceWorkerUrl: '/sw.js',
      window: testWindow,
      document,
    })

    serviceWorker.dispatchEvent(new MessageEvent('message', { data: { type: 'SW_UPDATED' } }))

    expect(document.getElementById(SERVICE_WORKER_UPDATE_BANNER_ID)?.classList.contains('show')).toBe(
      false
    )
  })

  it('shows an update banner for an installed replacement worker', async () => {
    const { registration, serviceWorker, worker } = makeServiceWorker({})
    const testWindow = makeWindow()

    setupServiceWorkerUpdates({
      isProd: true,
      serviceWorker,
      serviceWorkerUrl: '/sw.js',
      window: testWindow,
      document,
      setInterval: vi.fn() as unknown as Window['setInterval'],
    })
    testWindow.dispatchEvent(new Event('load'))
    await flushMicrotasks()

    registration.dispatchEvent(new Event('updatefound'))
    worker.state = 'installed'
    worker.dispatchEvent(new Event('statechange'))

    expect(document.getElementById(SERVICE_WORKER_UPDATE_BANNER_ID)?.classList.contains('show')).toBe(
      true
    )
  })

  it('posts skip waiting and reloads after the updated worker takes control', async () => {
    const reload = vi.fn()
    const { registration, serviceWorker, waiting, worker } = makeServiceWorker({})
    const testWindow = makeWindow()

    setupServiceWorkerUpdates({
      isProd: true,
      serviceWorker,
      serviceWorkerUrl: '/sw.js',
      window: testWindow,
      document,
      reload,
      setInterval: vi.fn() as unknown as Window['setInterval'],
    })
    testWindow.dispatchEvent(new Event('load'))
    await flushMicrotasks()

    registration.dispatchEvent(new Event('updatefound'))
    worker.state = 'installed'
    worker.dispatchEvent(new Event('statechange'))
    document.querySelector<HTMLButtonElement>('.sw-update-primary')?.click()
    serviceWorker.dispatchEvent(new Event('controllerchange'))

    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
