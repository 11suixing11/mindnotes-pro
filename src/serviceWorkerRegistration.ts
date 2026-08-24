interface ServiceWorkerRegistrationLike {
  update: () => Promise<unknown> | unknown
  waiting?: ServiceWorkerLike | null
  installing?: ServiceWorkerLike | null
  addEventListener?: (type: 'updatefound', listener: () => void) => void
}

interface ServiceWorkerLike {
  state?: string
  postMessage: (message: unknown) => void
  addEventListener?: (type: 'statechange', listener: () => void) => void
}

interface ServiceWorkerContainerLike {
  register: (url: string) => Promise<ServiceWorkerRegistrationLike>
  getRegistrations?: () => Promise<ReadonlyArray<{ unregister: () => Promise<boolean> | boolean }>>
  controller?: ServiceWorkerLike | null
  addEventListener?: (type: 'controllerchange', listener: () => void) => void
}

interface SetupServiceWorkerOptions {
  isProd?: boolean
  serviceWorker?: ServiceWorkerContainerLike
  serviceWorkerUrl?: string
  /** Override Vite's base URL in tests or embedders. */
  baseUrl?: string
  window?: Window
  setInterval?: Window['setInterval']
}

export function resolveServiceWorkerUrl(baseUrl: string, href: string): string {
  const base = new URL(baseUrl || './', href)
  return new URL('sw.js', base).toString()
}

export function shouldRegisterServiceWorker({
  isProd,
  protocol,
  serviceWorker,
}: {
  isProd: boolean
  protocol: string
  serviceWorker?: ServiceWorkerContainerLike
}): boolean {
  return Boolean(isProd && serviceWorker && (protocol === 'http:' || protocol === 'https:'))
}

function canManageServiceWorkers({
  protocol,
  serviceWorker,
}: {
  protocol: string
  serviceWorker?: ServiceWorkerContainerLike
}): boolean {
  return Boolean(serviceWorker && (protocol === 'http:' || protocol === 'https:'))
}

function unregisterExistingServiceWorkers(serviceWorker: ServiceWorkerContainerLike): void {
  if (!serviceWorker.getRegistrations) return
  void serviceWorker
    .getRegistrations()
    .then((registrations) =>
      Promise.all(registrations.map((registration) => registration.unregister()))
    )
    .catch(() => undefined)
}

function activateWaitingWorker(registration: ServiceWorkerRegistrationLike): void {
  registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
}

function listenForWaitingWorker(
  registration: ServiceWorkerRegistrationLike,
  serviceWorker: ServiceWorkerContainerLike
): void {
  if (!serviceWorker.controller) return
  registration.addEventListener?.('updatefound', () => {
    const installingWorker = registration.installing
    installingWorker?.addEventListener?.('statechange', () => {
      if (installingWorker.state === 'installed') activateWaitingWorker(registration)
    })
  })
  activateWaitingWorker(registration)
}

export function setupServiceWorkerUpdates(options: SetupServiceWorkerOptions = {}): void {
  const win = options.window ?? window
  const serviceWorker = options.serviceWorker ?? win.navigator.serviceWorker
  const isProd = options.isProd ?? import.meta.env.PROD

  if (!isProd) {
    if (
      serviceWorker &&
      canManageServiceWorkers({ protocol: win.location.protocol, serviceWorker })
    ) {
      unregisterExistingServiceWorkers(serviceWorker)
    }
    return
  }

  if (
    !shouldRegisterServiceWorker({
      isProd,
      protocol: win.location.protocol,
      serviceWorker,
    })
  ) {
    return
  }
  if (!serviceWorker) return

  const setIntervalFn = options.setInterval ?? win.setInterval.bind(win)
  const serviceWorkerUrl =
    options.serviceWorkerUrl ??
    resolveServiceWorkerUrl(options.baseUrl ?? import.meta.env.BASE_URL, win.location.href)
  const hadControllerBeforeRegistration = Boolean(serviceWorker.controller)
  let refreshPending = false

  serviceWorker.addEventListener?.('controllerchange', () => {
    if (!hadControllerBeforeRegistration || refreshPending || !serviceWorker.controller) return
    refreshPending = true
    win.location.reload()
  })

  win.addEventListener('load', () => {
    void serviceWorker
      .register(serviceWorkerUrl)
      .then((registration) => {
        listenForWaitingWorker(registration, serviceWorker)
        setIntervalFn(() => void registration.update(), 60 * 60 * 1000)
      })
      .catch(() => undefined)
  })
}
