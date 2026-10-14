const CACHE_NAME = 'stopp-store-v12';
const STATIC_ASSETS = [
  './',
  './index.html',
  './verawatt.html',
  './stoppstore.html',
  './assets/css/style.css',
  './assets/js/app.js',
  './assets/js/download.js',
  './assets/img/icon.svg',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png',
  './assets/img/verawatt_logo.svg',
  './assets/img/verawatt_title.svg',
  './assets/img/verawatt_icon_4x.png',
  './assets/img/verawatt_typography_4x.png',
  './assets/img/verawatt_ativo1_4x.png',
  './assets/img/verawatt_ativo2_4x.png',
  './assets/img/verawatt_logo_4x.png',
  './assets/img/verawatt_tipo1_4x.png',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Nao armazenar em cache downloads pesados de APK nem verificador dinamico de versao
  if (url.pathname.endsWith('.apk') || url.pathname.endsWith('store-version.json')) {
    return;
  }

  // Apenas processar pedidos GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Estrategia Network-First para documentos HTML (garante atualizacao imediata de layout)
  const isHtmlRequest = event.request.mode === 'navigate' ||
                        url.pathname.endsWith('.html') ||
                        url.pathname === '/Stopp-Store/' ||
                        url.pathname === '/' ||
                        (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'));

  if (isHtmlRequest) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone).catch(() => {}));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request, { ignoreSearch: true })
            .then((cached) => cached || caches.match('./index.html', { ignoreSearch: true }))
            .then((matched) => matched || new Response('<!DOCTYPE html><html><head><meta http-equiv="refresh" content="2"></head><body>A carregar Stopp Store...</body></html>', {
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            }));
        })
    );
    return;
  }

  // Estrategia Network-First para scripts e estilos (garante codigo atualizado imediatamente)
  const isCodeAsset = url.pathname.endsWith('.js') || url.pathname.endsWith('.css');
  if (isCodeAsset) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone).catch(() => {}));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request, { ignoreSearch: true })
            .then((cached) => cached || (url.pathname.endsWith('.js')
              ? new Response('/* Stopp Store offline fallback */', { headers: { 'Content-Type': 'application/javascript' } })
              : new Response('/* Stopp Store offline fallback */', { headers: { 'Content-Type': 'text/css' } })));
        })
    );
    return;
  }

  // Estrategia Cache-First com fallback para imagens e outros recursos estaticos
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          }).catch(() => {});
        }
        return networkResponse;
      }).catch(() => {
        return new Response('', { status: 408, statusText: 'Request Timed Out' });
      });
    })
  );
});

// Suporte a cliques em Notificacoes do Sistema (PWA e Web)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : './index.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
