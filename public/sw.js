/* public/sw.js */
const APP_VERSION = "v1.0.6"; // subilo cuando publiques cambios importantes
const CACHE_STATIC = `static-${APP_VERSION}`;
const CACHE_RUNTIME = `runtime-${APP_VERSION}`;

// Archivos esenciales (ajustá cuando agregues más)
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/pages/producto.html",
  "/pages/pedido.html",
  "/manifest.webmanifest",
  "/js/app.js",
  "/js/share.js",
  "/js/sw-register.js",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png"
];

// Instala y precachea
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activa y limpia caches viejos
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => ![CACHE_STATIC, CACHE_RUNTIME].includes(k))
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// Helpers
async function cacheFirst(req) {
  const cache = await caches.open(CACHE_STATIC);
  const cached = await cache.match(req);
  if (cached) return cached;
  const fresh = await fetch(req);
  if (fresh.ok) cache.put(req, fresh.clone());
  return fresh;
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_RUNTIME);
  try {
    const fresh = await fetch(req, { cache: "no-store" });
    if (fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw new Error("Network error and no cache.");
  }
}

// Fetch strategy por tipo
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Solo GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Solo mismo origen
  if (url.origin !== self.location.origin) return;

  const accept = req.headers.get("accept") || "";

  // HTML: network-first para que siempre se actualice
  if (accept.includes("text/html")) {
    event.respondWith(networkFirst(req));
    return;
  }

  // JS/CSS/manifest/icons: cache-first
  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".webmanifest") ||
    url.pathname.includes("/assets/icons/")
  ) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Imágenes: cache-first en runtime
  if (accept.includes("image")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_RUNTIME);
      const cached = await cache.match(req);
      if (cached) return cached;

      const fresh = await fetch(req);
      if (fresh.ok) cache.put(req, fresh.clone());
      return fresh;
    })());
    return;
  }

  // Default: network-first
  event.respondWith(networkFirst(req));
});

// Permite forzar activación inmediata desde la UI
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});