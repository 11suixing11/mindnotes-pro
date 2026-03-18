// MindNotes Pro Service Worker
// 提供离线缓存和后台同步功能

const CACHE_NAME = 'mindnotes-pro-v1'
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
]

// 安装事件 - 缓存核心资源
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell')
        return cache.addAll(urlsToCache)
      })
      .then(() => {
        console.log('[Service Worker] Installation complete, skipping waiting')
        return self.skipWaiting()
      })
  )
})

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      console.log('[Service Worker] Activation complete')
      return self.clients.claim()
    })
  )
})

// 获取事件 - 网络优先，离线时返回缓存
self.addEventListener('fetch', (event) => {
  // 跳过非 GET 请求
  if (event.request.method !== 'GET') {
    return
  }

  // 跳过跨域请求
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 网络请求成功，更新缓存
        if (response.status === 200) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // 网络失败，返回缓存
        console.log('[Service Worker] Fetch failed, returning cached:', event.request.url)
        return caches.match(event.request)
      })
  )
})

// 后台同步（可选功能）
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Sync event:', event.tag)
  if (event.tag === 'sync-notes') {
    event.waitUntil(syncNotes())
  }
})

async function syncNotes() {
  // 这里可以实现笔记的后台同步逻辑
  console.log('[Service Worker] Syncing notes...')
}

// 推送通知（可选功能）
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received')
  const options = {
    body: event.data?.text() || '新通知',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
  }

  event.waitUntil(
    self.registration.showNotification('MindNotes Pro', options)
  )
})

console.log('[Service Worker] Script loaded')
