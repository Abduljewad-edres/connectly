/**
 * Connectly PWA Service Worker
 * Version: 1.0.0
 * 
 * Strict Security & Caching Guardrails:
 * - NEVER cache private API responses (/api/*), auth tokens, or messages.
 * - NEVER cache Socket.IO real-time traffic (/socket.io/*).
 * - NEVER cache non-GET requests (POST, PUT, DELETE, PATCH).
 * - Safe pre-caching of core static shell only.
 * - Clean update lifecycle with skipWaiting support.
 */

const CACHE_VERSION = 'connectly-v1.0.0';
const STATIC_CACHE = `connectly-static-${CACHE_VERSION}`;
const IMMUTABLE_CACHE = `connectly-immutable-${CACHE_VERSION}`;

// Core static assets required for standalone app shell
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon.svg'
];

// Install Event: Precache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      try {
        await cache.addAll(PRECACHE_ASSETS);
      } catch (err) {
        console.warn('[Connectly SW] Pre-caching partial failure:', err);
      }
    })
  );
});

// Activate Event: Cleanup stale caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== IMMUTABLE_CACHE) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Message Listener for update prompt
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch Event: Safe asset routing
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. NEVER touch non-GET requests (POST, PUT, DELETE, PATCH, etc.)
  if (request.method !== 'GET') {
    return;
  }

  // 2. NEVER cache /api requests, auth routes, or user data (CRITICAL PRIVACY RULE)
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) {
    return; // Pass through directly to network
  }

  // 3. NEVER cache Socket.IO real-time or WebRTC connections
  if (url.pathname.startsWith('/socket.io') || url.protocol === 'ws:' || url.protocol === 'wss:') {
    return; // Pass through directly to network
  }

  // 4. NEVER intercept Vite development server modules or HMR
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/')
  ) {
    return; // Pass through directly to Vite
  }

  // 5. NEVER intercept media streaming (video/audio) or HTTP Range requests
  // Browsers require direct Range responses for video chunk buffering
  if (
    request.headers.has('range') ||
    url.pathname.match(/\.(mp4|webm|mov|mkv|avi|m4v|3gp|mp3|wav|ogg|m4a)$/i) ||
    (url.pathname.startsWith('/uploads/') && url.pathname.match(/\.(mp4|webm|mov|mkv)$/i))
  ) {
    return; // Pass through directly to network for byte-range streaming
  }

  // 5. Handle Navigation Requests (HTML pages / SPA routes like /profile, /search, /messages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If valid network response, update cached index.html shell
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put('/index.html', responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Offline fallback: serve cached app shell
          const cachedShell = await caches.match('/index.html');
          if (cachedShell) return cachedShell;
          return caches.match('/');
        })
    );
    return;
  }

  // 5. Versioned Vite Static Assets (e.g. /assets/index-*.js, /assets/index-*.css)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(IMMUTABLE_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 6. Public static files (icons, manifest, svg, fonts)
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        }).catch(() => null);

        // Return cached or wait for network
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default: Network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

