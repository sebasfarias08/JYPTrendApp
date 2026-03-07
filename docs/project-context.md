# Project Context - JYPTrendApp

## Purpose
JYPTrendApp is a mobile-first sales web app for daily B2B operations.
Main flow: catalog -> cart -> checkout -> order tracking.

## Current status
- Functional and in active use.
- App version in repo: `v1.0.39` (`public/version.json`, releasedAt `2026-02-23`).
- Frontend-only app hosted as static site.

## Architecture
- Frontend: static multi-page app in `public/`.
- UI: HTML + Tailwind Play CDN + custom CSS (`public/css/theme.css`).
- Logic: vanilla JavaScript ES modules (`public/js/*.js`), no build step.
- Backend: Supabase (Postgres + Auth + Storage).
- Offline: Service Worker (`public/sw.js`) + runtime/static cache strategy.

## Auth and access
- Google OAuth (PKCE) via Supabase Auth.
- Auth guard in protected pages via `requireAuth()` from `public/js/auth.js`.
- Login flow:
  - `/pages/login.html`
  - `/pages/auth-callback.html`

## Core business modules
- Catalog: `public/index.html`, `public/js/catalog-service.js`
- Product detail/edit/share: `public/pages/producto.html`, `public/js/product-page.js`
- Cart (localStorage): `public/js/cart.js`
- Checkout: `public/pages/checkout.html`, `public/js/checkout-page.js`
- Order creation: `public/js/order-service.js`
- Orders list/detail: `public/pages/pedidos.html`, `public/pages/pedido-detalle.html`, `public/js/orders-service.js`
- Customers ABM: `public/pages/clientes.html`, `public/pages/cliente-form.html`, `public/js/customers-service.js`
- Products ABM: `public/pages/productos.html`, `public/pages/producto-form.html`, `public/js/product-service.js`
- Home dashboard: `public/pages/home.html`
- App shell/navigation: `public/js/app-shell.js`

## Data model (used by frontend)
- `products`: id, name, description, price, image_path, active, category_id, created_at
- `categories`: id, name, slug
- `orders`: id, order_number, user_id, customer_id, order_status, payment_status, customer_name, customer_phone, notes, total, created_at
- `order_items`: order_id, product_id, qty, unit_price, subtotal
- `customers`: id, user_id, full_name, phone, email, notes, is_active, created_at, updated_at

## SQL migrations in repo
- `database/2026-02-19_add_order_number.sql`
  - Adds `orders.order_number` sequence + unique index + backfill.
- `database/2026-02-20_customers_abm.sql`
  - Creates `customers` table, constraints, trigger, RLS policies.
  - Adds `orders.customer_id` foreign key.
  - Migrates customers from existing orders.

## Compatibility behavior
`public/js/order-service.js` includes fallbacks for mixed database states:
- Retries insert without `customer_id` if column does not exist.
- Maps modern statuses to legacy values if check constraints fail.
- Final fallback inserts without status fields to use DB defaults.

`public/js/orders-service.js` tolerates missing `order_number` (fallback query).

## Known technical debt / risks
- Supabase config hardcoded in frontend:
  - `public/js/supabase-client.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)
  - `public/js/image.js` (`SUPABASE_PROJECT_ID`)
- Status vocabulary inconsistency (ES/EN/legacy) across DB/UI.
- No automated tests (unit/integration/e2e).
- No CI quality gates.
- RLS documentation exists for `customers`, but not fully documented in repo for all operational tables.

## Operational conventions
- Keep `README.md` in repo root.
- Keep strategic/aux docs in `docs/`.
- Keep app version aligned between:
  - `public/sw.js` -> `APP_VERSION`
  - `public/version.json` -> `version`

## Recommended next priorities
1. Move runtime config out of hardcoded JS values.
2. Standardize order/payment status enums in DB and UI.
3. Document and validate full RLS strategy for all key tables.
4. Add basic test coverage for checkout/order creation paths.
5. Add CI checks (lint, smoke tests, deploy validation).

## Where to start reading code
1. `public/index.html`
2. `public/js/app-shell.js`
3. `public/js/auth.js`
4. `public/js/checkout-page.js`
5. `public/js/order-service.js`
6. `public/js/orders-service.js`
7. `database/*.sql`
