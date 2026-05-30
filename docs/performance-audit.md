# Auditoria de performance web - JYPTrendApp

Fecha: 2026-05-30  
Alcance auditado: `public/`, `docs/supabase_dump/`, PWA, frontend JS, Supabase client usage, imagenes y headers.

## 1. Resumen Ejecutivo

**Score general de rendimiento: 58/100**  
**Nota global: 5.8/10**  
**Riesgo general: medio-alto**

La app ya tiene buenas decisiones puntuales: modulos ES por feature, paginacion en catalogo y pedidos, `IntersectionObserver` para carga incremental, `Promise.all` en algunos flujos y lazy loading en varias imagenes. El problema principal es que esas optimizaciones conviven con patrones que escalan mal: Tailwind Play CDN en todas las paginas, `select("*")` en servicios, imagenes sin transformacion real, precache excesivo en el service worker, filtros en memoria y varias reconstrucciones completas de DOM.

Principales hallazgos:

- **Carga base alta y repetida:** todas las paginas cargan `/js/vendor/tailwindcss-playcdn.js` y el archivo pesa 407077 bytes. Esto bloquea parse/evaluacion JS y se precachea.
- **Transformaciones Supabase declaradas pero desactivadas:** `IMAGE_TRANSFORMS` existe, pero `buildTransformOptions()` retorna `null`; por lo tanto se descargan originales.
- **Precache PWA demasiado grande:** el SW cachea todas las paginas, modulos JS, Tailwind y ambos iconos durante install.
- **Consultas con `select("*")`:** catalogo, finanzas y stock descargan columnas no acotadas.
- **Filtrado y renderizado en memoria:** clientes, productos, inventario y parte de pedidos filtran localmente y reescriben grandes bloques con `innerHTML`.
- **Riesgo N+1 parcial:** pedidos carga resumen paginado y luego detalles por lote de 4; mejora la UX, pero multiplica requests.

## 2. Problemas Críticos

| Severidad | Archivo | Problema | Impacto |
| --- | --- | --- | --- |
| Alta | `public/index.html:13` y paginas en `public/pages/*:9-13` | Tailwind Play CDN local cargado en todas las paginas. Archivo: `public/js/vendor/tailwindcss-playcdn.js` = 407077 bytes. | Mas parse/evaluacion en main thread, mayor TTI, peor mobile. |
| Alta | `public/js/shared/utils/storage-service.js:9-17` | Las transformaciones de imagenes no se aplican: `buildTransformOptions()` retorna `null`. | Descarga de imagenes originales, mayor red y memoria, especialmente catalogo/producto. |
| Alta | `public/sw.js:7-90` | Precache instala casi toda la aplicacion, incluido Tailwind e iconos. | Install lento, cache storage inflado, descargas redundantes en primera visita. |
| Alta | `public/js/features/catalog/catalog-service.js:20-36` | Catalogo usa `select("*", { count: "exact" })` sobre una vista y despues otra query por imagenes. | Payload innecesario, `COUNT exact` costoso, mas latencia por pagina. |
| Media-alta | `public/js/features/orders/orders.js:267-285` + `orders-service.js:185-243` | Detalles de pedidos se cargan en batches de 4 via `getOrderDetail()` por cada pedido. | Multiplica requests: 30 resumenes pueden generar hasta 8 rondas extra. |
| Media-alta | `public/js/features/orders/orders-service.js:171-182` | `getPendingPaymentsCount()` trae todos los `pending_amount` y cuenta en frontend. | Escala lineal con cantidad de ordenes; deberia agregarse en DB. |
| Media | `public/js/features/orders/orders-service.js:399-415` | Updates de `order_items` secuenciales dentro de un loop. | Guardado lento con muchos items; aumenta tiempo de bloqueo de flujo. |

## 3. Problemas de Frontend

### 3.1 Tailwind Play CDN en produccion

Evidencia:

```html
public/index.html:13
<script src="/js/vendor/tailwindcss-playcdn.js"></script>
```

El mismo patron aparece en todas las paginas HTML (`public/pages/about.html:10`, `checkout.html:10`, `home.html:11`, `producto.html:13`, etc.). El archivo local pesa **407077 bytes**.

Impacto estimado:

- Tiempo de carga: alto. Se parsea/evalua JS de Tailwind en cada navegacion nueva.
- Mobile: alto. Aumenta trabajo del hilo principal.
- Red/cache: alto. Aunque cacheado, entra al precache y aumenta instalacion PWA.

Recomendacion: compilar CSS en build y eliminar Play CDN del runtime. Mantener solo `theme.css` o un CSS generado purgado.

### 3.2 Render completo del catalogo en cada cambio

Evidencia:

```js
public/index.html:205
listEl.innerHTML = allProducts.map((p, index) => {
```

Despues del render se vuelven a consultar nodos y registrar listeners:

```js
public/index.html:266
listEl.querySelectorAll("img[data-fallback-src]").forEach((img) => {

public/index.html:280
listEl.querySelectorAll("[data-add-variant-id]").forEach((btn) => {
```

Impacto estimado:

- Main thread: medio-alto cuando `allProducts` crece por scroll infinito.
- Memoria: medio. Los nodos anteriores se descartan y se recrean.
- Mobile: alto si hay muchas variantes acumuladas.

Recomendacion: usar delegacion de eventos en `listEl`, hacer append de nuevos items en `loadMore()` y no reconstruir toda la lista. Guardar fallback de imagen con un solo listener delegado en `error` si se mantiene esta estrategia.

### 3.3 Snapshot de navegacion en `sessionStorage` crece con el catalogo

Evidencia:

```js
public/index.html:88-95
items: allProducts.map((product) => ({
  product_id: product.product_id ?? "",
  variant_id: product.variant_id ?? product.id ?? "",
  name: product.name ?? ""
}))
sessionStorage.setItem(CATALOG_NAV_KEY, JSON.stringify(snapshot));
```

Impacto estimado:

- Memoria/storage: medio. El snapshot crece con cada pagina cargada.
- CPU: bajo-medio. Serializa todo en cada render.

Recomendacion: guardar solo `selectedTab`, `search`, `scrollTop`, pagina actual o ids minimos necesarios; evitar nombres de todos los productos.

### 3.4 Filtros sin debounce en listados administrativos

Evidencia:

```js
public/js/features/product/products-page.js:230
searchEl.addEventListener("input", renderList);

public/js/features/customers/clients-page.js:181
searchEl.addEventListener("input", renderList);

public/js/features/inventory/inventory-movements-page.js:110
searchEl.addEventListener("input", renderList);
```

Impacto estimado:

- CPU: medio en listas grandes porque filtra y re-renderiza por tecla.
- Mobile: medio-alto.

Recomendacion: aplicar debounce de 150-250 ms o mover busquedas a backend con paginacion.

### 3.5 Filtrado local repetitivo

Inventario construye texto de busqueda para cada fila en cada input:

```js
public/js/features/inventory/inventory-movements-page.js:56-59
const filtered = rows.filter((row) => {
  if (movementType && String(row.movement_type || "").trim().toUpperCase() !== movementType) return false;
  if (!q) return true;
  return buildSearchText(row).includes(q);
});
```

Impacto estimado:

- CPU: bajo con 150 registros, medio si sube el limite.
- Escalabilidad: baja a media. El patron no escala a miles de movimientos.

Recomendacion: precomputar `searchText` al cargar filas o consultar filtrado desde Supabase con indices/trigram.

### 3.6 Optimizaciones correctas ya implementadas

- Catalogo usa `IntersectionObserver` para scroll infinito:

```js
public/index.html:424-432
const observer = new IntersectionObserver((entries) => {
  const entry = entries[0];
  if (entry.isIntersecting && hasMore && !isLoading) {
    loadMore();
  }
}, {
  root: mainScrollEl,
  threshold: 0.1
});
```

- Catalogo usa `loading="lazy"`, `decoding="async"` y `fetchpriority` diferenciado:

```js
public/index.html:212-227
const loading = index < FIRST_VISIBLE_IMAGE_COUNT ? "eager" : "lazy";
const fetchPriority = index === 0 ? "high" : loading === "lazy" ? "low" : "auto";
```

- Dashboard financiero paraleliza requests:

```js
public/js/features/finance/finance-dashboard.js:97-102
const [accounts, customerPayments, supplierPayments, cashflowMovements] = await Promise.all([
  getAccountBalances(),
  getPendingCustomerPayments(),
  getPendingSupplierPayments(),
  getCashFlowLast7Days()
]);
```

## 4. Problemas de Supabase

### 4.1 `select("*")` en catalogo

Evidencia:

```js
public/js/features/catalog/catalog-service.js:20-36
let query = supabase
  .from("v_catalog_variants_available")
  .select("*", { count: "exact", head: false })
  .eq("warehouse_id", salesContext.warehouse_id)
  .eq("point_of_sale_id", salesContext.point_of_sale_id);
```

Impacto estimado:

- Red: medio-alto, segun ancho de la vista.
- DB: medio-alto por `count: "exact"` en cada pagina.
- Escalabilidad: alto si crece catalogo.

Recomendacion: seleccionar columnas concretas (`variant_id`, `product_id`, `display_name`, `price`, `stock_qty`, `category_slug`, `image_path`, etc.) y evaluar `count: "planned"` o evitar count exacto en scroll infinito.

### 4.2 Busqueda con `%term%`

Evidencia:

```js
public/js/features/catalog/catalog-service.js:31
query = query.ilike("display_name", `%${search}%`);
```

Hay indices visibles para `categories.slug`, `products.active`, `product_variants.sku`, pero no hay evidencia en `docs/supabase_dump/Supabase Snippet 07-Indices` de un indice trigram sobre `display_name` de la vista `v_catalog_variants_available`.

Impacto estimado:

- DB: alto en catalogos grandes.
- Latencia: medio-alto en busquedas.

Recomendacion: materializar busqueda o crear una columna indexable en tabla/vista materializada con GIN trigram. Como es una vista normal, no se puede indexar directamente; alternativa: RPC de busqueda o materialized view refrescada.

### 4.3 Segunda query de thumbnails por pagina

Evidencia:

```js
public/js/features/catalog/catalog-service.js:49-53
const { data: variantImages, error: variantImagesError } = await supabase
  .from("product_variant_images")
  .select("variant_id, image_path, image_type, is_primary, sort_order")
  .in("variant_id", variantIds)
  .eq("image_type", "thumbnail");
```

Impacto estimado:

- Red: +1 request por pagina de catalogo.
- Latencia: medio.

Recomendacion: incluir thumbnail primario en `v_catalog_variants_available`, o crear RPC que devuelva catalogo + thumbnail en una llamada.

### 4.4 Conteo de pagos pendientes en frontend

Evidencia:

```js
public/js/features/orders/orders-service.js:171-182
const { data, error } = await supabase
  .from("v_order_payment_summary")
  .select("pending_amount");
return (data ?? []).filter((row) => Number(row.pending_amount ?? 0) > 0).length;
```

Impacto estimado:

- Red: alto a medida que crecen pedidos.
- DB/frontend: trabajo innecesario.

Recomendacion: `select("id", { count: "exact", head: true }).gt("pending_amount", 0)` si PostgREST lo permite sobre la vista, o RPC `count_pending_payments()`.

### 4.5 Detalles de pedidos en patron N+1 parcial

Evidencia:

```js
public/js/features/orders/orders.js:269-272
while (pendingDetailIds.size) {
  const batch = Array.from(pendingDetailIds).slice(0, DETAIL_BATCH_SIZE);
  const detailRows = await Promise.all(batch.map((id) => getOrderDetail(id)));
```

`getOrderDetail()` trae relaciones por id:

```js
public/js/features/orders/orders-service.js:185
export async function getOrderDetail(orderId) {
```

Impacto estimado:

- Red: para 30 pedidos, hasta 30 requests de detalle en 8 tandas.
- UX: la pantalla aparece antes, pero los detalles tardan.
- Escalabilidad: medio-alto.

Recomendacion: endpoint/RPC de resumen enriquecido con primer item, imagen y cantidad agregada por pagina. Mantener detalle completo solo al abrir el pedido.

### 4.6 `select("*")` en finanzas

Evidencia:

```js
public/js/features/finance/accounts-service.js:21-25
.from("account_balance")
.select("*")

public/js/features/finance/payments-service.js:10-15
.from("orders_financial_status")
.select("*")

public/js/features/finance/transactions-service.js:15-18
.from("financial_movements")
.select("*")
```

Impacto estimado:

- Red: bajo-medio ahora, alto si vistas agregan columnas.
- Mantenibilidad: medio, porque el frontend queda acoplado a columnas futuras.

Recomendacion: seleccionar solo columnas renderizadas.

### 4.7 Updates secuenciales en items de pedido

Evidencia:

```js
public/js/features/orders/orders-service.js:399-415
for (const item of normalizedItems) {
  ...
  const { error } = await supabase
    .from("order_items")
    .update({
      qty: item.qty,
      unit_price: item.unit_price
    })
```

Impacto estimado:

- Tiempo de guardado: lineal por item modificado.
- Red: una request por item.

Recomendacion: RPC transaccional `save_order_items(order_id, items_json)` o upsert/bulk update en DB. Ademas evita estados parciales si falla una operacion intermedia.

### 4.8 Buenas practicas Supabase ya presentes

- `getMyOrdersPage()` usa paginacion con `.range(from, to)`:

```js
public/js/features/orders/orders-service.js:55-60
.select("id, order_number, created_at, order_status, payment_status, total, customer_name", { count: "exact" })
.eq("is_active", true)
.order("created_at", { ascending: false })
.range(from, to);
```

- `getEditableOrderCatalog()` paraleliza variantes y stock:

```js
public/js/features/orders/orders-service.js:294-318
const [variantsResult, stockRows] = await Promise.all([
  ...
  getStockByVariant({ warehouseId, pointOfSaleId })
]);
```

## 5. Problemas de Imágenes

### 5.1 Transformaciones Supabase no utilizadas

Evidencia:

```js
public/js/shared/utils/image.js:3-15
export const IMAGE_TRANSFORMS = {
  catalogCard: { width: 140, height: 140, quality: 70, resize: "contain" },
  productDetail: { width: 720, height: 720, quality: 82, resize: "contain" }
};
```

Pero:

```js
public/js/shared/utils/storage-service.js:9-17
function buildTransformOptions(options = null) {
  return null;
}
const { data } = supabase.storage.from("catalog").getPublicUrl(normalizedPath, transformOptions || undefined);
```

Impacto estimado:

- Red: alto si las imagenes originales son mayores a 140/720 px.
- Memoria: alto en mobile por decodificacion de imagenes grandes.
- LCP/scroll: medio-alto en catalogo.

Recomendacion: devolver `{ transform: { width, height, quality, resize } }` para Supabase Storage o construir URLs transformadas segun version actual de SDK.

### 5.2 Imagenes de admin sin lazy loading ni dimensiones

Evidencia:

```js
public/js/features/product/products-page.js:165-169
<img
  src="${p.image_path ? getImageUrl(String(p.image_path).trim().replace(/^\/+/, "")) : ""}"
  class="w-14 h-14 rounded-xl border divider bg-surface-2 object-contain shrink-0"
  alt="${escapeHtml(p.name)}"
/>
```

Impacto estimado:

- Red: medio. Descarga imagenes fuera del viewport.
- Layout: medio. CSS fija tamanio visual, pero no hay `width`/`height` HTML.

Recomendacion: agregar `loading="lazy"`, `decoding="async"`, `width="56"`, `height="56"` y usar transformacion `catalogCard`.

### 5.3 Iconos PWA sobredimensionados

Evidencia de filesystem:

- `public/assets/icons/icon-192.png`: 107957 bytes
- `public/assets/icons/icon-512.png`: 107957 bytes

Ambos tienen exactamente el mismo peso, lo que sugiere exportacion no optimizada o duplicada.

Impacto estimado:

- Precache: +215 KB durante instalacion.
- Red: bajo-medio, pero evitable.

Recomendacion: recomprimir PNG o usar WebP donde aplique para assets no manifest; mantener PNG para compatibilidad PWA pero optimizado.

### 5.4 Correcto: lazy/eager selectivo en catalogo

El catalogo si diferencia primeras imagenes vs resto:

```js
public/index.html:212-227
const loading = index < FIRST_VISIBLE_IMAGE_COUNT ? "eager" : "lazy";
...
loading="${loading}"
decoding="async"
fetchpriority="${fetchPriority}"
```

## 6. Problemas de Caché y PWA

### 6.1 Precache excesivo

Evidencia:

```js
public/sw.js:7-82
const PRECACHE_URLS = [
  "/",
  "/index.html",
  ...
  "/js/vendor/tailwindcss-playcdn.js",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png"
];
```

Instalacion:

```js
public/sw.js:85-90
await Promise.all(
  PRECACHE_URLS.map(async (url) => {
    await cache.add(url);
```

Impacto estimado:

- Primera instalacion: alto por descargar assets que el usuario quiza nunca visita.
- Storage: medio.
- Updates: medio, cada version invalida `static-vX`.

Recomendacion: precache minimo shell + CSS + modulos iniciales; runtime cache para rutas secundarias.

### 6.2 Estrategia HTML network-first con `no-store`

Evidencia:

```js
public/sw.js:127-131
const fresh = await fetch(req, { cache: "no-store" });
if (fresh.ok) await cache.put(req, fresh.clone());
```

Para HTML:

```js
public/sw.js:161-163
if (accept.includes("text/html")) {
  event.respondWith(networkFirst(req));
}
```

Impacto estimado:

- Red: medio. Cada navegacion HTML intenta red.
- Correctitud: buena para updates.

Recomendacion: mantener network-first para HTML si el negocio prioriza version fresca, pero considerar timeout corto con fallback cache para mobile inestable.

### 6.3 Headers correctos en assets

Evidencia:

```txt
public/_headers
/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

Esto es correcto para assets versionados/inmutables. El problema es que JS/CSS no tienen regla equivalente en `_headers`; se apoyan principalmente en SW.

## 7. Problemas de Escalabilidad

1. Catalogo depende de una vista normal (`v_catalog_variants_available`) con `select("*")`, `count exact`, `ilike "%term%"` y una segunda query de thumbnails.
2. Listados admin cargan todo y filtran en memoria:
   - productos: `getProductsForAdmin({ includeInactive: true })` en `products-page.js:197`
   - clientes: `getCustomers({ includeInactive: true })` en `clients-page.js:159`
   - inventario: `getInventoryMovements({ limit: 150 })` en `inventory-movements-page.js:103`
3. Edicion de pedidos hace multiples escrituras secuenciales.
4. Pedidos usa resumen + detalle incremental por pedido, que mejora percepcion inicial pero escala en requests.
5. Service worker invalida todo el cache estatico por version, incluso si cambio un solo archivo.

## 8. Quick Wins

Optimizaciones menores a 1 hora:

- Activar transformaciones Supabase en `storage-service.js`.
- Agregar `loading="lazy"`, `decoding="async"`, `width` y `height` a imagenes de admin.
- Reemplazar `select("*")` en finanzas por columnas concretas.
- Cambiar `getPendingPaymentsCount()` a conteo server-side.
- Aplicar debounce a busquedas de productos/clientes/inventario.
- Usar delegacion de eventos en catalogo y clientes para evitar registrar listeners por item.
- Quitar `name` del snapshot `CATALOG_NAV_KEY` o reducirlo a estado minimo.
- Optimizar PNG de iconos PWA.

## 9. Plan de Optimización

| Clasificacion | Mejora | Impacto esperado |
| --- | --- | --- |
| Bajo esfuerzo / Alto impacto | Activar Supabase image transforms. | Reduce red y memoria en catalogo/producto. |
| Bajo esfuerzo / Alto impacto | Debounce en busquedas admin. | Reduce renders por tecla en mobile. |
| Bajo esfuerzo / Alto impacto | Reemplazar `select("*")` en finanzas y catalogo por columnas. | Reduce payload y acoplamiento. |
| Bajo esfuerzo / Alto impacto | Server-side count para pagos pendientes. | Evita descargar toda la vista. |
| Bajo esfuerzo / Bajo impacto | Optimizar iconos PWA. | Menor precache inicial. |
| Bajo esfuerzo / Bajo impacto | Reducir snapshot de `sessionStorage`. | Menos serializacion y storage. |
| Alto esfuerzo / Alto impacto | Compilar Tailwind y eliminar Play CDN. | Gran mejora en parse/evaluacion JS y TTI. |
| Alto esfuerzo / Alto impacto | Crear RPC/vista materializada para catalogo con thumbnail y busqueda indexable. | Menos requests y busquedas escalables. |
| Alto esfuerzo / Alto impacto | RPC transaccional para `saveOrderItems`. | Menos requests, consistencia transaccional. |
| Alto esfuerzo / Alto impacto | Endpoint de pedidos enriquecidos por pagina. | Elimina N+1 parcial. |
| Alto esfuerzo / Bajo impacto | Virtualizacion completa de listas admin. | Util si los listados crecen mucho; hoy primero conviene paginar/debounce. |

## 10. Ranking de Archivos Más Problemáticos

1. `public/js/vendor/tailwindcss-playcdn.js` - 407 KB de runtime innecesario si se compila Tailwind.
2. `public/sw.js` - precache excesivo y cache estatico monolitico por version.
3. `public/js/shared/utils/storage-service.js` - desactiva transformaciones de imagenes.
4. `public/js/features/catalog/catalog-service.js` - `select("*")`, `count exact`, busqueda `%term%`, segunda query de imagenes.
5. `public/index.html` - render completo del catalogo, listeners por item, snapshot creciente.
6. `public/js/features/orders/orders.js` - detalles incrementales con requests por pedido.
7. `public/js/features/orders/orders-service.js` - conteo frontend y updates secuenciales.
8. `public/js/features/product/products-page.js` - carga completa admin, busqueda sin debounce, imagenes sin lazy/dimensiones.
9. `public/js/features/customers/clients-page.js` - carga completa, render/listeners por item, busqueda sin debounce.
10. `public/js/features/finance/*-service.js` - varios `select("*")`, aunque con limites en algunos casos.

## Justificación técnica de la nota

La app merece **5.8/10** porque tiene bases razonables para una PWA modular y varias optimizaciones ya presentes, pero todavia arrastra costos significativos de runtime y red. Los factores que mas bajan la nota son: Tailwind Play CDN en produccion, transformaciones de imagenes inoperantes, `select("*")` en rutas importantes, precache demasiado amplio y patrones de render/listener que crecen linealmente con los datos. Con los quick wins y Tailwind compilado, el score deberia subir aproximadamente a 72-78/100. Con RPCs/vistas optimizadas para catalogo y pedidos, podria acercarse a 85/100.
