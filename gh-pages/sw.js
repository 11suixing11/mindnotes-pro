// MindNotes Pro Service Worker
// 离线优先策略，确保离线可用

const CACHE_NAME = 'mindnotes-pro-v1.1.3'
const OFFLINE_URL = '/offline.html'

// 核心资源（必须缓存）
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

// 安装事件 - 预缓存核心资源
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching core assets')
        return cache.addAll(CORE_ASSETS)
      })
      .then(() => {
        console.log('[SW] Installation complete, skipping waiting')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error)
      })
  )
})

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...')
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('[SW] Activation complete')
        return self.clients.claim()
      })
  )
})

// 获取事件 - 离线优先策略
self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return

  // 跳过非本域请求（CDN、API 等）
  const isSameOrigin = event.request.url.startsWith(self.location.origin)
  if (!isSameOrigin) {
    // 对于 CDN 资源，使用网络优先
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone)
          })
          return response
        })
        .catch(() => {
          return caches.match(event.request)
        })
    )
    return
  }

  // 本域资源：离线优先
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', event.request.url)
          // 后台更新缓存
          fetchAndCache(event.request)
          return cachedResponse
        }

        // 缓存未命中，尝试网络
        return fetchAndCache(event.request)
          .catch(() => {
            // 网络失败，返回离线页面
            console.log('[SW] Offline, serving offline page')
            return caches.match(OFFLINE_URL)
          })
      })
  )
})

// 网络请求并缓存
async function fetchAndCache(request) {
  const response = await fetch(request)
  
  // 只缓存成功响应
  if (response.status === 200) {
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, response.clone())
  }
  
  return response
}

// 消息处理
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

console.log('[SW] Service Worker loaded')
