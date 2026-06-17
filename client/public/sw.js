/* GCS service worker — dependency-free PWA shell.
 *
 * Strategy:
 *  - Navigations: network-first (so new deploys are picked up immediately),
 *    falling back to the cached app shell when offline.
 *  - Static assets (hashed JS/CSS/fonts/images): cache-first.
 *  - NEVER cache /api or /uploads — those must always hit the network so data
 *    and auth are never stale or leaked across sessions.
 *
 * Bump CACHE when you want to force-drop old caches on the next deploy.
 */
const CACHE = 'gcs-v1';
const SHELL = ['/', '/manifest.webmanifest', '/app-icon.svg', '/favicon.svg'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Always go straight to the network for the API and uploaded files.
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/uploads')) return;

  // App navigations: network-first with offline fallback to the cached shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put('/', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/').then((cached) => cached || caches.match(request)))
    );
    return;
  }

  // Static assets: cache-first, then network (and cache the result).
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});
