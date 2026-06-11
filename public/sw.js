const CACHE_VERSION = 'v3.3'; // 更新版本以强制清除旧缓存，增强安全性
const CACHE_NAME = `mindnotes-${CACHE_VERSION}`;
const PRECACHE = [
  './',
  './index.html',
  // 可以添加其他静态资源，但基于当前任务保持原样
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求，避免缓存非安全操作
  if (event.request.method !== 'GET') return
  // 跳过 chrome-extension 请求，防止潜在冲突
  if (event.request.url.includes('chrome-extension')) return
  // 跳过非同源或特定缓存模式的请求，减少缓存投毒风险
  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') return

  // 安全检查：只缓存静态资源，防止动态或敏感数据缓存
  const staticAssetExtensions = ['.html', '.js', '.css', '.json', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.woff', '.woff2', '.ttf', '.eot'];
  const url = new URL(event.request.url);
  const pathname = url.pathname.toLowerCase();
  const isStaticAsset = staticAssetExtensions.some(ext => pathname.endsWith(ext)) || pathname === '/' || pathname === '/index.html';

  if (!isStaticAsset) {
    // 对于非静态资源（如 API 请求），直接使用网络请求，不缓存以避免泄露敏感信息
    event.respondWith(fetch(event.request));
    return;
  }

  // 对于静态资源，使用网络优先策略，确保获取最新版本，并更新缓存
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 只缓存成功的同源响应，避免缓存跨域或错误内容
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // 如果网络失败，尝试从缓存中获取
        return caches.match(event.request);
      })
  );
})