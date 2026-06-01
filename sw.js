const CACHE_VERSION = 'homebull-v13.1.0';
const CDN_CACHE     = 'homebull-cdn-v13';
const CACHE_URLS    = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(c => c.addAll(CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      // Elimina TUTTE le cache vecchie incluso v11
      keys.filter(k => k !== CACHE_VERSION && k !== CDN_CACHE)
          .map(k => { console.log('Deleting old cache:', k); return caches.delete(k); })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  // Firebase e googleapis — sempre dalla rete
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis') ||
      url.hostname.includes('gstatic')) {
    e.respondWith(fetch(e.request));
    return;
  }
  
  // CDN (jsbarcode, qrious, ecc.) — cache first
  if (url.hostname.includes('cdnjs') || 
      url.hostname.includes('jsdelivr') ||
      url.hostname.includes('unpkg')) {
    e.respondWith(
      caches.open(CDN_CACHE).then(c =>
        c.match(e.request).then(cached => cached || 
          fetch(e.request).then(r => {
            if (r.ok) c.put(e.request, r.clone());
            return r;
          })
        )
      )
    );
    return;
  }
  
  // App files — network first, poi cache
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) {
        const cl = r.clone();
        caches.open(CACHE_VERSION).then(c => c.put(e.request, cl));
      }
      return r;
    }).catch(() => caches.match(e.request))
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
