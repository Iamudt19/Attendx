const CACHE_NAME = 'attendx-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install: Cache core application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Only handle GET requests for local static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only GET requests can be cached by Cache API
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Do not cache external APIs, backend endpoints, or dynamic storage
  if (
    url.pathname.startsWith('/api') || 
    url.pathname.startsWith('/storage') || 
    url.hostname.includes('hf.space') || 
    url.hostname.includes('supabase.co') ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // Stale-while-revalidate for static assets (HTML, JS, CSS, fonts)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
