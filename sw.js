const CACHE_NAME = 'stopp-store-v10';
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
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => cached || caches.match('./index.html'));
        })
    );
    return;
  }

  // Estrategia Stale-While-Revalidate para recursos estaticos (CSS, JS, Imagens)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
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
