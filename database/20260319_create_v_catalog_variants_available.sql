drop view if exists public.v_catalog_variants_available;

create view public.v_catalog_variants_available as
select
  pv.id as variant_id,
  pv.product_id,
  s.warehouse_id,
  s.point_of_sale_id,
  p.name as product_name,
  pv.variant_name,
  coalesce(nullif(btrim(pv.variant_name), ''), p.name) as display_name,
  pv.image_path,
  pv.sale_price as price,
  pv.currency_code,
  c.id as category_id,
  c.name as category_name,
  c.slug as category_slug,
  c."order" as category_order,
  s.stock_qty,
  pv.active as variant_active,
  p.active as product_active
from
  public.product_variants as pv
  join public.products as p on p.id = pv.product_id
  left join public.categories as c on c.id = p.category_id
  join public.v_inventory_stock_by_variant as s on s.variant_id = pv.id
  and s.product_id = pv.product_id
where pv.active = true
  and p.active = true
  and coalesce(s.stock_qty, 0::numeric) > 0::numeric;

grant select on public.v_catalog_variants_available to anon;
grant select on public.v_catalog_variants_available to authenticated;
grant select on public.v_catalog_variants_available to service_role;
