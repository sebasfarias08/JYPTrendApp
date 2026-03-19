drop view if exists public.v_catalog_variants_available;

create view public.v_catalog_variants_available as
select
  pv.id,
  pv.id as variant_id,
  pv.product_id,
  stock.warehouse_id,
  stock.point_of_sale_id,
  coalesce(nullif(btrim(pv.variant_name), ''), nullif(btrim(p.name), ''), '') as display_name,
  coalesce(p.name, '') as product_name,
  coalesce(pv.variant_name, '') as variant_name,
  pv.sale_price as price,
  pv.currency_code,
  coalesce(pv.image_path, '') as image_path,
  p.category_id,
  c.name as category_name,
  c.slug as category_slug,
  c."order" as category_order,
  case
    when c.id is null then null
    else jsonb_build_object(
      'name', c.name,
      'slug', c.slug
    )
  end as categories,
  coalesce(stock.stock_qty, 0) as stock_qty,
  pv.active as variant_active,
  p.active as product_active
from public.product_variants as pv
join public.products as p
  on p.id = pv.product_id
left join public.categories as c
  on c.id = p.category_id
  and c.active = true
join public.v_inventory_stock_by_variant as stock
  on stock.variant_id = pv.id
where pv.active = true
  and p.active = true;

grant select on public.v_catalog_variants_available to anon;
grant select on public.v_catalog_variants_available to authenticated;
grant select on public.v_catalog_variants_available to service_role;
