// MindNotes Pro Service Worker
// 网络优先 + 离线回退策略

const CACHE_NAME = 'mindnotes-v1.2.0'
const BASE = '/mindnotes-pro'

const CORE_ASSETS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/offline.html`,
  `${BASE}/manifest.json`,
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // 跳过非 GET 请求
  if (request.method !== 'GET') return

  // 跳过外部请求
  if (!request.url.startsWith(self.location.origin)) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        // 缓存成功的响应
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => {
        // 离线回退：从缓存读取
        return caches.match(request).then((cached) => {
          if (cached) return cached
          // HTML 请求回退到离线页
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match(`${BASE}/offline.html`)
          }
          return new Response('Offline', { status: 503 })
        })
      })
  )
})
