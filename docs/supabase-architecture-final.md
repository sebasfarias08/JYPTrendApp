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

```txt
trg_cash_movements_set_updated_at
trg_categories_set_updated_at
trg_customers_normalize_phone
trg_customers_set_updated_at
trg_inventory_movements_set_updated_at
trg_order_items_recalc_order
trg_order_items_set_subtotal
trg_order_items_set_updated_at
trg_order_items_sync_inventory
trg_order_items_validate_stock
trg_orders_set_updated_at
trg_orders_sync_inventory_active_flag
trg_payment_allocations_set_updated_at
trg_payments_set_updated_at
trg_points_of_sale_set_updated_at
trg_product_variants_set_updated_at
trg_products_set_updated_at
trg_profiles_set_updated_at
trg_purchase_order_items_recalc_po
trg_purchase_order_items_set_subtotal
trg_purchase_order_items_set_updated_at
trg_purchase_orders_set_updated_at
trg_suppliers_set_updated_at
trg_warehouses_set_updated_at
````

### Propósito de los triggers

#### Gestión de timestamps

Aplicado en múltiples tablas para mantener el campo `updated_at`.

Triggers asociados:

```txt
trg_cash_movements_set_updated_at
trg_categories_set_updated_at
trg_customers_set_updated_at
trg_inventory_movements_set_updated_at
trg_order_items_set_updated_at
trg_orders_set_updated_at
trg_payment_allocations_set_updated_at
trg_payments_set_updated_at
trg_points_of_sale_set_updated_at
trg_product_variants_set_updated_at
trg_products_set_updated_at
trg_profiles_set_updated_at
trg_purchase_order_items_set_updated_at
trg_purchase_orders_set_updated_at
trg_suppliers_set_updated_at
trg_warehouses_set_updated_at
```

Todos ejecutan:

```txt
set_updated_at()
```

---

#### Lógica de órdenes de venta

En `order_items`:

```txt
trg_order_items_set_subtotal
→ order_items_set_subtotal()
```

Calcula automáticamente el subtotal de la línea.

```txt
trg_order_items_recalc_order
→ set_order_totals()
```

Recalcula los totales de la orden cuando cambian los items.

```txt
trg_order_items_sync_inventory
→ sync_inventory_from_order_item()
```

Sincroniza inventario cuando se modifica una línea de orden.

```txt
trg_order_items_validate_stock
→ validate_order_item_stock()
```

Valida disponibilidad de stock antes de insertar o actualizar.

---

#### Sincronización de inventario desde órdenes

En `orders`:

```txt
trg_orders_sync_inventory_active_flag
→ sync_inventory_from_order_active_flag()
```

Actualiza inventario cuando cambia el estado activo de la orden.

---

#### Lógica de órdenes de compra

En `purchase_order_items`:

```txt
trg_purchase_order_items_set_subtotal
→ purchase_order_items_set_subtotal()
```

Calcula el subtotal de la línea de compra.

```txt
trg_purchase_order_items_recalc_po
→ set_purchase_order_totals()
```

Recalcula los totales de la orden de compra.

---

#### Normalización de datos de clientes

En `customers`:

```txt
trg_customers_normalize_phone
→ normalize_phone_ar()
```

Normaliza teléfonos argentinos antes de guardar.

```txt
trg_customers_set_updated_at
→ set_customers_updated_at()
```

Gestiona el timestamp de actualización específico de la tabla.

---

### Funciones en `public`

```txt
current_app_role
get_user_role
handle_new_user_profile
normalize_phone_ar
order_items_set_subtotal
purchase_order_items_set_subtotal
refresh_mv_sales_by_product
rls_auto_enable
set_customers_updated_at
set_order_totals
set_purchase_order_totals
set_updated_at
sync_inventory_from_order_active_flag
sync_inventory_from_order_item
validate_order_item_stock
```

#### Clasificación funcional

**Gestión de roles**

```txt
current_app_role
get_user_role
handle_new_user_profile
```

Utilizadas por las políticas RLS y creación automática de perfiles.

---

**Cálculo de montos**

```txt
order_items_set_subtotal
set_order_totals
purchase_order_items_set_subtotal
set_purchase_order_totals
```

Gestionan cálculos automáticos de subtotales y totales.

---

**Inventario**

```txt
sync_inventory_from_order_item
sync_inventory_from_order_active_flag
validate_order_item_stock
```

Mantienen sincronizado el inventario y evitan ventas sin stock.

---

**Utilidades**

```txt
set_updated_at
set_customers_updated_at
normalize_phone_ar
refresh_mv_sales_by_product
rls_auto_enable
```


## 8. RLS y politicas (estado real)

- RLS esta habilitado en las 16 tablas de `public`.
- `rls_forced = false` en todas (segun dump).

### Patron por tabla

- `categories`: lectura publica de activas (`anon/auth`), escritura solo admin.
- `products`: lectura publica de activas (`anon/auth`) + lectura adicional para `authenticated`; escritura solo admin.
- `product_variants`: lectura publica de activas (`anon/auth`), escritura solo admin.
- `profiles`: `SELECT/INSERT/UPDATE` solo sobre propio `id = auth.uid()`.
- `orders`, `order_items`, `customers`: politicas basadas en `current_app_role()`; `SELECT` para `admin/seller/viewer` y `INSERT/UPDATE/DELETE` para `admin/seller`.
- `payments`, `inventory_movements`, `cash_movements`, `purchase_orders`, `suppliers`: owner-scoped por `auth.uid() = user_id`.
- `payment_allocations`: `SELECT/INSERT/UPDATE` para owner o admin; `DELETE` solo admin.
- `purchase_order_items`: acceso condicionado por pertenencia del `purchase_order` al usuario (`EXISTS ... purchase_orders.user_id = auth.uid()`).
- `points_of_sale`: politicas basadas en rol; `SELECT` para `admin/seller/viewer` y `INSERT/UPDATE/DELETE` solo admin.
- `warehouses`: politicas basadas en rol; `SELECT` para `admin/seller/viewer` y `INSERT/UPDATE/DELETE` solo admin.

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

Esto evidencia coexistencia de vocabularios distintos en la base de datos:

- mezcla de español e inglés
- diferencia de capitalización (`Pendiente` vs `PENDIENTE`)

Si se decide estandarizar estos valores, se deberá realizar:

- migración SQL para normalizar valores existentes
- actualización del frontend que consume estos estados
- revisión de views, funciones y políticas RLS que dependan de estos campos
- verificación de reportes y consultas analíticas

## 12. Reglas operativas para desarrollo (actualizadas)

- No inventar tablas, columnas ni relaciones fuera de este documento.
- Stock: usar `inventory_movements` y/o views de stock (`v_inventory_stock_by_product`, `v_inventory_stock_by_variant`).
- Totales/subtotales: respetar triggers de base de datos (`set_order_totals`, `order_items_set_subtotal`, `purchase_order_items_set_subtotal`, etc.).
- Si se muta `order_items`, considerar efecto automático en inventario (`sync_inventory_from_order_item`).
- Cambios en el estado activo de `orders` pueden impactar inventario (`sync_inventory_from_order_active_flag`).
- Autorización: usar políticas RLS reales y `profiles.role`; no asumir que todas las entidades son owner-scoped por `user_id`.
- Imágenes: usar bucket `catalog` y persistir el path en `products.image_path`.