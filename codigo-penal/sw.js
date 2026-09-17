const CACHE = 'codigo-penal-antenucci-v1';
const ASSETS = [
  '/tareas/codigo-penal/',
  '/tareas/codigo-penal/index.html',
  '/tareas/codigo-penal/manifest.json',
  '/tareas/codigo-penal/data.js',
  '/tareas/codigo-penal/antecedentes.js',
  '/tareas/codigo-penal/meta.js',
  '/tareas/codigo-penal/tareas-icon-192.png',
  '/tareas/codigo-penal/tareas-icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Red primero: así una actualización del Código se ve de inmediato.
// Si no hay conexión, sirve la última versión guardada en caché.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copia = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
