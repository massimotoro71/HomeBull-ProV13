self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);
    
    // Isola completamente le chiamate API e di autenticazione bypassando il Service Worker
    if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
        // Usando semplicemente return senza e.respondWith, lasciamo che il browser 
        // gestisca la richiesta normalmente sulla rete senza l'interferenza del Service Worker
        return; 
    }

    // Gestione delle librerie esterne da CDN (Unpkg, Tailwind, Gstatic)
    if (url.hostname.includes('unpkg') || url.hostname.includes('gstatic') || url.hostname.includes('tailwind')) {
        e.respondWith(
            caches.open(CDN_CACHE).then(c =>
                c.match(e.request).then(cached => {
                    return cached || fetch(e.request).then(r => {
                        if(r.ok) c.put(e.request, r.clone()); 
                        return r;
                    }).catch(() => new Response("Errore di rete CDN", { status: 503 }));
                })
            )
        ); 
        return;
    }

    // Gestione delle risorse locali dell'app (index.html, icone, ecc.)
    e.respondWith(
        fetch(e.request)
            .then(r => {
                // Se la risposta è valida, puoi aggiornare la cache locale se necessario
                return r;
            })
            .catch(() => {
                // Se sei offline, prova a servire la risorsa dalla cache locale
                return caches.match(e.request);
            })
    );
});