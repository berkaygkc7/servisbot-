// ServisBot Progressive Web App (PWA) Service Worker
const CACHE_NAME = 'servisbot-v1';

// Uygulama kabuğu (App Shell) - Çevrimdışı ilk açılış için temel kaynaklar
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/bus_logo.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png'
];

// Service Worker Kurulumu (Install)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Service Worker Etkinleştirme (Activate & Eski Önbellek Temizleme)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Ağ İsteklerini Yakalama (Fetch Strategy)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Supabase API, Realtime WebSocket ve Google Maps istekleri DAİMA doğrudan ağa gitmeli (Cache uygulanmaz)
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/auth/') ||
    event.request.method !== 'GET'
  ) {
    return; // Tarayıcının varsayılan ağ davranışına bırak
  }

  // 2. Sayfa Gezinmeleri (Navigation / HTML) için Network-First stratejisi
  // (İnternet yoksa önbellekteki index.html açılsın)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match('/index.html') || await cache.match('/');
        return cachedResponse;
      })
    );
    return;
  }

  // 3. Statik Kaynaklar (JS, CSS, Görseller, Fontlar) için Stale-While-Revalidate stratejisi
  // (Önce hızlıca önbellekten göster, arka planda ağı kontrol edip önbelleği tazele)
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.match(/\.(js|css|webp|png|jpg|jpeg|svg|woff2?)$/)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => null);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Diğer istekler için doğrudan ağ veya önbellek
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
