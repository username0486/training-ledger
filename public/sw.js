// Service Worker for Training Ledger PWA
// Build version injected at build time
const BUILD_VERSION = '__BUILD_VERSION__';
const CACHE_NAME = `tl-shell-${BUILD_VERSION}`;
const RUNTIME_CACHE = `tl-runtime-${BUILD_VERSION}`;

// Assets to cache on install (minimal app shell)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing version', BUILD_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(PRECACHE_ASSETS).catch((error) => {
        console.error('[Service Worker] Cache install failed:', error);
        // Don't fail installation if some assets fail to cache
      });
    })
  );
  // Force the waiting service worker to become the active service worker immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating version', BUILD_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // Delete all caches that don't match current version
      const deletePromises = cacheNames
        .filter((cacheName) => {
          // Keep only caches that match current version
          return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
        })
        .map((cacheName) => {
          console.log('[Service Worker] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        });
      
      return Promise.all(deletePromises);
    })
  );
  // Take control of all clients immediately
  return self.clients.claim();
});

// Handle skip waiting message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Received SKIP_WAITING message');
    self.skipWaiting();
  }
});

// Fetch event - implement proper strategies
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const url = new URL(event.request.url);
  const requestUrl = url.pathname;
  
  // Never cache API/data responses
  if (url.pathname.startsWith('/api/') || 
      url.pathname.includes('/functions/') ||
      url.searchParams.has('_data')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Special handling for systemExercises.json - never return HTML fallback
  if (requestUrl === '/exercises/systemExercises.json' || requestUrl === '/systemExercises.json') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          // Only cache successful JSON responses
          if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch((error) => {
          // Try cache as fallback, but never return HTML
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse && cachedResponse.headers.get('content-type')?.includes('application/json')) {
              return cachedResponse;
            }
            // If no valid cache and network fails, return the network error (not HTML)
            throw error;
          });
        })
    );
    return;
  }

  // Navigation requests (HTML) - Network-first to get latest deploy
  if (event.request.mode === 'navigate' || 
      (event.request.method === 'GET' && event.request.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful HTML responses
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cached HTML if network fails
          return caches.match('/index.html') || caches.match(event.request);
        })
    );
    return;
  }

  // Hashed assets (JS/CSS) - Cache-first for performance
  // These have content hashes in their filenames, so they're versioned
  if (requestUrl.startsWith('/assets/') || 
      requestUrl.match(/\.(js|css|woff2?|png|jpg|jpeg|svg|ico)$/i)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Fetch from network and cache
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Default: Network-first for other resources
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(event.request);
      })
  );
});
