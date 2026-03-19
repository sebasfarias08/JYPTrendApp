/* public/sw.js */
const APP_VERSION = "v1.4.0";
const CACHE_STATIC = `static-${APP_VERSION}`;
const CACHE_RUNTIME = `runtime-${APP_VERSION}`;

// Keep this list in sync with the current modular entrypoints required by the PWA shell.
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/version.json",
  "/css/theme.css",

  "/pages/login.html",
  "/pages/auth-callback.html",
  "/pages/home.html",
  "/pages/producto.html",
  "/pages/checkout.html",
  "/pages/pedidos.html",
  "/pages/pedido-detalle.html",
  "/pages/about.html",
  "/pages/clientes.html",
  "/pages/cliente-form.html",
  "/pages/productos.html",
  "/pages/productos-form.html",
  "/pages/inventarios-logisticos.html",
  "/pages/inventarios-logisticos-form.html",
  "/pages/movimientos-inventario.html",
  "/pages/movimientos-inventario-form.html",

  "/js/app/auth/auth-service.js",
  "/js/app/auth/auth.js",
  "/js/app/auth/permissions.js",
  "/js/app/core/sales-context-service.js",
  "/js/app/core/supabase-client.js",
  "/js/app/core/sw-register.js",
  "/js/app/shell/app-shell.js",

  "/js/features/catalog/catalog-service.js",
  "/js/features/checkout/cart.js",
  "/js/features/checkout/checkout-page.js",
  "/js/features/customers/client-form-page.js",
  "/js/features/customers/clients-page.js",
  "/js/features/customers/customers-service.js",
  "/js/features/inventory/inventory-movement-form-page.js",
  "/js/features/inventory/inventory-movement-service.js",
  "/js/features/inventory/inventory-movements-page.js",
  "/js/features/inventory/logistics-inventories-page.js",
  "/js/features/inventory/logistics-inventory-form-page.js",
  "/js/features/inventory/logistics-inventory-service.js",
  "/js/features/inventory/stock-service.js",
  "/js/features/orders/order-detail.js",
  "/js/features/orders/order-service.js",
  "/js/features/orders/orders-service.js",
  "/js/features/orders/orders.js",
  "/js/features/product/product-form-page.js",
  "/js/features/product/product-page.js",
  "/js/features/product/product-service.js",
  "/js/features/product/products-page.js",

  "/js/shared/ui/address-autocomplete.js",
  "/js/shared/ui/toast.js",
  "/js/shared/utils/argentina-phone.js",
  "/js/shared/utils/image.js",
  "/js/shared/utils/order-ref.js",
  "/js/shared/utils/order-status.js",
  "/js/shared/utils/runtime-config.js",
  "/js/shared/utils/share.js",
  "/js/shared/utils/storage-service.js",
  "/js/vendor/tailwindcss-playcdn.js",

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







