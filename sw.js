/**
 * GymRise
 * Файл: sw.js
 * Версия: 52.0.0
 * Автор и правообладатель: © Alexulyanovsk
 */

const CACHE_NAME = 'gymrise-v52';

const APP_SHELL = [
  '/GymRise/',
  '/GymRise/index.html',
  '/GymRise/styles.css',
  '/GymRise/manifest.json',
  '/GymRise/icon.svg',
  '/GymRise/icon-maskable.svg',
  '/GymRise/screenshot-1.png',
  '/GymRise/js/boot.js',
  '/GymRise/js/main.js',
  '/GymRise/js/ui.js',
  '/GymRise/js/state.js',
  '/GymRise/js/data.js',
  '/GymRise/js/db.js',
  '/GymRise/js/bridge.js',
  '/GymRise/js/utils.js',
  '/GymRise/js/generator.js',
  '/GymRise/js/share.js'
];

function safePut(cache, request, response) {
  if (!response || !response.ok) return;
  try { cache.put(request, response.clone()); } catch(_) {}
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => { if (key !== CACHE_NAME) return caches.delete(key); })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          caches.open(CACHE_NAME).then((cache) => safePut(cache, e.request, res));
          return res;
        }).catch(() => cached || Response.error());
      })
    );
    return;
  }

  if (url.hostname === 'd3d2ynhodh9o1z.cloudfront.net') {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          caches.open(CACHE_NAME).then((cache) => safePut(cache, e.request, res));
          return res;
        }).catch(() => cached || Response.error());
      })
    );
    return;
  }

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            caches.open(CACHE_NAME).then((cache) => safePut(cache, e.request, res));
          }
          return res;
        })
        .catch(async () => {
          return (await caches.match('/GymRise/index.html')) ||
                 (await caches.match('/GymRise/')) ||
                 new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        })
    );
    return;
  }

  if (url.pathname.startsWith('/GymRise/') && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const fetchPromise = fetch(e.request).then((res) => {
          if (res.ok) {
            caches.open(CACHE_NAME).then((cache) => safePut(cache, e.request, res));
          }
          return res;
        }).catch(() => cached || Response.error());
        return cached || fetchPromise;
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).catch(() => Response.error()))
  );
});

/* © Alexulyanovsk */
