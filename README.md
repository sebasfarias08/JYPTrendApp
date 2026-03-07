# JYPTrendApp

App web de ventas para JyP orientada a uso mobile. Es un frontend estatico en `public/` que consume Supabase (Auth, Postgres y Storage) sin build step.

## Resumen ejecutivo

- Estado actual: funcional para operacion diaria (catalogo, carrito, checkout, pedidos, clientes, productos, PWA basica).
- Version de app en repo: `v1.0.40` (`public/version.json`, fecha `2026-03-07`).
- Arquitectura: HTML + JS modular + Tailwind CDN + Supabase JS CDN.
- Hosting esperado: Cloudflare Pages.
- Riesgo principal: configuracion hardcodeada de Supabase (sin estrategia formal multiambiente en frontend).

## Stack y arquitectura

- Frontend:
  - HTML multipagina en `public/pages/*.html` + `public/index.html`.
  - CSS tema en `public/css/theme.css`.
  - Tailwind Play CDN (`public/js/vendor/tailwindcss-playcdn.js`).
  - JavaScript ES Modules sin empaquetador.
- Backend:
  - Supabase Postgres: tablas `products`, `categories`, `orders`, `order_items`, `customers`.
  - Supabase Auth: login Google OAuth PKCE.
  - Supabase Storage: bucket publico `catalog` para imagenes.
- Offline/PWA:
  - `manifest.webmanifest`.
  - Service Worker `public/sw.js` (cache estatico + runtime).
  - Registro/upgrade controlado en `public/js/sw-register.js`.
- Persistencia local:
  - Carrito en `localStorage` (`jyp_cart_v1`).
  - `auth_next` para redireccion post-login.

## Estructura del repo

```text
database/
  2026-02-19_add_order_number.sql
  2026-02-20_customers_abm.sql
  2026-03-07_enforce_canonical_statuses.sql
public/
  _headers
  index.html
  manifest.webmanifest
  sw.js
  version.json
  assets/icons/*
  css/theme.css
  js/*.js
  pages/*.html
README.md
```

## Funcionalidad implementada

- Autenticacion:
  - Login Google (`/pages/login.html`) y callback (`/pages/auth-callback.html`).
  - Guard de sesion con `requireAuth()` en paginas privadas.
- Catalogo:
  - Listado por tabs (`botellas`, `perfumes`, `importados`, `outlet`) en `/index.html`.
  - Busqueda por nombre.
  - Agregado rapido al carrito.
- Producto:
  - Detalle (`/pages/producto.html`), compartir, copiar link, descargar imagen.
  - Edicion rapida en modal.
- Checkout:
  - Gestion de cantidades y total.
  - Cliente obligatorio (selector buscable, alta rapida de cliente).
  - Creacion de pedido con items.
- Pedidos:
  - Listado con filtros (`/pages/pedidos.html`) por estado y busqueda.
  - Detalle (`/pages/pedido-detalle.html`) con cambio de estado de pedido y pago.
- Clientes (ABM):
  - Listado, busqueda, baja/reactivacion.
  - Alta/edicion con validaciones y mensajes de constraints.
- Productos (ABM):
  - Listado, busqueda, baja/reactivacion.
  - Alta/edicion con categorias.
- Home:
  - KPIs simples diarios y pedidos recientes abiertos.
- About:
  - Diagnostico de version local SW vs version de servidor.
  - Check de update y refresh forzado.

## Modelo de datos y migraciones

### Tablas usadas por frontend

- `products`: `id`, `name`, `description`, `price`, `image_path`, `active`, `category_id`, `created_at`.
- `categories`: `id`, `name`, `slug`.
- `orders`: `id`, `order_number`, `user_id`, `customer_id`, `order_status`, `payment_status`, `customer_name`, `customer_phone`, `notes`, `total`, `created_at`.
- `order_items`: `order_id`, `product_id`, `qty`, `unit_price`, `subtotal`.
- `customers`: `id`, `user_id`, `full_name`, `phone`, `email`, `notes`, `is_active`, `created_at`, `updated_at`.

### SQL incluido en repo

- `database/2026-02-19_add_order_number.sql`:
  - Agrega `orders.order_number`.
  - Crea secuencia y unique index.
  - Backfill para pedidos existentes.
- `database/2026-02-20_customers_abm.sql`:
  - Crea tabla `customers`, trigger `updated_at`, constraints y politicas RLS.
  - Agrega `orders.customer_id` + FK a `customers`.
  - Migra clientes desde `orders.customer_name/customer_phone`.
- `database/2026-03-07_enforce_canonical_statuses.sql`:
  - Normaliza estados legacy en `orders.order_status`, `orders.payment_status` y `payments.payment_status`.
  - Endurece constraints para permitir solo valores canónicos:
    - `order_status`: `NUEVO | CONFIRMADO | ENVIADO | ENTREGADO | CANCELADO`
    - `payment_status`: `PENDIENTE | PARCIAL | PAGADO | FALLIDO | CANCELADO`

### RLS documentado (customers)

Politicas creadas por migracion:

- `customers_select_own` -> `auth.uid() = user_id`
- `customers_insert_own` -> `with check auth.uid() = user_id`
- `customers_update_own` -> `using/with check auth.uid() = user_id`
- `customers_delete_own` -> `auth.uid() = user_id`

Nota: en este repo no hay migraciones de RLS para `orders`, `order_items`, `products` y `categories`; deben existir en Supabase para aislamiento por usuario/rol segun estrategia de negocio.

## Decisiones tecnicas relevantes

- `order-service.js` y `orders-service.js` operan contra el esquema canónico (sin fallbacks legacy).
- La UI usa estados alineados con el contrato final:
  - `order_status`: `NUEVO`, `CONFIRMADO`, `ENVIADO`, `ENTREGADO`, `CANCELADO`
  - `payment_status`: `PENDIENTE`, `PARCIAL`, `PAGADO`, `FALLIDO`, `CANCELADO`
- Los subtotales/totales se respetan como responsabilidad de triggers DB.

## Configuracion actual (hardcodeada)

- `public/js/supabase-client.js`:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- `public/js/image.js`:
  - `SUPABASE_PROJECT_ID`

Recomendado: centralizar a `public/config.js` generado en deploy o inyectar via Pages Functions/Workers.

## PWA y cache

- `public/sw.js` usa:
  - `CACHE_STATIC` versionado por `APP_VERSION`.
  - `CACHE_RUNTIME` para html/imagenes/fetch runtime.
- Mecanismo de update:
  - Banner en shell cuando hay SW esperando.
  - `SKIP_WAITING` al confirmar.
  - Reload al tomar control (`controllerchange`).
- Archivos de control:
  - `public/version.json` para chequeo visual de version.
  - `public/_headers` evita cache agresivo en `sw.js` y `manifest`.

## Como ejecutar local

No hay `package.json` ni build. Servir la carpeta `public/` con un servidor estatico:

```powershell
npx serve public
```

o equivalente (`python -m http.server`, etc.) apuntando a `public/`.

## Riesgos actuales y deuda tecnica

1. Configuracion sensible hardcodeada en frontend.
2. Falta de adopcion de vistas/materialized views para reporting de dashboards.
3. Falta de testing automatizado (unitario/integracion/e2e).
4. Sin pipeline de lint/format/quality gates.
5. Sin documentacion de politicas RLS completas para todas las tablas operativas.
6. Uso de Tailwind Play CDN en produccion (costo/performance y falta de purga).

## Backlog recomendado (prioridad)

1. Config runtime y rotacion de claves/proyectos por ambiente.
2. Migrar consultas de analitica/dashboard hacia `v_order_summary`, `v_order_payment_summary`, `v_sales_by_day` y/o `mv_sales_by_product`.
3. Definir y versionar migraciones/RLS completas (`orders`, `order_items`, `products`, `categories`).
4. Agregar manejo de errores de red/reintentos en checkout y cambios de estado.
5. Instrumentar analitica operativa (conversion checkout, tiempos por estado).
6. Introducir suite minima de tests + CI.
