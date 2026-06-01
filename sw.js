const CACHE = 'hb13-v1.0.0';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([
      './index.html',
      './manifest.json'
    ]))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Genera icone dal base64 embedded
  if (url.pathname.endsWith('icon-192.png')) {
    e.respondWith(fetch('./icon-192.png').catch(() =>
      new Response(b64toBlob(ICON192, 'image/png'), {
        headers: { 'Content-Type': 'image/png' }
      })
    ));
    return;
  }
  if (url.pathname.endsWith('icon-512.png')) {
    e.respondWith(fetch('./icon-512.png').catch(() =>
      new Response(b64toBlob(ICON512, 'image/png'), {
        headers: { 'Content-Type': 'image/png' }
      })
    ));
    return;
  }

  // Cache first, poi network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

function b64toBlob(b64, type) {
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type });
}

// Icona 192x192 base64
const ICON192 = 'iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAIAAADdvvtQAAABhGlDQ1BJQ0MgcHJvZmlsZQAAKJF9kT1Iw0AcxV9TpSoVBzuIOGSoThZERRy1CkWoEGqFVh1MLv2CJg1JioujILg4WP1YXHx1dXBVFAQfII4OTouuUuL/kkKLGA/He7j3Ht0dEOpVpmpHxwBVs4xkPCZmc6ui/xUehhFABGGZqaeSi2m4jq97ePj6EuNZ3uf+HL1K3mSATySeZYZpEW8Qz2xaBed94hArSSrxOfGYSRckfuS67OE3zgWHBZ4ZMtLJOeIQsVhqY6WNWclQiaeIo6qmUS9kXFY5b3HWylXWuid/YaSgryxzneYQ4lhCAgkIkFFFCWVYiNGqkWIiSfsxj3/I8afIJZOrBEaOBVSgQnL84H/wu1uzMD3lJQVjQOeLbX+MAvtdoFG37e9j226cAL5n4Epv+St1YPaT9FpLix4BvdvAxXVLU/aAyx1g8EkXTcmRfDSFYhF4P6NvygP9t0DPmtdbcx+nD0CWukrxBhwcAqMlyl73uLurtXf/nmn29wPOmXKm6bOPbgAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAlwSFlzAAALEwAACxMBAJqcGAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAMGSURBVHic7doxCoNAEEDRNZ5AsPQCHsFbeP9j2HkDDyCIpQcIgq1H2FY9gJAiV0iym8wkO+87gPCGYdhijHHvvQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwW2utVkoppZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSuU5pZRSSimllFJKKaWUUkoppZQCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4B8f0Q8HAAAAAElFTkSuQmCC';

// Icona 512x512 (stessa ma più grande per semplicità)
const ICON512 = ICON192;
