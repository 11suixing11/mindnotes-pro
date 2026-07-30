interface ServiceWorkerRegistrationLike {
  update: () => Promise<unknown> | unknown
}

interface ServiceWorkerContainerLike {
  register: (url: string) => Promise<ServiceWorkerRegistrationLike>
  getRegistrations?: () => Promise<ReadonlyArray<{ unregister: () => Promise<boolean> | boolean }>>
}

interface SetupServiceWorkerOptions {
  isProd?: boolean
  serviceWorker?: ServiceWorkerContainerLike
  serviceWorkerUrl?: string
  window?: Window
  setInterval?: Window['setInterval']
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

export function setupServiceWorkerUpdates(options: SetupServiceWorkerOptions = {}): void {
  const win = options.window ?? window
  const serviceWorker = options.serviceWorker ?? win.navigator.serviceWorker
  const isProd = options.isProd ?? import.meta.env.PROD

  if (!isProd) {
    if (serviceWorker && canManageServiceWorkers({ protocol: win.location.protocol, serviceWorker })) {
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
  const serviceWorkerUrl = options.serviceWorkerUrl ?? new URL('sw.js', win.location.href).toString()

  win.addEventListener('load', () => {
    void serviceWorker
      .register(serviceWorkerUrl)
      .then((registration) => {
        setIntervalFn(() => void registration.update(), 60 * 60 * 1000)
      })
      .catch(() => undefined)
  })
}
