const CACHE_VERSION = 'homebull-v11.1.22';
const CDN_CACHE     = 'homebull-cdn-v11.1.22';
const CACHE_URLS    = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(CACHE_URLS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(k => k !== CACHE_VERSION && k !== CDN_CACHE).map(k => caches.delete(k))
        )).then(() => self.clients.claim())
    );
});
self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);
    if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
        e.respondWith(fetch(e.request)); return;
    }
    if (url.hostname.includes('unpkg') || url.hostname.includes('gstatic') || url.hostname.includes('tailwind')) {
        e.respondWith(caches.open(CDN_CACHE).then(c =>
            c.match(e.request).then(cached => cached || fetch(e.request).then(r => {
                if(r.ok) c.put(e.request, r.clone()); return r;
            }))
        )); return;
    }
    e.respondWith(
        fetch(e.request).then(r => {
            if(r.ok){const cl=r.clone();caches.open(CACHE_VERSION).then(c=>c.put(e.request,cl));}
            return r;
        }).catch(() => caches.match(e.request))
    );
});
self.addEventListener('message', e => { if(e.data==='SKIP_WAITING') self.skipWaiting(); });
