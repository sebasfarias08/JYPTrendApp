/* public/sw.js */
const APP_VERSION = "v1.0.30";
const CACHE_STATIC = `static-${APP_VERSION}`;
const CACHE_RUNTIME = `runtime-${APP_VERSION}`;

// Keep this list in sync with routes/assets required by the mobile shell.
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/css/theme.css",

  "/pages/login.html",
  "/pages/auth-callback.html",
  "/pages/producto.html",
  "/pages/pedido.html",
  "/pages/pedidos.html",
  "/pages/pedido-detalle.html",
  "/pages/about.html",
  "/pages/clientes.html",
  "/pages/cliente-form.html",
  "/pages/productos.html",
  "/pages/producto-form.html",

  "/js/app-shell.js",
  "/js/auth.js",
  "/js/cart.js",
  "/js/catalog-service.js",
  "/js/customers-service.js",
  "/js/client-form-page.js",
  "/js/image.js",
  "/js/clients-page.js",
  "/js/products-page.js",
  "/js/product-form-page.js",
  "/js/order-page.js",
  "/js/order-ref.js",
  "/js/order-service.js",
  "/js/orders-service.js",
  "/js/order-status.js",
  "/js/product-page.js",
  "/js/product-service.js",
  "/js/share.js",
  "/js/status-ui.js",
  "/js/supabase-client.js",
  "/js/sw-register.js",
  "/js/toast.js",

  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png"
];

async function precacheStaticAssets() {
  const cache = await caches.open(CACHE_STATIC);
  await Promise.all(
    PRECACHE_URLS.map(async (url) => {
      try {
        await cache.add(url);
      } catch (e) {
        // Do not fail installation if one optional asset cannot be cached.
        console.warn("[SW] precache failed:", url, e);
      }
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheStaticAssets());
  // Important: do NOT call skipWaiting here.
  // We want the update banner in the UI and activate only after user confirmation.
});

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

async function cacheFirst(req, cacheName = CACHE_STATIC) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;

  const fresh = await fetch(req);
  if (fresh.ok) await cache.put(req, fresh.clone());
  return fresh;
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_RUNTIME);
  try {
    const fresh = await fetch(req, { cache: "no-store" });
    if (fresh.ok) await cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw new Error("Network error and no cache.");
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js") return;
  if (url.pathname === "/version.json") {
    event.respondWith((async () => {
      try {
        return await fetch(req, { cache: "no-store" });
      } catch {
        const fallback = await caches.match("/version.json");
        return fallback || new Response('{"version":"unknown"}', { headers: { "content-type": "application/json" } });
      }
    })());
    return;
  }

  const accept = req.headers.get("accept") || "";

  if (accept.includes("text/html")) {
    event.respondWith(networkFirst(req));
    return;
  }

  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".webmanifest") ||
    url.pathname.includes("/assets/icons/")
  ) {
    event.respondWith(cacheFirst(req, CACHE_STATIC));
    return;
  }

  if (accept.includes("image")) {
    event.respondWith(cacheFirst(req, CACHE_RUNTIME));
    return;
  }

  event.respondWith(networkFirst(req));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "GET_VERSION") {
    event.ports?.[0]?.postMessage({ version: APP_VERSION });
    return;
  }
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
