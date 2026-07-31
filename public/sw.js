const CACHE_VERSION = 'v4.0.0'
const STATIC_CACHE = `mindnotes-static-${CACHE_VERSION}`
const RUNTIME_CACHE = `mindnotes-runtime-${CACHE_VERSION}`

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
]

const STATIC_EXTENSIONS = [
  '.js',
  '.css',
  '.html',
  '.json',
  '.png',
  '.jpg',
  '.jpeg',
  '.svg',
  '.gif',
  '.ico',
  '.webp',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
]

function isNavigationRequest(request) {
  return request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')
}

function isStaticAsset(url) {
  const pathname = url.pathname.toLowerCase()
  return pathname.endsWith('/') || STATIC_EXTENSIONS.some((extension) => pathname.endsWith(extension))
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)))
})

self.addEventListener('activate', (event) => {
  const activeCaches = new Set([STATIC_CACHE, RUNTIME_CACHE])
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !activeCaches.has(key)).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return

  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            void caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(async () => {
          const cached = (await caches.match(request)) || (await caches.match('./index.html'))
          return cached || new Response('MindNotes Pro 当前处于离线状态', { status: 503 })
        })
    )
    return
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fresh = fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            void caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        if (cached) {
          event.waitUntil(fresh.catch(() => undefined))
          return cached
        }
        return fresh.catch(async () => {
          const fallback = await caches.match(request)
          return fallback || new Response('资源暂时不可用', { status: 503 })
        })
      })
    )
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
      .catch(async () =>
        (await caches.match(request)) || new Response('资源暂时不可用', { status: 503 })
      )
  )
})
