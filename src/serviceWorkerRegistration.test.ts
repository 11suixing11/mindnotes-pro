import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupServiceWorkerUpdates, shouldRegisterServiceWorker } from './serviceWorkerRegistration'

function makeServiceWorker() {
  const registration = { update: vi.fn() }
  const getRegistrations = vi.fn(async () => [] as Array<{ unregister: () => Promise<boolean> }>)
  const serviceWorker = {
    getRegistrations,
    register: vi.fn(async () => registration),
  }
  return { registration, serviceWorker }
}

function makeWindow() {
  return Object.assign(new EventTarget(), {
    navigator: {},
    location: new URL('https://example.test/app/'),
    setInterval: vi.fn(),
  }) as unknown as Window
}

async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
}

describe('service worker registration', () => {
  beforeEach(() => vi.clearAllMocks())

  it('only registers in production on supported HTTP protocols', () => {
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

  it('unregisters stale workers in development without registering a new one', async () => {
    const unregister = vi.fn(async () => true)
    const { serviceWorker } = makeServiceWorker()
    serviceWorker.getRegistrations.mockResolvedValue([{ unregister }])
    const testWindow = makeWindow()

    setupServiceWorkerUpdates({ isProd: false, serviceWorker, window: testWindow })
    testWindow.dispatchEvent(new Event('load'))
    await flushMicrotasks()

    expect(unregister).toHaveBeenCalledOnce()
    expect(serviceWorker.register).not.toHaveBeenCalled()
  })

  it('registers on load and checks for updates once per hour', async () => {
    const { registration, serviceWorker } = makeServiceWorker()
    const testWindow = makeWindow()
    const setInterval = vi.fn()

    setupServiceWorkerUpdates({
      isProd: true,
      serviceWorker,
      serviceWorkerUrl: '/app/sw.js',
      window: testWindow,
      setInterval: setInterval as unknown as Window['setInterval'],
    })
    testWindow.dispatchEvent(new Event('load'))
    await flushMicrotasks()

    expect(serviceWorker.register).toHaveBeenCalledWith('/app/sw.js')
    expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 60 * 60 * 1000)
    const updateCallback = setInterval.mock.calls[0][0] as () => void
    updateCallback()
    expect(registration.update).toHaveBeenCalledOnce()
  })

  it('does not add UI or throw when registration fails', async () => {
    const { serviceWorker } = makeServiceWorker()
    serviceWorker.register.mockRejectedValue(new Error('offline'))
    const testWindow = makeWindow()

    setupServiceWorkerUpdates({ isProd: true, serviceWorker, window: testWindow })
    testWindow.dispatchEvent(new Event('load'))
    await flushMicrotasks()

    expect(document.body.childElementCount).toBe(0)
  })
})
