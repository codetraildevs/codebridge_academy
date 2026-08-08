const CACHE_NAME = 'codebridge-v10';
const ASSETS = [
  '/',
  '/index.html',
  '/404.html',
  '/verify.html',
  '/css/style.min.css',
  '/css/projects.min.css',
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
  '/assets/images/revenue_sharing_app.svg',
  '/assets/images/job_exams_prep.svg',
  '/assets/images/project_overwatch.svg',
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
  return fetch(request)
    .then((networkResponse) => {
      // Cache the fresh response for offline use
      const cloned = networkResponse.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(request, cloned);
      });
      return networkResponse;
    })
    .catch(() => {
      // Network failed — serve from cache
      return caches.match(request);
    });
}

// Fetch: Network-first for all requests, cache as fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests — Cache API only supports GET/HEAD for put()
  if (event.request.method !== 'GET') {
    return;
  }

  // All requests: try network first, fall back to cache
  event.respondWith(networkFirstWithCacheFallback(event.request));
});
