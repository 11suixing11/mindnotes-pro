type ListenerTarget = Pick<EventTarget, 'addEventListener'>

interface ServiceWorkerLike extends ListenerTarget {
  state?: string
}

interface WaitingServiceWorkerLike {
  postMessage: (message: unknown) => void
}

interface ServiceWorkerRegistrationLike extends ListenerTarget {
  installing?: ServiceWorkerLike | null
  waiting?: WaitingServiceWorkerLike | null
  update: () => Promise<unknown> | unknown
}

interface ServiceWorkerContainerLike extends ListenerTarget {
  controller?: unknown
  register: (url: string) => Promise<ServiceWorkerRegistrationLike>
  getRegistrations?: () => Promise<ReadonlyArray<{ unregister: () => Promise<boolean> | boolean }>>
}

interface SetupServiceWorkerOptions {
  isProd?: boolean
  serviceWorker?: ServiceWorkerContainerLike
  serviceWorkerUrl?: string
  document?: Document
  window?: Window
  setInterval?: Window['setInterval']
  reload?: () => void
}

export const SERVICE_WORKER_UPDATE_BANNER_ID = 'sw-update-banner'

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

function getMessageData(event: Event): unknown {
  return 'data' in event ? (event as MessageEvent).data : undefined
}

function getOrCreateUpdateBanner(
  doc: Document,
  onUpdate: () => void
): { element: HTMLElement; show: () => void } {
  const existing = doc.getElementById(SERVICE_WORKER_UPDATE_BANNER_ID)
  if (existing instanceof HTMLElement) {
    return {
      element: existing,
      show: () => existing.classList.add('show'),
    }
  }

  const banner = doc.createElement('div')
  banner.id = SERVICE_WORKER_UPDATE_BANNER_ID
  banner.className = 'sw-update-banner'
  banner.setAttribute('role', 'status')
  banner.setAttribute('aria-live', 'polite')

  const label = doc.createElement('span')
  label.textContent = '有新版本可用'

  const updateButton = doc.createElement('button')
  updateButton.type = 'button'
  updateButton.className = 'sw-update-primary'
  updateButton.textContent = '立即更新'
  updateButton.addEventListener('click', onUpdate)

  const dismissButton = doc.createElement('button')
  dismissButton.type = 'button'
  dismissButton.className = 'sw-update-secondary'
  dismissButton.textContent = '稍后'
  dismissButton.addEventListener('click', () => banner.classList.remove('show'))

  banner.append(label, updateButton, dismissButton)
  doc.body.appendChild(banner)

  return {
    element: banner,
    show: () => banner.classList.add('show'),
  }
}

export function setupServiceWorkerUpdates(options: SetupServiceWorkerOptions = {}): void {
  const win = options.window ?? window
  const doc = options.document ?? win.document
  const serviceWorker = options.serviceWorker ?? win.navigator.serviceWorker
  const isProd = options.isProd ?? import.meta.env.PROD

  if (!isProd) {
    if (canManageServiceWorkers({ protocol: win.location.protocol, serviceWorker })) {
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

  const setIntervalFn = options.setInterval ?? win.setInterval.bind(win)
  const reload = options.reload ?? (() => win.location.reload())
  const serviceWorkerUrl = options.serviceWorkerUrl ?? new URL('sw.js', win.location.href).toString()
  const hadControllerAtStartup = Boolean(serviceWorker.controller)
  let registration: ServiceWorkerRegistrationLike | null = null
  let controllerChangeBound = false

  const banner = getOrCreateUpdateBanner(doc, () => {
    registration?.waiting?.postMessage({ type: 'SKIP_WAITING' })
    if (!controllerChangeBound) {
      controllerChangeBound = true
      serviceWorker.addEventListener('controllerchange', reload)
    }
  })

  const showUpdateBanner = () => banner.show()

  serviceWorker.addEventListener('message', (event: Event) => {
    const data = getMessageData(event)
    if (
      hadControllerAtStartup &&
      typeof data === 'object' &&
      data !== null &&
      'type' in data &&
      data.type === 'SW_UPDATED'
    ) {
      showUpdateBanner()
    }
  })

  win.addEventListener('load', () => {
    void serviceWorker
      .register(serviceWorkerUrl)
      .then((reg) => {
        registration = reg
        setIntervalFn(() => void reg.update(), 60 * 60 * 1000)

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && serviceWorker.controller) {
              showUpdateBanner()
            }
          })
        })
      })
      .catch(() => undefined)
  })
}
