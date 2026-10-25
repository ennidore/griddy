// Griddy service worker: makes the app installable and loads it fast on repeat visits.
// The game itself is live (Socket.io), so nothing here works offline beyond the app shell.
const CACHE = 'griddy-v2';
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // Only same-origin GETs; never touch the API, uploads or the live socket.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return;

  // Fingerprinted build assets and the music: cache-first (rename the file to ship new audio).
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/audio/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) caches.open(CACHE).then((c) => c.put(request, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }

  // Pages and everything else: network-first, falling back to the cached shell.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && request.mode === 'navigate') caches.open(CACHE).then((c) => c.put('/', res.clone()));
        return res;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match('/'))),
  );
});
