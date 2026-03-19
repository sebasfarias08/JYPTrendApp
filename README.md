# JYPTrendApp

App web de ventas para JyP orientada a uso mobile. Es un frontend estatico en `public/` que consume Supabase (Auth, Postgres y Storage) sin build step.

## Resumen ejecutivo

- Estado actual: funcional para operacion diaria (catalogo, carrito, Reserva, pedidos, clientes, productos, PWA basica).
- Version de app en repo: `v1.7.2` (`public/version.json`, fecha `2026-03-19`).
- Arquitectura: HTML multipagina + JavaScript ES Modules + Tailwind CDN + Supabase JS CDN.
- Hosting esperado: Cloudflare Pages.
- Fuente de verdad backend: `docs/supabase-architecture-final.md`.

## Stack y arquitectura

- Frontend:
  - HTML multipagina en `public/pages/*.html` + `public/index.html`.
  - CSS tema en `public/css/theme.css`.
  - Tailwind Play CDN en `public/js/vendor/tailwindcss-playcdn.js`.
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
      inventory/
      orders/
      product/
    shared/
      ui/
      utils/
    vendor/
      tailwindcss-playcdn.js
    services/   # wrappers legacy
    utils/      # wrappers legacy
    lib/        # wrapper legacy
    *.js        # wrappers legacy / entrypoints historicos
  pages/*.html
```

### Convencion vigente

- Modulos reales:
  - `public/js/app/`
  - `public/js/features/`
  - `public/js/shared/`
  - `public/js/vendor/`
- Wrappers legacy conservados por compatibilidad:
  - `public/js/components/*.js`
- Las paginas HTML activas ya importan modulos reales bajo `app/`, `features/` y `shared/`.
- Tras el cierre final de wrappers legacy, ya no quedan wrappers en `public/js/` ni en `public/js/components/`; `public/sw.js` sigue precacheando solo rutas modulares reales.

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

## Catalogo y stock real

- El catalogo no usa un campo de stock inventado en `products`.
- Fuente de verdad de stock: `inventory_movements` via views.
- Implementado en frontend:
  - `public/js/features/inventory/stock-service.js` consulta `v_inventory_stock_by_product` y `v_inventory_stock_by_variant`.
  - `public/js/features/catalog/catalog-service.js` consulta `public.v_catalog_variants_available` y mantiene `stock_qty` real sin merge cliente adicional.
  - `public/index.html` muestra stock y deshabilita agregar al carrito si no hay stock.
- Vista de catalogo optimizada:
  - `public.v_catalog_variants_available` unifica `product_variants`, `products`, `categories` y `v_inventory_stock_by_variant`.
  - el filtro operativo se resuelve por `warehouse_id` y `point_of_sale_id` del `salesContext`.
  - el `salesContext` ahora llega desde una sola RPC en lugar de multiples lecturas frontend sobre `profiles`, `warehouses` y `points_of_sale`.
  - esto reduce roundtrips al backend y evita combinar resultados en memoria del navegador.

## SQL y migraciones en repo

- `database/2026-02-19_add_order_number.sql`
- `database/2026-02-20_customers_abm.sql`
- `database/2026-03-07_enforce_canonical_statuses.sql`
- `database/2026-03-07_fix_profiles_rls_recursion.sql`
- `database/20260319_create_v_catalog_variants_available.sql`

## Como ejecutar local

No hay `package.json` ni build. Servir la carpeta `public/` con un servidor estatico:

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

## Riesgos / deuda tecnica

1. Ya no quedan wrappers legacy de runtime en el repo; el riesgo residual pasa a ser evitar su reintroduccion.
2. Configuracion de Supabase aun expuesta en frontend (anon key/public URL).
3. Uso de Tailwind Play CDN en produccion.
4. Cobertura de testing automatizado baja o inexistente.
5. Falta CI con quality gates.

## Backlog recomendado

1. Agregar una verificacion automatica de imports legacy en CI.
2. Agregar tests de servicios Supabase criticos (auth, pedidos, stock).
