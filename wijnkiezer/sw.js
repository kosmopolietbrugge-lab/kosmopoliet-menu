/* Wijnkiezer service worker: app-bestanden offline, wijnen.json altijd eerst vers van het net. */
var CACHE = 'wijnkiezer-v2';
var ASSETS = ['./', 'index.html', 'style.css', 'engine.js', 'app.js', 'tools.js', 'wijnen.json', 'icon.svg', 'manifest.webmanifest'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // netwerk eerst (verse data en code), cache als terugval offline
  e.respondWith(fetch(e.request).then(function (r) {
    if (r.ok) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(u.pathname.endsWith('wijnen.json') ? 'wijnen.json' : e.request, cp); }); }
    return r;
  }).catch(function () { return caches.match(u.pathname.endsWith('wijnen.json') ? 'wijnen.json' : e.request, { ignoreSearch: true }); }));
});
