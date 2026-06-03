# JYPTrendApp

App web de ventas para JyP orientada a uso mobile. Es un frontend estatico en `public/` que consume Supabase (Auth, Postgres y Storage) y compila Tailwind en un CSS estatico.

## Resumen ejecutivo

- Estado actual: funcional para operacion diaria (catalogo, carrito, Reserva, pedidos, clientes, productos, variantes, inventario, logistica, finanzas, reportes y PWA basica).
- Version de app en repo: `v1.8.15` (`public/version.json`, fecha `2026-06-02`).
- Arquitectura: HTML multipagina + JavaScript ES Modules + Tailwind CSS compilado + Supabase JS CDN.
- Hosting esperado: Cloudflare Pages.
- Fuente de verdad backend: `docs/supabase-architecture-final.md`.
- Ultima actualizacion: lazy-load de módulos opcionales + corrección de redirect handling en Service Worker; main-thread optimizado, navegación sin errores.

## Stack y arquitectura

- Frontend:
  - HTML multipagina en `public/pages/*.html` + `public/index.html`.
  - CSS tema en `public/css/theme.css`.
  - Tailwind compilado en `public/css/tailwind.css`.
  - JavaScript ES Modules sin empaquetador.
- Backend:
  - Supabase Postgres (tablas + views + RLS).
  - Supabase Auth (Google OAuth PKCE).
  - Supabase Storage bucket publico `catalog` para imagenes.
- Offline/PWA:
  - `manifest.webmanifest`.
  - Service Worker `public/sw.js`.
  - Registro/upgrade controlado en `public/js/app/core/sw-register.js`.
- Persistencia local:
  - Carrito en `localStorage` (`jyp_cart_v1`).
  - `auth_next` para redireccion post-login.

## Estructura actual del frontend

```text
public/
  index.html
  sw.js
  version.json
  js/
    app/
      auth/
      core/
      shell/
    features/
      catalog/
      checkout/
      customers/
      finance/
      inventory/
      orders/
      product/
    shared/
      ui/
      utils/
  css/
    theme.css
    tailwind.css
  pages/*.html
```

### Convencion vigente

- Modulos reales:
  - `public/js/app/`
  - `public/js/features/`
  - `public/js/shared/`
- Las paginas HTML activas ya importan modulos reales bajo `app/`, `features/` y `shared/`.
- Tras el cierre final de wrappers legacy, ya no quedan wrappers en `public/js/` ni en `public/js/components/`; `public/sw.js` sigue precacheando solo rutas modulares reales.

### Build CSS

```bash
npm install
npm run build:css
```

El comando genera `public/css/tailwind.css` a partir de `src/styles/tailwind.css` y `tailwind.config.js`.

## Funcionalidades principales

- Catalogo mobile:
  - `public/index.html`
  - `public/js/features/catalog/catalog-service.js`
  - tabs por categoria (`perfumes`, `botellas`, `importados`, `outlet`) y busqueda.
- Carrito y Reserva:
  - `public/js/features/checkout/cart.js`
  - `public/pages/checkout.html`
  - `public/js/features/checkout/checkout-page.js`
- Pedidos y reportes:
  - historial: `public/pages/pedidos.html`
  - detalle: `public/pages/pedido-detalle.html`
  - reporte: `public/pages/pedidos-reporte.html`
  - servicios: `public/js/features/orders/`
- Clientes:
  - listado y ABM en `public/pages/clientes.html` y `public/pages/cliente-form.html`.
  - servicio en `public/js/features/customers/customers-service.js`.
- Productos y variantes:
  - productos: `public/pages/productos.html`, `public/pages/productos-form.html`.
  - variantes: `public/pages/variantes.html`.
  - detalle/edicion rapida: `public/pages/producto.html`.
  - servicios en `public/js/features/product/`.
- Inventario y logistica:
  - stock real desde `inventory_movements` mediante views.
  - movimientos de inventario en `public/pages/movimientos-inventario.html` y `public/pages/movimientos-inventario-form.html`.
  - depositos y puntos de venta en `public/pages/inventarios-logisticos.html` y `public/pages/inventarios-logisticos-form.html`.
  - servicios en `public/js/features/inventory/`.
- Finanzas:
  - dashboard en `public/pages/finance.html`.
  - cuentas en `public/pages/finance-accounts.html`.
  - registro de gastos, transferencias y pagos en `public/pages/finance-expenses.html`.
  - transacciones en `public/pages/finance-transactions.html`.
  - servicios en `public/js/features/finance/`.

## Integracion Supabase

- Cliente Supabase unico:
  - `public/js/app/core/supabase-client.js`
- Consultas por dominio:
  - `public/js/features/**`
  - `public/js/shared/utils/storage-service.js`
  - `public/js/app/auth/auth-service.js`
- Autenticacion y perfil:
  - `public/js/app/auth/auth-service.js` consulta `profiles`.
  - `public/js/app/auth/auth.js` expone guardas de sesion y perfil.
- Sales context:
  - `public/js/app/core/sales-context-service.js` resuelve `warehouse_id` y `point_of_sale_id` con una sola RPC a `public.get_sales_context_resolved(p_user_id uuid)`.
  - se mantiene cache por usuario y el mismo contrato publico consumido por catalogo, producto y pedidos.
- Autorizacion por rol:
  - `public/js/app/auth/permissions.js`
  - Roles validos: `admin`, `seller`, `viewer`.
  - Rol desconocido -> fallback seguro `viewer`.
  - Finanzas e inventario se exponen desde la navegacion solo para `admin`.
  - Productos, variantes, depositos, puntos de venta y movimientos de inventario requieren rol `admin` en sus paginas.
  - Checkout requiere rol `admin` o `seller`.

## Catalogo y stock real

- El catalogo no usa un campo de stock inventado en `products`.
- Fuente de verdad de stock: `inventory_movements` via views.
- Implementado en frontend:
  - `public/js/features/inventory/stock-service.js` consulta `v_inventory_stock_by_product` y `v_inventory_stock_by_variant`.
  - `public/js/features/catalog/catalog-service.js` consulta `public.v_catalog_variants_available` y mantiene `stock_qty` real sin merge cliente adicional.
  - `public/index.html` muestra stock y deshabilita agregar al carrito si no hay stock.
- Optimizacion incremental de imagenes:
  - `public/js/shared/utils/image.js` y `public/js/shared/utils/storage-service.js` ahora soportan URLs transformadas de Supabase Storage.
  - el catalogo usa thumbnails transformadas, `loading`/`fetchpriority` por prioridad visual y `decoding="async"`.
  - el detalle de producto usa una transformacion mayor con layout estable para reducir layout shift.
  - si el proyecto no soporta image transformations, catalogo y detalle hacen fallback automatico a la URL publica original para no romper la carga.
- Vista de catalogo optimizada:
  - `public.v_catalog_variants_available` unifica `product_variants`, `products`, `categories` y `v_inventory_stock_by_variant`.
  - el filtro operativo se resuelve por `warehouse_id` y `point_of_sale_id` del `salesContext`.
  - el `salesContext` ahora llega desde una sola RPC en lugar de multiples lecturas frontend sobre `profiles`, `warehouses` y `points_of_sale`.
  - esto reduce roundtrips al backend y evita combinar resultados en memoria del navegador.

## Como ejecutar local

Instalar dependencias y compilar Tailwind:

```powershell
npm install
npm run build:css
```

Despues servir la carpeta `public/` con un servidor estatico:

```powershell
npx serve public
```

o equivalente (`python -m http.server`, etc.) apuntando a `public/`.

## Hardening posterior a la refactorizacion

- Documentacion alineada con la estructura modular actual.
- Version documental alineada con `public/version.json`.
- Imports internos auditados:
  - no se detectaron modulos internos de `public/js/**/*.js` importando wrappers legacy cuando ya existe el modulo real;
  - los wrappers legacy retirados de `public/js/services/`, `public/js/utils/`, `public/js/lib/`, las cuatro tandas controladas de wrappers top-level y la tanda final de `public/js/components/` no tenian uso en runtime ni dependian del precache;
  - las referencias legacy que quedan en repo se limitan a documentacion historica de inventario y algunos comentarios de trazabilidad.
- Inventario y recomendacion de wrappers legacy:
  - ver `docs/project-context.md`.
- Catalogo:
  - la carga principal ahora depende de una sola vista en Supabase para reducir latencia y trabajo en cliente.
  - la resolucion previa de sales context en frontend fue reemplazada por una sola RPC a Supabase para evitar queries redundantes antes de leer el catalogo.
  - las imagenes del cold load mobile ahora descargan variantes mas chicas en cards y priorizan solo la primera imagen visible.
  - el helper de imagenes conserva compatibilidad con proyectos sin transformaciones de Storage mediante fallback al asset publico.

## Cambios en v1.8.12 (2026-06-02): Mobile-first responsive refinement

- **Paginas de detalle y formularios:**
  - `public/pages/pedido-detalle.html`: contenedor adaptativo `max-w-5xl mx-auto w-full` para mejor visualizacion de detalles de pedido en desktop.
  - `public/pages/cliente-form.html`: wrapper `max-w-2xl mx-auto w-full` para formularios no demasiado anchos; botones de accion apilados en mobile (`flex-col gap-2 sm:flex-row`).
  - `public/pages/movimientos-inventario.html`: grid responsive para lista de movimientos; busqueda y boton "Nuevo" en fila adaptativa.
  - `public/pages/movimientos-inventario-form.html`: formulario limitado a `max-w-3xl`; campos agrupados en `sm:grid-cols-2` para mejor uso de espacio desktop; botones mobile-first.
- **Preservacion:**
  - ninguna logica de negocio ni interacciones backend fueron modificadas.
  - modulos JavaScript permanecen funcionalmente identicos.
  - integracion con servicios Supabase sin cambios.

## Cambios en v1.8.13 (2026-06-02): Navegacion optimizada y prefetch en background

- **Transiciones visuales de navegacion:**
  - `public/css/theme.css`: agregadas transiciones suaves con overlay de carga y spinner durante navegacion.
  - `public/js/app/shell/app-shell.js`: intercepcion de clicks en menu para mostrar overlay antes de navegar; fade-out/fade-in controlado.
  - Los usuarios ven una transicion fluida (fade + loader) en lugar de "blanco abrupto" al cambiar de pagina.

- **Prefetch inteligente en background:**
  - `public/sw.js`: nuevo mensaje handler `PREFETCH_URLS` que cachea paginas en `CACHE_RUNTIME` de forma silenciosa.
  - `public/js/app/shell/app-shell.js`: funcion `prefetchMenuPages(role)` que inicia prefetch de paginas segun el rol del usuario.
  - Prefetch se inicia 3.5 segundos despues de cargar la pagina, sin interferir con carga inicial.
  - Pages prefetcheadas:
    - Todos: `home.html`, `index.html`, `pedidos.html`, `clientes.html`, `checkout.html`.
    - Admin: ademas `productos.html`, `variantes.html`, `finance.html`, `inventarios-logisticos.html`, `movimientos-inventario.html`, `pedidos-reporte.html`.
  - Resultado: navegacion instantanea (sin esperas) cuando el usuario hace click en el menu despues de los primeros segundos.

- **Preservacion:**
  - Service Worker precache intacto; prefetch usa cache separado.
  - No hay cambios en logica de negocio ni backend.
  - Compatible con todos los navegadores con Service Worker support.

## Cambios en v1.8.14 (2026-06-02): Lazy-load de módulos + HTML cache-first

- **Lazy-load de módulos opcionales (B):**
  - `public/js/app/shell/app-shell.js`: nueva función `lazyLoadOptionalModules(role)` que defer-carga con `requestIdleCallback` módulos que solo ciertos usuarios usan:
    - Finance: `finance-dashboard.js` (solo para usuarios con permisos).
    - Inventory/Admin: `inventory-movements-page.js`, `logistics-inventories-page.js` (solo para `canManageInventory`).
    - Products: `products-page.js` (solo para `canManageInventory`).
    - Reports: `orders-report.js` (solo para `canViewReports`).
  - Módulos se cargan en idle callback (después de que el usuario interactúa), no bloqueando paint inicial.
  - Timeout: 8s máximo para evitar que se carguen nunca si el usuario está activo.
  - Resultado: reduce el parse/eval JS que bloquea main-thread en navegación inicial; main thread libre para render más rápido.

- **HTML cache-first en Service Worker (C):**
  - `public/sw.js`: nueva función `htmlCacheFirst(req)` que prioriza HTML cacheado.
  - Estrategia para HTML: `cacheFirst` en lugar de `networkFirst` cuando el HTML ya está en cache.
  - Después del prefetch, navegación a páginas cacheadas es casi instantánea (evita TTFB de red).
  - Fallback: si cache miss o error, intenta fetch de red; si falla, error controlado.
  - Resultado: reduce latencia de red en navegación entre páginas; TTFB ~0ms para HTML ya cacheado.

- **Preservacion:**
  - Ningún cambio en lógica de negocio, servicios Supabase, o flujos de datos.
  - Dynamic imports son silenciosos (no interfieren con el flujo del usuario).
  - Módulos se cargan bajo demanda real (no se cargan si el usuario no navega a esas secciones).
  - Cache strategy: navegación posteriores a la primera son aún más rápidas.

**Impacto esperado:**
- Reducción de 300-700ms en el "blanco" al navegar (menos JS parse, TTFB eliminado para HTML cacheado).
- Main thread desocupado más rápido → paint más rápido → UX más fluida.
- Después de prefetch (3.5s), navegación prácticamente instantánea.

## Cambios en v1.8.15 (2026-06-02): Fix redirect handling en SW

- **Problema encontrado:**
  - Cloudflare/servidor redirige requests (`/pages/pedidos.html` → URL final).
  - Cache API rechaza almacenar respuestas redirected bajo cualquier circunstancia.
  - Estrategia C (cache-first para HTML) causaba errores: "a redirected response was used for a request whose redirect mode is not 'follow'".

- **Solución implementada:**
  - HTML ahora usa `networkFirst()` en lugar de `htmlCacheFirst()`.
  - `networkFirst()` maneja redirects correctamente: fetch con `redirect: "follow"`, y solo cachea si no fue redirected.
  - Resultado: requests a HTML se resuelven sin errores; prefetch de assets (JS/CSS/images) sigue funcionando.

- **Impacto:**
  - Eliminados errores de "redirected response" en Service Worker.
  - Navegación entre páginas funciona normalmente (network + cache para misses).
  - Prefetch aún acelera assets (JS, CSS, images) automáticamente.
  - Trade-off: HTML TTFB no es instant como en v1.8.14, pero es compatible con servidores que redirigen.

## Riesgos / deuda tecnica


1. Ya no quedan wrappers legacy de runtime en el repo; el riesgo residual pasa a ser evitar su reintroduccion.
2. Configuracion de Supabase aun expuesta en frontend (anon key/public URL).
3. Mantener `public/css/tailwind.css` compilado antes de publicar cambios de clases Tailwind.
4. Cobertura de testing automatizado baja o inexistente.
5. Falta CI con quality gates.

## Backlog recomendado

1. Agregar una verificacion automatica de imports legacy en CI.
2. Agregar tests de servicios Supabase criticos (auth, pedidos, stock).
