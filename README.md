# JYPTrendApp

App web de ventas para JyP orientada a uso mobile. Es un frontend estatico en `public/` que consume Supabase (Auth, Postgres y Storage) sin build step.

## Resumen ejecutivo

- Estado actual: funcional para operacion diaria (catalogo, carrito, Reserva, pedidos, clientes, productos, PWA basica).
- Version de app en repo: `v1.2.1` (`public/version.json`, fecha `2026-03-19`).
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
  - `public/js/*.js`
  - `public/js/services/*.js`
  - `public/js/utils/*.js`
  - `public/js/lib/supabase-client.js`
- Las paginas HTML activas ya importan modulos reales bajo `app/`, `features/` y `shared/`.
- No eliminar wrappers sin revisar antes compatibilidad con URLs publicas historicas; `public/sw.js` ya precachea rutas modulares reales.

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
- Autorizacion por rol:
  - `public/js/app/auth/permissions.js`
  - Roles validos: `admin`, `seller`, `viewer`.
  - Rol desconocido -> fallback seguro `viewer`.

## Catalogo y stock real

- El catalogo no usa un campo de stock inventado en `products`.
- Fuente de verdad de stock: `inventory_movements` via views.
- Implementado en frontend:
  - `public/js/features/inventory/stock-service.js` consulta `v_inventory_stock_by_product` y `v_inventory_stock_by_variant`.
  - `public/js/features/catalog/catalog-service.js` enriquece productos con `stock_qty` real.
  - `public/index.html` muestra stock y deshabilita agregar al carrito si no hay stock.

## SQL y migraciones en repo

- `database/2026-02-19_add_order_number.sql`
- `database/2026-02-20_customers_abm.sql`
- `database/2026-03-07_enforce_canonical_statuses.sql`
- `database/2026-03-07_fix_profiles_rls_recursion.sql`

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
  - las referencias legacy encontradas en repo quedan concentradas en wrappers de compatibilidad y documentacion de inventario.
- Inventario y recomendacion de wrappers legacy:
  - ver `docs/project-context.md`.

## Riesgos / deuda tecnica

1. Los wrappers legacy siguen presentes en `public/js/`; antes de eliminarlos hay que validar que no queden consumidores externos o URLs publicas historicas.
2. Configuracion de Supabase aun expuesta en frontend (anon key/public URL).
3. Uso de Tailwind Play CDN en produccion.
4. Cobertura de testing automatizado baja o inexistente.
5. Falta CI con quality gates.

## Backlog recomendado

1. Retirar wrappers clasificados como probablemente innecesarios en una ventana de deprecacion controlada.
2. Revalidar offline en instalacion limpia y upgrade despues de la realineacion del precache.
3. Agregar una verificacion automatica de imports legacy en CI.
4. Agregar tests de servicios Supabase criticos (auth, pedidos, stock).
