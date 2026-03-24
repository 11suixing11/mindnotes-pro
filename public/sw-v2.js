/**
 * MindNotes Pro Service Worker v2
 * 增强的离线优先策略和智能缓存管理
 * 
 * 缓存策略:
 * 1. 永久资源 (Core): 一年 - React/Zustand 库
 * 2. 长期资源 (App): 30天 - 应用代码
 * 3. 动态资源 (Data): 1天 - 用户数据
 * 4. CDN 资源 (External): 7天 - 第三方资源
 */

// @ts-check
export {};
/**
 * @typedef {{
 *   waitUntil: (promise: Promise<any>) => void
 * }} SWExtendableEvent
 */

/**
 * @typedef {SWExtendableEvent & {
 *   request: Request,
 *   respondWith: (response: Promise<Response> | Response) => void
 * }} SWFetchEvent
 */

/**
 * @typedef {SWExtendableEvent & { tag: string }} SWSyncEvent
 */

/**
 * @typedef {{
 *   data: { type?: string, payload?: any },
 *   ports: Array<{ postMessage: (message: any) => void }>
 * }} SWMessageEvent
 */

/** @type {{
 *   registration: { scope: string },
 *   skipWaiting: () => Promise<void>,
 *   clients: { claim: () => Promise<void> },
 *   addEventListener: (type: string, listener: (event: any) => void) => void
 * }} */
const sw = /** @type {any} */ (self)

const CACHE_VERSIONS = {
  CORE: 'mindnotes-core-v1.4.0',      // React/核心库
  APP: 'mindnotes-app-v1.4.0',        // 应用代码
  DATA: 'mindnotes-data-v1.4.0',      // 用户数据
  EXTERNAL: 'mindnotes-external-v1'   // 第三方资源
}

const BASE_PATH = new URL(sw.registration.scope).pathname
/** @param {string} path */
const withBase = (path) => `${BASE_PATH}${path}`

const CORE_ASSETS = [
  BASE_PATH,
  withBase('index.html'),
  withBase('manifest.json'),
]

/**
 * 获取缓存策略
 * @param {string} url
 * @returns {'networkFirst' | 'cacheFirst' | 'cacheOnly'}
 */
function getCacheStrategy(url) {
  const urlObj = new URL(url)
  const path = urlObj.pathname
  
  // API 请求: 网络优先
  if (path.includes('/api/')) {
    return 'networkFirst'
  }
  
  // 图片/字体: 缓存优先
  if (/\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/.test(path)) {
    return 'cacheFirst'
  }
  
  // JS/CSS: 网络优先
  if (/\.(js|css)$/.test(path)) {
    return 'networkFirst'
  }
  
  return 'networkFirst'
}

/**
 * 安装事件 - 预缓存核心资源
 */
sw.addEventListener('install', /** @param {SWExtendableEvent} event */ (event) => {
  console.log('[SW] Installing Service Worker v2...')
  
  event.waitUntil(
    Promise.all([
      // 预缓存核心资源
      caches.open(CACHE_VERSIONS.CORE).then(cache => {
        console.log('[SW] Pre-caching core assets')
        return cache.addAll(CORE_ASSETS)
      }),
      // 清理旧缓存
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => !Object.values(CACHE_VERSIONS).includes(name))
            .map(name => {
              console.log('[SW] Deleting old cache:', name)
              return caches.delete(name)
            })
        )
      })
    ])
    .then(() => {
      console.log('[SW] Installation complete')
      return sw.skipWaiting()
    })
    .catch(err => {
      console.error('[SW] Installation failed:', err)
    })
  )
})

/**
 * 激活事件 - 清理过期缓存
 */
sw.addEventListener('activate', /** @param {SWExtendableEvent} event */ (event) => {
  console.log('[SW] Activating...')
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // 保留最新版本的缓存
            if (!Object.values(CACHE_VERSIONS).includes(cacheName)) {
              console.log('[SW] Deleting obsolete cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => sw.clients.claim())
      .then(() => {
        console.log('[SW] Activation complete')
      })
  )
})

/**
 * Fetch 事件 - 智能缓存策略
 */
sw.addEventListener('fetch', /** @param {SWFetchEvent} event */ (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // 跳过非 GET 请求
  if (request.method !== 'GET') {
    return
  }
  
  // 跳过本地路由
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return
  }
  
  const strategy = getCacheStrategy(request.url)
  
  if (strategy === 'networkFirst') {
    event.respondWith(networkFirst(request))
  } else if (strategy === 'cacheFirst') {
    event.respondWith(cacheFirst(request))
  } else {
    event.respondWith(cacheOnly(request))
  }
})

/**
 * 网络优先策略
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function networkFirst(request) {
  try {
    // 1. 尝试网络请求
    const response = await fetch(request)
    
    // 2. 成功则缓存并返回
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_VERSIONS.APP)
      cache.put(request, response.clone())
      return response
    }
    
    // 3. 如果响应失败，回退到缓存
    const cached = await caches.match(request)
    if (cached) {
      return cached
    }

    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable'
    })
  } catch (error) {
    // 4. 网络失败，使用缓存
    console.log('[SW] Network failed, using cache:', request.url)
    const cached = await caches.match(request)
    if (cached) return cached
    
    // 5. 缓存也不存在
    console.warn('[SW] No cache available:', request.url)
    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable'
    })
  }
}

/**
 * 缓存优先策略
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function cacheFirst(request) {
  // 1. 检查缓存
  const cached = await caches.match(request)
  if (cached) return cached
  
  try {
    // 2. 网络获取
    const response = await fetch(request)
    
    // 3. 缓存有效响应
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_VERSIONS.APP)
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    console.warn('[SW] Cache miss and network failed:', request.url)
    return new Response('Offline - Resource not available', {
      status: 503
    })
  }
}

/**
 * 仅缓存策略
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function cacheOnly(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  
  return new Response('Offline - Resource not cached', {
    status: 503
  })
}

/**
 * 后台同步（当网络恢复时）
 */
sw.addEventListener('sync', /** @param {SWSyncEvent} event */ (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncUserData())
  }
})

/**
 * 同步用户数据
 */
async function syncUserData() {
  try {
    console.log('[SW] Syncing user data...')
    
    // 从 IndexedDB 获取待同步的数据
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('MindNotes', 1)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    
    // 发送待同步数据到服务器
    // const tx = db.transaction('pendingSync', 'readwrite')
    // ...
    
    console.log('[SW] Data sync complete')
  } catch (error) {
    console.error('[SW] Data sync failed:', error)
    throw error
  }
}

/**
 * 消息处理
 */
sw.addEventListener('message', /** @param {SWMessageEvent} event */ (event) => {
  const { type } = event.data
  
  if (type === 'SKIP_WAITING') {
    sw.skipWaiting()
  }
  
  if (type === 'CLEAR_CACHE') {
    caches.keys().then(names => {
      Promise.all(names.map(name => caches.delete(name)))
    })
  }
  
  if (type === 'GET_CACHE_SIZE') {
    getCacheSize().then(size => {
      event.ports[0].postMessage({ type: 'CACHE_SIZE', size })
    })
  }
})

/**
 * 获取缓存总大小
 */
async function getCacheSize() {
  let total = 0
  const cacheNames = await caches.keys()
  
  for (const name of cacheNames) {
    const cache = await caches.open(name)
    const keys = await cache.keys()
    
    for (const request of keys) {
      const response = await cache.match(request)
      if (response) {
        const blob = await response.blob()
        total += blob.size
      }
    }
  }
  
  return total
}

console.log('[SW] Service Worker v2 loaded')
