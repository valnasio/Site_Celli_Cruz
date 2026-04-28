// Service Worker para cache offline e performance
const CACHE_NAME = 'cellicruz-v1.1.0';
const STATIC_CACHE_URLS = [
  '/',
  '/css/styles.css',
  '/js/main.js',
  '/js/admin-auth.js',
  '/assets/logo.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Cache no install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Limpa cache antigo
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estratégia de cache: Cache First para assets estáticos, Network First para dados dinâmicos
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Cache First para assets estáticos
  if (event.request.url.includes('/css/') ||
      event.request.url.includes('/js/') ||
      event.request.url.includes('/assets/') ||
      event.request.url.includes('cdnjs.cloudflare.com')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
    return;
  }

  // Network First para páginas e dados dinâmicos
  if (event.request.mode === 'navigate' ||
      event.request.url.includes('/api/') ||
      event.request.url.includes('/data/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache apenas respostas bem-sucedidas
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Default: Cache First
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});