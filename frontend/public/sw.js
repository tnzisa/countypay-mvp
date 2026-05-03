// public/sw.js - CountyPay Service Worker with Enhanced Offline Support
const CACHE_NAME = 'countypay-v1';
const API_CACHE_NAME = 'countypay-api-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install — cache static assets
self.addEventListener('install', (event) => {
  console.log('[SERVICE_WORKER] Installing');
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SERVICE_WORKER] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(API_CACHE_NAME)
    ])
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SERVICE_WORKER] Activating');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== API_CACHE_NAME)
          .map(k => {
            console.log(`[SERVICE_WORKER] Deleting old cache: ${k}`);
            return caches.delete(k);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first for API, cache first for static
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls - network first with fallback to cache
  if (url.pathname.startsWith('/api') || url.hostname === 'localhost' && url.port === '5000') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok && request.method === 'GET') {
            const cache = caches.open(API_CACHE_NAME);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch((error) => {
          console.log(`[SERVICE_WORKER] Network failed for ${request.url}, using cache`);
          // Fall back to cached API responses
          return caches.match(request)
            .then((cached) => {
              if (cached) {
                // Add offline indicator
                return cached.clone().text().then((body) => {
                  try {
                    const json = JSON.parse(body);
                    json._offline = true;
                    return new Response(JSON.stringify(json), {
                      status: cached.status,
                      statusText: cached.statusText,
                      headers: cached.headers
                    });
                  } catch (e) {
                    return cached;
                  }
                });
              }
              // Return offline error
              return new Response(
                JSON.stringify({
                  error: 'offline',
                  message: 'Network unavailable. Transactions will sync when online.',
                  _offline: true
                }),
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
        })
    );
    return;
  }

  // Navigation requests - network first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          console.log('[SERVICE_WORKER] Navigation fallback to cache');
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Static assets - cache first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      }).catch(() => {
        // Return offline page for failed static assets
        return caches.match('/index.html');
      });
    })
  );
});

// Background sync for offline transactions
self.addEventListener('sync', (event) => {
  console.log(`[SERVICE_WORKER] Background sync event: ${event.tag}`);
  
  if (event.tag === 'sync-payments') {
    event.waitUntil(syncPendingPayments());
  }
});

// Sync pending payments stored offline
async function syncPendingPayments() {
  try {
    console.log('[SERVICE_WORKER] Syncing pending payments...');
    
    // Notify all clients to start sync
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_PAYMENTS',
        status: 'started',
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    console.error('[SERVICE_WORKER] Sync error:', error);
    throw error;
  }
}

// Handle messages from client
self.addEventListener('message', (event) => {
  console.log('[SERVICE_WORKER] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(API_CACHE_NAME).then(() => {
      console.log('[SERVICE_WORKER] API cache cleared');
    });
  }
});

console.log('[SERVICE_WORKER] Loaded and ready');