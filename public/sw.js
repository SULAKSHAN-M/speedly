const CACHE = 'speedly-v4-5-0-shell-1';
const SHELL = ['/', '/index.html', '/favicon.svg', '/favicon-32.png', '/favicon.ico', '/apple-touch-icon.png', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('speedly-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  // Do not cache any third-party speed measurements, IP lookups, or uploads.
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/__')) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }
  event.respondWith(fetch(req).then(res => {
    if (res.ok && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname.endsWith('.svg'))) {
      const copy = res.clone(); caches.open(CACHE).then(cache => cache.put(req, copy));
    }
    return res;
  }).catch(() => caches.match(req)));
});
