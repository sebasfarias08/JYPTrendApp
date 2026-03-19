# Project Context - JYPTrendApp

## Purpose
JYPTrendApp is a mobile-first sales web app for daily B2B operations.
Main flow: catalog -> cart -> Reserva -> order tracking.

## Current status
- Functional and in active use.
- App version in repo: `v1.7.3` (`public/version.json`, releasedAt `2026-03-19`).
- Frontend-only app hosted as static site.

## Architecture
- Frontend: static multi-page app in `public/`.
- UI: HTML + Tailwind Play CDN + custom CSS (`public/css/theme.css`).
- Logic: vanilla JavaScript ES modules, no build step.
- Backend: Supabase (Postgres + Auth + Storage).
- Offline: Service Worker (`public/sw.js`) + runtime/static cache strategy.

## Frontend module layout

### Real modules
- `public/js/app/`
  - auth/session, permissions, shell, app core services.
- `public/js/features/`
  - feature-specific pages and services by domain.
- `public/js/shared/`
  - reusable UI and cross-feature utilities.
- `public/js/vendor/`
  - vendored browser dependencies.

### Legacy compatibility surface
- `public/js/components/*.js`

No legacy compatibility wrappers remain in the current repo state.

## Active import strategy
- HTML entrypoints already import real modules under:
  - `/js/app/**`
  - `/js/features/**`
  - `/js/shared/**`
- Internal JS module imports audited in `public/js/**`:
  - no safe direct replacements were needed;
  - current internal imports already target real modules in the refactored structure.
- Remaining legacy references found in repo:
  - documentation still tracks retired legacy locations for cleanup history.

## Auth and access
- Google OAuth (PKCE) via Supabase Auth.
- Auth guard in protected pages via `requireAuth()` from `public/js/app/auth/auth.js`.
- Login flow:
  - `/pages/login.html`
  - `/pages/auth-callback.html`

## Core business modules
- Catalog: `public/index.html`, `public/js/features/catalog/catalog-service.js`
  - Current source: single query to `public.v_catalog_variants_available` filtered by `warehouse_id` and `point_of_sale_id` from `salesContext`.
  - Phase 1 image optimization: transformed thumbnails from Supabase Storage, explicit image dimensions, async decoding, eager/high priority for the first image and lazy/low priority for the rest.
- Sales context: `public/js/app/core/sales-context-service.js`
  - Current source: single RPC call to `public.get_sales_context_resolved(p_user_id uuid)`.
  - Keeps the same public contract for `getSalesContext()`, `requireSalesContext()`, cache invalidation and unresolved-context errors.
- Product detail/edit/share: `public/pages/producto.html`, `public/js/features/product/product-page.js`
  - Phase 1 image optimization: larger transformed image variant plus stable square layout and async decoding.
- Cart (localStorage): `public/js/features/checkout/cart.js`
- Reserva: `public/pages/checkout.html`, `public/js/features/checkout/checkout-page.js`
- Order creation: `public/js/features/orders/order-service.js`
- Orders list/detail:
  - `public/pages/pedidos.html`
  - `public/pages/pedido-detalle.html`
  - `public/js/features/orders/orders-service.js`
  - `public/js/features/orders/order-detail.js`
- Customers ABM:
  - `public/pages/clientes.html`
  - `public/pages/cliente-form.html`
  - `public/js/features/customers/customers-service.js`
- Products ABM:
  - `public/pages/productos.html`
  - `public/pages/productos-form.html`
  - `public/js/features/product/product-service.js`
- Home dashboard: `public/pages/home.html`
- App shell/navigation: `public/js/app/shell/app-shell.js`

## Legacy wrapper inventory

### Internal Wrappers Already Retired
- retired in the safe wrapper-removal pass:
  - `public/js/order-detail.js`
  - `public/js/orders.js`
  - `public/js/product-form-page.js`
  - `public/js/products-page.js`
  - `public/js/services/auth-service.js`
  - `public/js/services/catalog-service.js`
  - `public/js/services/customers-service.js`
  - `public/js/services/inventory-movement-service.js`
  - `public/js/services/logistics-inventory-service.js`
  - `public/js/services/order-service.js`
  - `public/js/services/orders-service.js`
  - `public/js/services/product-service.js`
  - `public/js/services/sales-context-service.js`
  - `public/js/services/stock-service.js`
  - `public/js/services/storage-service.js`
  - `public/js/utils/argentina-phone.js`
  - `public/js/utils/permissions.js`
  - `public/js/utils/runtime-config.js`
  - `public/js/lib/supabase-client.js`

Reason:
- retired files:
  - not referenced by internal imports;
  - not referenced by HTML entrypoints;
  - not present in the current `public/sw.js` precache list;
  - not considered important historical top-level public entrypoints.

## Compatibility behavior
`public/js/features/orders/order-service.js` includes fallbacks for mixed database states:
- Retries insert without `customer_id` if column does not exist.
- Maps modern statuses to legacy values if check constraints fail.
- Final fallback inserts without status fields to use DB defaults.

`public/js/features/orders/orders-service.js` tolerates missing `order_number` (fallback query).

## Known technical debt / risks
- Supabase config remains exposed in frontend runtime.
- Status vocabulary inconsistency (ES/EN/legacy) can still surface at integration boundaries.
- No automated tests (unit/integration/e2e).
- No CI quality gates.
- RLS documentation is still partial for some operational tables.

## Recent data access changes
- Catalog load optimized to a single Supabase view:
  - frontend now queries `public.v_catalog_variants_available` from `public/js/features/catalog/catalog-service.js`;
  - the view consolidates product variant data, category data and stock availability for the selected warehouse/POS;
  - this removes the previous client-side merge between `product_variants` and `v_inventory_stock_by_variant`.
- Sales context resolution optimized to a single Supabase RPC:
  - frontend now calls `public.get_sales_context_resolved(p_user_id uuid)` from `public/js/app/core/sales-context-service.js`;
  - the RPC replaces previous multi-query frontend resolution over `profiles`, `warehouses` and `points_of_sale`;
  - this removes redundant roundtrips before catalog and order flows consume the resolved warehouse/POS.
- Catalog/detail image delivery optimized incrementally:
  - frontend now builds transformed public URLs for Supabase Storage from `public/js/shared/utils/storage-service.js` and `public/js/shared/utils/image.js`;
  - catalog cards request smaller thumbnails and defer lower-priority images;
  - product detail requests a larger transformed asset while preserving stable layout on mobile cold load.

## SQL assets in repo
- `database/20260319_create_v_catalog_variants_available.sql`
  - creates `public.v_catalog_variants_available` and grants read access for app roles.

## Operational conventions
- Keep `README.md` in repo root.
- Keep strategic/aux docs in `docs/`.
- Keep app version aligned between:
  - `public/sw.js` -> `APP_VERSION`
  - `public/version.json` -> `version`

## Recommended next priorities
1. Validate offline behavior on clean install/update across the main page set after the precache realignment.
2. Add CI checks to detect reintroduction of legacy imports or wrapper files.
3. Add CI checks to detect reintroduction of legacy imports.
4. Add basic test coverage for Reserva/order creation paths.
5. Document and validate full RLS strategy for all key tables.
