const CACHE_NAME = 'codebridge-v18';
const ASSETS = [
  '/',
  '/index.html',
  '/forms.partial.min.html',
  '/404.html',
  '/verify.html',
  '/css/style.min.css',
  '/css/projects.min.css',
  '/css/services.min.css',
  '/css/verify.css',
  '/js/script.min.js',
  '/js/verify.js',
  '/assets/images/update_logo.webp',
  '/assets/images/update_logo.png',
  '/assets/images/about_section.webp',
  '/assets/images/play_store_img.webp',
  '/assets/images/play_store_icon.webp',
  '/assets/images/play_store_icon.png',
  '/assets/images/home_cdmis.webp',
  '/assets/images/placeholder.svg',
  '/manifest.json'
];

// Install: Cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Helper: Network-first strategy with cache fallback
function networkFirstWithCacheFallback(request) {
  // Navigations must bypass the browser HTTP cache — a heuristically-fresh
  // stale document would otherwise be served without ever hitting the server.
  const fetchInit = request.mode === 'navigate' ? { cache: 'reload' } : undefined;
  return fetch(request, fetchInit)
    .then((networkResponse) => {
      // Cache the fresh response for offline use
      const cloned = networkResponse.clone();
      caches.open(CACHE_NAME)
        .then((cache) => cache.put(request, cloned))
        .catch(() => {/* ignore uncacheable responses (opaque, unsupported schemes, quota) */});
      return networkResponse;
    })
    .catch(() => {
      // Network failed — serve from cache. ignoreSearch lets versioned
      // URLs (?v=<hash>) match their unversioned precached copies.
      return caches.match(request, { ignoreSearch: true });
    });
}

// Fetch: Network-first for all requests, cache as fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests — Cache API only supports GET/HEAD for put()
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip unsupported schemes (chrome-extension://, about:, blob:, etc.) —
  // cache.put() throws on requests that aren't http/https
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // All requests: try network first, fall back to cache
  event.respondWith(networkFirstWithCacheFallback(event.request));
});
