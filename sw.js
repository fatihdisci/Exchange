// Basit cache: tamamen offline çalışır; canlı istek yok.
const STATIC_CACHE = 'static-manual-v1';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STATIC_CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request).then(net => {
      // statikleri güncelle
      if (net && net.ok && e.request.method === 'GET' && new URL(e.request.url).origin === location.origin) {
        caches.open(STATIC_CACHE).then(c => c.put(e.request, net.clone()));
      }
      return net;
    }).catch(() => res))
  );
});
