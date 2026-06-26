const CACHE = 'hb13-beta394';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./index.html','./manifest.json'])));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (!url.origin.includes('github.io') && !url.pathname.startsWith('/HomeBull')) return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r && r.status === 200) {
        caches.open(CACHE).then(c => c.put(e.request, r.clone()));
      }
      return r;
    }).catch(() => caches.match(e.request))
  );
});
