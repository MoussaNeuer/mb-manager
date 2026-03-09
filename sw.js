/* ============================================================
   Moussa Business Manager — Service Worker v2.0
   Stratégie : Cache-First pour assets statiques,
               Network-First pour données dynamiques
   ============================================================ */

const CACHE_NAME    = 'moussa-biz-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2',
];

/* ── Images à précacher ── */
const IMAGE_ASSETS = [
  './images/slimfits/slim blanc.webp',
  './images/slimfits/slim noir.webp',
  './images/slimfits/slim bleu ciel.webp',
  './images/slimfits/slim bleu.webp',
  './images/slimfits/slim bleu nuit.webp',
  './images/slimfits/slim turquoise.webp',
  './images/slimfits/slim vert.webp',
  './images/slimfits/slim vert mili.webp',
  './images/slimfits/slim vert fluo.webp',
  './images/slimfits/slim vert menthe.webp',
  './images/slimfits/slim jaune.webp',
  './images/slimfits/slim orange.webp',
  './images/slimfits/slim rouge.webp',
  './images/slimfits/slim bordeau.webp',
  './images/slimfits/slim rose clair.webp',
  './images/slimfits/slim rose.webp',
  './images/slimfits/slim gris.webp',
  './images/slimfits/slim maron.webp',
  './images/slimfits/slim beige.webp',
  './images/slimfits/slim beige fonce.webp',
  './images/slimfits/slim saumon.webp',
  './images/slimfits/slim violet.webp',
  './images/compressions/compression blanc.webp',
  './images/compressions/compression noir.webp',
  './images/compressions/compression bleu claire.webp',
  './images/compressions/compression grey.webp',
  './images/compressions/compression gris.webp',
  './images/compressions/compression rose.webp',
  './images/compressions/compression rouge.webp',
  './images/compressions/compression vert menthe.webp',
  './images/compressions/compression vert mili.webp',
  './images/compressions/compression violet.webp',
];

/* ── INSTALL : mise en cache des assets statiques ── */
self.addEventListener('install', event => {
  console.log('[SW] Install v2');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Assets critiques (shell de l'app)
      await cache.addAll(STATIC_ASSETS);
      // Images en arrière-plan (sans bloquer l'install)
      Promise.allSettled(
        IMAGE_ASSETS.map(url =>
          fetch(url).then(res => {
            if (res.ok) cache.put(url, res);
          }).catch(() => {/* image absente = ignorée */})
        )
      );
    })
  );
  self.skipWaiting();
});

/* ── ACTIVATE : nettoyage des anciens caches ── */
self.addEventListener('activate', event => {
  console.log('[SW] Activate v2');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ── FETCH : stratégies de cache ── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne pas intercepter les requêtes non-GET
  if (request.method !== 'GET') return;

  // ── Images : Cache-First avec fallback SVG ──
  if (request.url.includes('/images/')) {
    event.respondWith(cacheFirst(request, true));
    return;
  }

  // ── CDN externe (Tailwind, FontAwesome) : Stale-While-Revalidate ──
  if (url.hostname !== self.location.hostname) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // ── App shell : Cache-First ──
  event.respondWith(cacheFirst(request, false));
});

/* ── Stratégie Cache-First ── */
async function cacheFirst(request, isImage) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    if (isImage) {
      // Fallback SVG couleur pour images manquantes
      return new Response(
        `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
          <rect width="72" height="72" rx="8" fill="#e5e7eb"/>
          <text x="36" y="44" font-size="24" text-anchor="middle">👕</text>
        </svg>`,
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    return offlinePage();
  }
}

/* ── Stratégie Stale-While-Revalidate ── */
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
    }
    return response;
  }).catch(() => null);

  return cached || await fetchPromise || offlinePage();
}

/* ── Page hors-ligne ── */
function offlinePage() {
  return new Response(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Hors ligne — Moussa Business</title>
      <style>
        body { font-family:system-ui,sans-serif; display:flex; align-items:center;
               justify-content:center; min-height:100vh; margin:0; background:#f0fdf4; }
        .box { text-align:center; padding:2rem; }
        .icon { font-size:4rem; margin-bottom:1rem; }
        h1 { color:#00853F; font-size:1.5rem; margin-bottom:.5rem; }
        p  { color:#6b7280; margin-bottom:1.5rem; }
        button { background:#00853F; color:white; border:none; padding:.75rem 2rem;
                 border-radius:1rem; font-size:1rem; cursor:pointer; }
      </style>
    </head>
    <body>
      <div class="box">
        <div class="icon">📶</div>
        <h1>Moussa Business Manager</h1>
        <p>Vous êtes hors ligne. Les données locales restent disponibles.</p>
        <button onclick="location.reload()">Réessayer</button>
      </div>
    </body>
    </html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}

/* ── Message handler (skip waiting) ── */
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
