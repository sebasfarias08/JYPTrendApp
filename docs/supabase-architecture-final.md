# Supabase Architecture Reference (Actualizado)

Proyecto: **JYPTrendApp**  
Backend: **Supabase (PostgreSQL + Auth + Storage)**  
Fuente de esta actualizacion: todos los archivos dentro de `docs/`, incluyendo `docs/supabase_dump/*.csv`.

## 1. Resumen ejecutivo

- Esquema principal de negocio: `public`.
- Alcance actual en `public`: **16 tablas**, **6 views**, **1 materialized view**.
- RLS: habilitado en las 16 tablas de `public`.
- Storage: bucket publico `catalog` con **676 objetos** (snapshot del dump).
- El modelo usa triggers para recalcular subtotales/totales y sincronizar inventario desde `order_items`.

## 2. Esquemas disponibles

Segun el dump, existen al menos estos esquemas relevantes:

```txt
public
auth
extensions
graphql
graphql_public
information_schema
pg_catalog
pg_toast
pg_temp_* / pg_toast_temp_*
```

Nota: `pg_temp_*` y `pg_toast_temp_*` son temporales/sistema.

## 3. Inventario de objetos en `public`

### 3.1 Tablas (16)

```txt
cash_movements
categories
customers
inventory_movements
order_items
orders
payment_allocations
payments
points_of_sale
product_variants
products
profiles
purchase_order_items
purchase_orders
suppliers
warehouses
```

### 3.2 Views (6)

```txt
v_inventory_stock_by_product
v_inventory_stock_by_variant
v_order_payment_summary
v_order_summary
v_sales_by_day
v_sales_by_product
```

### 3.3 Materialized view (1)

```txt
mv_sales_by_product
```

## 4. Modelo relacional (FK reales)

Relaciones principales observadas en el dump:

- `products.category_id -> categories.id`
- `product_variants.product_id -> products.id`
- `product_variants.user_id -> auth.users.id`
- `customers.user_id -> auth.users.id`
- `orders.user_id -> auth.users.id`
- `orders.customer_id -> customers.id`
- `orders.point_of_sale_id -> points_of_sale.id`
- `orders.warehouse_id -> warehouses.id`
- `order_items.order_id -> orders.id`
- `order_items.product_id -> products.id`
- `order_items.variant_id -> product_variants.id`
- `payments.order_id -> orders.id`
- `payments.customer_id -> customers.id`
- `payments.user_id -> auth.users.id`
- `payment_allocations.payment_id -> payments.id`
- `payment_allocations.order_id -> orders.id`
- `payment_allocations.user_id -> auth.users.id`
- `inventory_movements.product_id -> products.id`
- `inventory_movements.variant_id -> product_variants.id`
- `inventory_movements.warehouse_id -> warehouses.id`
- `inventory_movements.point_of_sale_id -> points_of_sale.id`
- `inventory_movements.user_id -> auth.users.id`
- `cash_movements.point_of_sale_id -> points_of_sale.id`
- `cash_movements.order_id -> orders.id`
- `cash_movements.payment_id -> payments.id`
- `cash_movements.user_id -> auth.users.id`
- `purchase_orders.supplier_id -> suppliers.id`
- `purchase_orders.point_of_sale_id -> points_of_sale.id`
- `purchase_orders.user_id -> auth.users.id`
- `purchase_order_items.purchase_order_id -> purchase_orders.id`
- `purchase_order_items.product_id -> products.id`
- `purchase_order_items.variant_id -> product_variants.id`
- `suppliers.user_id -> auth.users.id`
- `points_of_sale.user_id -> auth.users.id`
- `warehouses.user_id -> auth.users.id`
- `profiles.id -> auth.users.id`

## 5. Entidades y campos clave

### Catalogo
- `categories`: `id`, `name`, `slug`, `order`, `active`, timestamps.
- `products`: `id`, `name`, `description`, `price`, `category_id`, `image_path`, `active`, timestamps.
- `product_variants`: SKU/barcode, opciones, `cost_price`, `sale_price`, `currency_code`, `active`, `product_id`, `user_id`.

### Ventas
- `customers`: incluye `address` (ademas de nombre, contacto, notas, `is_active`, `user_id`).
- `orders`: cabecera comercial + snapshots cliente + montos (`subtotal`, `discount_amount`, `shipping_amount`, `tax_amount`, `grand_total`, `total`) + logistica (`warehouse_id`, `point_of_sale_id`).
- `order_items`: lineas con snapshots (`product_name_snapshot`, `variant_name_snapshot`, `sku_snapshot`) y montos por linea.
- `payments`: pagos (`order_id` requerido, `customer_id` opcional).
- `payment_allocations`: asignacion de pago a orden con unique `(payment_id, order_id)`.

### Operacion / inventario / compras
- `inventory_movements`: fuente de verdad de stock (por `product_id`, opcional `variant_id`, `warehouse_id`, `point_of_sale_id`).
- `cash_movements`: movimientos de caja por punto de venta.
- `suppliers`, `purchase_orders`, `purchase_order_items`.
- `warehouses`, `points_of_sale`.

### Seguridad/roles
- `profiles`: `id`, `email`, `full_name`, `role`, `is_active`, timestamps.

## 6. Vistas para reporting

- `v_inventory_stock_by_product`: stock agregado por producto.
- `v_inventory_stock_by_variant`: stock agregado por variante.
- `v_order_summary`: resumen operativo de ordenes.
- `v_order_payment_summary`: total orden vs monto asignado/pendiente.
- `v_sales_by_day`: ventas agregadas por dia.
- `v_sales_by_product`: ventas agregadas por producto/variante.
- `mv_sales_by_product`: version materializada para consultas repetitivas.

Refresh:

```sql
select public.refresh_mv_sales_by_product();
```

## 7. Triggers y funciones activas

### Triggers relevantes
- Timestamps (`set_updated_at`) en casi todas las tablas.
- `order_items`:
  - `trg_order_items_set_subtotal` -> `order_items_set_subtotal()`
  - `trg_order_items_recalc_order` -> `set_order_totals()`
  - `trg_order_items_sync_inventory` -> `sync_inventory_from_order_item()`
- `purchase_order_items`:
  - `trg_purchase_order_items_set_subtotal` -> `purchase_order_items_set_subtotal()`
  - `trg_purchase_order_items_recalc_po` -> `set_purchase_order_totals()`
- `customers` usa trigger especifico `set_customers_updated_at()`.

### Funciones en `public`

```txt
current_app_role
get_user_role
handle_new_user_profile
order_items_set_subtotal
purchase_order_items_set_subtotal
refresh_mv_sales_by_product
rls_auto_enable
set_customers_updated_at
set_order_totals
set_purchase_order_totals
set_updated_at
sync_inventory_from_order_item
```

## 8. RLS y politicas (estado real)

- RLS esta habilitado en las 16 tablas de `public`.
- `rls_forced = false` en todas (segun dump).

### Patron por tabla

- `categories`: lectura publica de activas (`anon/auth`), escritura solo admin.
- `products`: lectura publica de activas + lectura autenticada adicional; escritura solo admin.
- `product_variants`: lectura publica de activas; escritura solo admin.
- `profiles`: `SELECT/INSERT/UPDATE` solo sobre propio `id = auth.uid()`.
- `orders`, `order_items`, `customers`: politicas basadas en `current_app_role()` (admin/seller/viewer segun comando), no estrictamente owner-scoped por `user_id`.
- `payments`, `inventory_movements`, `cash_movements`, `points_of_sale`, `purchase_orders`, `suppliers`: owner-scoped por `auth.uid() = user_id`.
- `payment_allocations`, `warehouses`: owner o admin en `SELECT/INSERT/UPDATE`; `DELETE` solo admin.
- `purchase_order_items`: acceso condicionado por pertenencia del `purchase_order` al usuario (`EXISTS ... purchase_orders.user_id = auth.uid()`).

Importante: esta matriz corrige documentacion vieja que asumia owner-scope estricto para todas las entidades comerciales.

## 9. Constraints e indices destacados

- PK UUID en todas las tablas.
- Unique de negocio:
  - `payment_allocations_unique_payment_order` en `(payment_id, order_id)`.
  - `orders_order_number_uidx` / `orders_order_number_unique_idx` sobre `order_number`.
  - unicidad por usuario en `points_of_sale` (`name`, `code`) y `warehouses` (`name`, `code`).
  - `product_variants` unique por `sku`, `barcode`, y `(product_id, variant_name)`.
  - `customers_full_name_phone_uidx` (normalizado + filtrado `is_active = true`).

## 10. Storage

- Bucket: `catalog` (publico).
- Estructura observada: `products/<archivo>`.
- Objetos registrados en dump: **676**.
- Campo de enlace en BD: `products.image_path`.

## 11. Estados y normalizacion (nota de consistencia)

En `orders`, los defaults actuales son:

- `status = 'draft'`
- `order_status = 'Reservado'`
- `payment_status = 'Pendiente'`

En `payments`, default:

- `payment_status = 'PENDIENTE'`

Esto confirma coexistencia de vocabularios (capitalizacion/idioma), consistente con la deuda tecnica mencionada en `docs/README.md` y `docs/project-context.md`.  
Si se estandariza, debe hacerse con migracion SQL + actualizacion de frontend + revision de policies/reportes.

## 12. Reglas operativas para desarrollo (actualizadas)

- No inventar tablas, columnas ni relaciones fuera de este documento.
- Stock: usar `inventory_movements` y/o views de stock.
- Totales/subtotales: respetar triggers DB (`set_order_totals`, `order_items_set_subtotal`, etc.).
- Si se muta `order_items`, considerar efecto automatico en inventario (`sync_inventory_from_order_item`).
- Autorizacion: usar politicas reales y `profiles.role`; no asumir que todo es owner-scoped.
- Imagenes: usar bucket `catalog` y persistir path en `products.image_path`.
