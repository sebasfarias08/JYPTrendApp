# Project Context - JYPTrendApp

## Purpose
JYPTrendApp is a mobile-first sales web app for daily B2B operations.
Main flow: catalog -> cart -> Reserva -> order tracking.

## Current status
- Functional and in active use.
- App version in repo: `v1.2.2` (`public/version.json`, releasedAt `2026-03-19`).
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
- `public/js/*.js`
- `public/js/components/*.js`

These files are mostly thin `export * from ...` wrappers kept for compatibility with historical import paths.

## Active import strategy
- HTML entrypoints already import real modules under:
  - `/js/app/**`
  - `/js/features/**`
  - `/js/shared/**`
- Internal JS module imports audited in `public/js/**`:
  - no safe direct replacements were needed;
  - current internal imports already target real modules in the refactored structure.
- Remaining legacy references found in repo:
  - compatibility wrappers still exist on disk for historical public URLs;
  - documentation still tracks some legacy locations for cleanup planning.

## Auth and access
- Google OAuth (PKCE) via Supabase Auth.
- Auth guard in protected pages via `requireAuth()` from `public/js/app/auth/auth.js`.
- Login flow:
  - `/pages/login.html`
  - `/pages/auth-callback.html`

## Core business modules
- Catalog: `public/index.html`, `public/js/features/catalog/catalog-service.js`
- Product detail/edit/share: `public/pages/producto.html`, `public/js/features/product/product-page.js`
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

### Maintain Temporarily
- `public/js/app-shell.js`
- `public/js/auth.js`
- `public/js/cart.js`
- `public/js/catalog-service.js`
- `public/js/image.js`
- `public/js/order-ref.js`
- `public/js/order-status.js`
- `public/js/share.js`
- `public/js/status-ui.js`
- `public/js/supabase-client.js`
- `public/js/sw-register.js`
- `public/js/toast.js`

Reason:
- top-level public-looking compatibility paths with broad historical visibility;
- removing them without external telemetry or manual validation would be a higher compatibility risk than the internal wrappers already retired.

### Require External/Manual Validation
- `public/js/checkout-page.js`
- `public/js/client-form-page.js`
- `public/js/clients-page.js`
- `public/js/customers-service.js`
- `public/js/inventory-movement-form-page.js`
- `public/js/inventory-movement-service.js`
- `public/js/inventory-movements-page.js`
- `public/js/logistics-inventories-page.js`
- `public/js/logistics-inventory-form-page.js`
- `public/js/logistics-inventory-service.js`
- `public/js/order-service.js`
- `public/js/orders-service.js`
- `public/js/product-page.js`
- `public/js/product-service.js`

Reason:
- no internal runtime references were found in the current repo state;
- however, these are still top-level public URLs that may have been consumed externally or bookmarked historically.

### Candidate For Future Removal
- `public/js/order-detail.js`
- `public/js/orders.js`
- `public/js/product-form-page.js`
- `public/js/products-page.js`

Reason:
- no internal runtime references were found in the current repo state;
- they are not in the current precache list;
- they appear less foundational than the broader compatibility surface above, so they fit a later selective retirement pass.

### Internal Wrappers Already Retired
- retired in the safe wrapper-removal pass:
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

### Review manually
- `public/js/components/address-autocomplete.js`
- `public/js/components/dropdown.js`

Reason:
- they are wrappers outside the main removal set and still look like plausible historical public UI paths.

## Compatibility behavior
`public/js/features/orders/order-service.js` includes fallbacks for mixed database states:
- Retries insert without `customer_id` if column does not exist.
- Maps modern statuses to legacy values if check constraints fail.
- Final fallback inserts without status fields to use DB defaults.

`public/js/features/orders/orders-service.js` tolerates missing `order_number` (fallback query).

## Known technical debt / risks
- top-level/component compatibility wrappers still exist even though `public/sw.js` now precaches modular real paths.
- Supabase config remains exposed in frontend runtime.
- Status vocabulary inconsistency (ES/EN/legacy) can still surface at integration boundaries.
- No automated tests (unit/integration/e2e).
- No CI quality gates.
- RLS documentation is still partial for some operational tables.

## Operational conventions
- Keep `README.md` in repo root.
- Keep strategic/aux docs in `docs/`.
- Keep app version aligned between:
  - `public/sw.js` -> `APP_VERSION`
  - `public/version.json` -> `version`

## Recommended next priorities
1. Remove wrappers classified as probably unnecessary in a controlled compatibility pass.
2. Validate offline behavior on clean install/update across the main page set after the precache realignment.
3. Add CI checks to detect reintroduction of legacy imports.
4. Add basic test coverage for Reserva/order creation paths.
5. Document and validate full RLS strategy for all key tables.
