const CACHE_NAME = 'cams-v2-cache';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Pass-through simple para cumplir requerimientos PWA
  event.respondWith(fetch(event.request));
});
