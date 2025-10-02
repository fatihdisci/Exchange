// PWA cache — HTML/JS için network-first, diğerlerinde cache-first
const STATIC_CACHE = 'static-manual-v4'; // <- versiyon arttırıldı

const CORE = [
  './',
  './index.html',
  './app.js?v=3', // versiyonlu
  './manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STATIC_CACHE).then(c => c.addAll(CORE)));
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
  const url = new URL(e.request.url);
  const isSameOrigin = url.origin === location.origin;
  const isHTML = e.request.mode === 'navigate' || (url.pathname.endsWith('.html'));
  const isJS = url.pathname.endsWith('.js');

  if (isSameOrigin && (isHTML || isJS)) {
    // HTML/JS: network-first → güncel kodlar kesin gelsin
    e.respondWith(networkFirst(e.request));
  } else {
    // diğerleri: cache-first
    e.respondWith(cacheFirst(e.request));
  }
});

async function networkFirst(req){
  const cache = await caches.open(STATIC_CACHE);
  try{
    const fresh = await fetch(req, {cache:'no-store'});
    if (fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  }catch(_){
    const cached = await cache.match(req);
    if (cached) return cached;
    throw _;
  }
}

async function cacheFirst(req){
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) cache.put(req, res.clone());
  return res;
}
