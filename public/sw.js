const CACHE_VERSION = 'wanderling-cache-v9';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  const uniqueUrls = Array.from(new Set(PRECACHE_URLS.filter(Boolean)));
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(uniqueUrls))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.ok &&
          (networkResponse.type === 'basic' || networkResponse.type === 'default')
        ) {
          const copy = networkResponse.clone();
          event.waitUntil(
            caches
              .open(CACHE_VERSION)
              .then((cache) => cache.put(req, copy))
              .catch(() => {})
          );
        }
        return networkResponse;
      })
      .catch(async () => {
        const activeCache = await caches.open(CACHE_VERSION);
        const cached = (await activeCache.match(req)) || (await caches.match(req));
        if (cached) {
          return cached;
        }
        const acceptHeader = req.headers ? req.headers.get('accept') || '' : '';
        if (req.mode === 'navigate' || acceptHeader.includes('text/html')) {
          const fallback =
            (await activeCache.match('./index.html')) || (await caches.match('./index.html'));
          if (fallback) return fallback;
          const rootFallback =
            (await activeCache.match('./')) || (await caches.match('./'));
          if (rootFallback) return rootFallback;
        }
        return new Response('Offline — resource not cached yet.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      })
  );
});
