const CACHE_VERSION = 'v4.0';
const CACHE_NAME = `mindnotes-${CACHE_VERSION}`;
const STATIC_CACHE = `mindnotes-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `mindnotes-runtime-${CACHE_VERSION}`;

// Static assets to precache on install
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
];

// File extensions considered static assets (cache-first strategy)
const STATIC_EXTENSIONS = [
  '.js', '.css', '.html', '.json',
  '.png', '.jpg', '.jpeg', '.svg', '.gif', '.ico', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
];

// Paths that are API/data requests (network-first strategy)
const API_PATHS = ['/api/', '/graphql', '/auth/'];

function isStaticAsset(url) {
  const pathname = url.pathname.toLowerCase();
  // Root and index.html
  if (pathname === '/' || pathname === '/index.html') return true;
  // Check extension
  return STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

function isApiRequest(url) {
  const pathname = url.pathname.toLowerCase();
  return API_PATHS.some((p) => pathname.includes(p));
}

// ── Install: precache critical shell assets ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ──
self.addEventListener('activate', (event) => {
  const currentCaches = new Set([STATIC_CACHE, RUNTIME_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !currentCaches.has(k)).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
      .then(() => {
        // Notify all clients that a new SW version is active
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) =>
            client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION })
          );
        });
      })
  );
});

// ── Fetch handler with strategy routing ──
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and non-http(s) schemes
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (event.request.url.includes('chrome-extension')) return;
  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') return;

  // Strategy 1: API requests → Network-first (try network, fall back to cache)
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Strategy 2: Static assets → Cache-first (serve from cache, update in background)
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // Stale-while-revalidate: return cache immediately, update in background
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const clone = networkResponse.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => null); // Silently fail if offline

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Strategy 3: Everything else → Network with runtime cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── Listen for skip-waiting message from client ──
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
