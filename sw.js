const CACHE_NAME = 'codebridge-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/404.html',
  '/verify.html',
  '/css/style.css',
  '/css/projects.css',
  '/css/verify.css',
  '/js/script.js',
  '/js/verify.js',
  '/assets/images/update_logo.png',
  '/assets/images/about_section.webp',
  '/assets/images/play_store_img.webp',
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

// Helper: Is this a navigation request for an HTML page?
function isHTMLNavigation(request) {
  return (
    request.mode === 'navigate' ||
    (request.method === 'GET' &&
      request.headers.get('Accept') &&
      request.headers.get('Accept').includes('text/html'))
  );
}

// Fetch: Network-first for HTML pages, Cache-first for static assets
self.addEventListener('fetch', (event) => {
  // HTML pages: try network first, fall back to cache
  if (isHTMLNavigation(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Update cache with the fresh response
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
          return networkResponse;
        })
        .catch(() => {
          // Network failed — serve from cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Static assets (CSS, JS, images, manifest): cache-first
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache new static assets
        const cloned = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, cloned);
        });
        return networkResponse;
      });
    })
  );
});
