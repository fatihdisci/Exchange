// Basit PWA önbellekleyici
const STATIC_CACHE = 'static-v1';
const RUNTIME_CACHE = 'runtime-v1';
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
      Promise.all(keys.filter(k => ![STATIC_CACHE,RUNTIME_CACHE].includes(k)).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// API: network-first; Diğerleri: cache-first
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin.includes('exchangerate.host')) {
    e.respondWith(networkFirst(e.request));
  } else {
    e.respondWith(cacheFirst(e.request));
  }
});

async function cacheFirst(req){
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req){
  const runtime = await caches.open(RUNTIME_CACHE);
  try{
    const fresh = await fetch(req, {cache:'no-store'});
    runtime.put(req, fresh.clone());
    return fresh;
  }catch(_){
    const cached = await runtime.match(req);
    if (cached) return cached;
    return new Response(JSON.stringify({error:'offline'}), {status: 503, headers:{'Content-Type':'application/json'}});
  }
}