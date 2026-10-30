// Service worker: uygulama kabuğunu önbelleğe alır (çevrimdışı açılış), Firebase isteklerine dokunmaz.
const VERSION = 'sy-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './css/app.css', './js/app.js', './js/ui.js', './js/store.js', './js/demo-data.js', './js/modules.js', './js/views.js', './js/pwa.js', './js/firebase.js', './js/firebase-config.js', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Firebase / CDN istekleri ağa gider
  // Ağ öncelikli, çevrimdışıysa önbellek (güncellemeler hemen görünür)
  e.respondWith(fetch(e.request).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); return res; }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))));
});
