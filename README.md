# JYPTrendApp

App web de ventas para JyP orientada a uso mobile. Es un frontend estatico en `public/` que consume Supabase (Auth, Postgres y Storage) sin build step.

## Resumen ejecutivo

- Estado actual: funcional para operacion diaria (catalogo, carrito, Reserva, pedidos, clientes, productos, PWA basica).
- Version de app en repo: `v1.0.53` (`public/version.json`, fecha `2026-03-09`).
- Arquitectura: HTML + JS modular + Tailwind CDN + Supabase JS CDN.
- Hosting esperado: Cloudflare Pages.
- Fuente de verdad backend: `docs/supabase-architecture-final.md`.

## Stack y arquitectura

- Frontend:
  - HTML multipagina en `public/pages/*.html` + `public/index.html`.
  - CSS tema en `public/css/theme.css`.
  - Tailwind Play CDN (`public/js/vendor/tailwindcss-playcdn.js`).
  - JavaScript ES Modules sin empaquetador.
- Backend:
  - Supabase Postgres (tablas + views + RLS).
  - Supabase Auth (Google OAuth PKCE).
  - Supabase Storage bucket publico `catalog` para imagenes.
- Offline/PWA:
  - `manifest.webmanifest`.
  - Service Worker `public/sw.js`.
  - Registro/upgrade controlado en `public/js/sw-register.js`.
- Persistencia local:
  - Carrito en `localStorage` (`jyp_cart_v1`).
  - `auth_next` para redireccion post-login.

## Estructura clave del frontend

```text
public/
  index.html
  sw.js
  version.json
  js/
    app-shell.js
    auth.js
    lib/
      supabase-client.js
    services/
      auth-service.js
      catalog-service.js
      customers-service.js
      order-service.js
      orders-service.js
      product-service.js
      stock-service.js
      storage-service.js
    utils/
      permissions.js
  pages/*.html
```

Nota: existe `public/js/supabase-client.js` por compatibilidad legacy, pero el cliente activo y recomendado es `public/js/lib/supabase-client.js`.

## Integracion Supabase (estado actual)

- Cliente Supabase unico:
  - `public/js/lib/supabase-client.js`
- Consultas centralizadas:
  - `public/js/services/*.js`
- Autenticacion y perfil:
  - `public/js/services/auth-service.js` consulta `profiles`.
  - `public/js/auth.js` expone guardas de sesion y perfil.
- Autorizacion por rol (fuente de verdad: `profiles.role`):
  - `public/js/utils/permissions.js`
  - Roles validos: `admin`, `seller`, `viewer`.
  - Rol desconocido -> fallback seguro `viewer`.

## Permisos de UI por rol

- `admin`:
  - acceso completo a menu y operaciones.
- `seller`:
  - operaciones comerciales (pedidos/pagos) sin funciones admin.
- `viewer`:
  - acceso restringido a catalogo (sin creacion de pedidos ni gestion).

Las reglas se centralizan en helpers reutilizables:
- `canManageUsers`
- `canManageInventory`
- `canCreateOrders`
- `canRegisterPayments`
- `canViewAdminPanel`
- `canViewReports`

## Catalogo y stock real

- El catalogo no usa un campo de stock inventado en `products`.
- Fuente de verdad de stock: `inventory_movements` via views.
- Implementado en frontend:
  - `public/js/services/stock-service.js` consulta `v_inventory_stock_by_product` y `v_inventory_stock_by_variant`.
  - `public/js/services/catalog-service.js` enriquece productos con `stock_qty` real.
  - `public/index.html` muestra stock y deshabilita agregar al carrito si no hay stock.

## Modelo de datos relevante para frontend

Tablas principales usadas:
- `products`, `product_variants`, `categories`
- `orders`, `order_items`
- `customers`
- `payments`, `payment_allocations`
- `inventory_movements`
- `profiles`

Views principales usadas/recomendadas:
- `v_inventory_stock_by_product`
- `v_inventory_stock_by_variant`
- `v_order_summary`
- `v_order_payment_summary`
- `v_sales_by_day`
- `v_sales_by_product`
- `mv_sales_by_product` (materialized)

## SQL y migraciones en repo

- `database/2026-02-19_add_order_number.sql`
- `database/2026-02-20_customers_abm.sql`
- `database/2026-03-07_enforce_canonical_statuses.sql`
- `database/2026-03-07_fix_profiles_rls_recursion.sql`

## Reglas de backend a respetar

- No inventar tablas/columnas/relaciones/estados fuera de `docs/supabase-architecture-final.md`.
- Usar `profiles.role` como capa de autorizacion.
- Para reporting, priorizar views.
- Para stock, usar `inventory_movements` o views de stock.
- Respetar triggers de DB para subtotales/totales.

## Como ejecutar local

No hay `package.json` ni build. Servir la carpeta `public/` con un servidor estatico:

```powershell
npx serve public
```

o equivalente (`python -m http.server`, etc.) apuntando a `public/`.

## Riesgos / deuda tecnica

1. Configuracion de Supabase aun expuesta en frontend (anon key/public URL).
2. Uso de Tailwind Play CDN en produccion.
3. Cobertura de testing automatizado baja o inexistente.
4. Falta CI con quality gates.
5. Documentar y versionar todas las politicas RLS operativas en SQL del repo.

## Backlog recomendado

1. Migrar Tailwind CDN a build pipeline (CLI/PostCSS).
2. Consolidar y remover wrappers/archivos legacy no usados (`public/js/supabase-client.js`) cuando sea seguro.
3. Expandir uso de views para dashboards y reportes.
4. Agregar tests de servicios Supabase criticos (auth, pedidos, stock).




