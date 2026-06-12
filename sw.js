const CACHE_NAME = 'codebridge-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/404.html',
  '/verify.html',
  '/css/style.css',
  '/css/verify.css',
  '/js/script.js',
  '/js/verify.js',
  '/assets/images/codebridge_academy_logo.svg',
  '/assets/images/new_logo.png',
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

// Fetch: Serve from cache, then network (Cache First strategy for static assets)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
