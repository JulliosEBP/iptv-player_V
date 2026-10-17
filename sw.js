var CACHE_NAME = 'iptv-player-v1';
var urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './js/player.js',
  './js/m3u-parser.js',
  './js/epg-parser.js',
  './js/history-manager.js',
  './js/subtitle-manager.js',
  './js/skip-marker.js',
  './js/xtream-api.js',
  './manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', function(event) {
  // No cachear peticiones a servidores IPTV externos
  if (event.request.url.indexOf('player_api.php') !== -1 ||
      event.request.url.indexOf('get.php') !== -1 ||
      event.request.url.indexOf('.m3u') !== -1 ||
      event.request.url.indexOf('.m3u8') !== -1) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});