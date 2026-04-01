import { supabase } from "../../app/core/supabase-client.js";
import { requireSalesContext } from "../../app/core/sales-context-service.js";

export async function getProducts(options = null) {
  const normalizedOptions = options && typeof options === "object" ? options : {};
  const page = Number.isInteger(normalizedOptions.page) && normalizedOptions.page >= 0 ? normalizedOptions.page : 0;
  const pageSize = Number.isInteger(normalizedOptions.pageSize) && normalizedOptions.pageSize > 0 ? normalizedOptions.pageSize : 50;
  const search = typeof normalizedOptions.search === "string" && normalizedOptions.search.trim() ? normalizedOptions.search.trim() : null;
  const categorySlug = typeof normalizedOptions.categorySlug === "string" && normalizedOptions.categorySlug.trim() ? normalizedOptions.categorySlug.trim() : null;

  const salesContext = await requireSalesContext({
    userId: normalizedOptions.userId ?? null,
    profile: normalizedOptions.profile ?? null,
    forceReload: normalizedOptions.forceReload === true
  });

  const offset = page * pageSize;
  const rangeEnd = offset + pageSize - 1;

  let query = supabase
    .from("v_catalog_variants_available")
    .select("*", { count: "exact", head: false })
    .eq("warehouse_id", salesContext.warehouse_id)
    .eq("point_of_sale_id", salesContext.point_of_sale_id);

  if (categorySlug) {
    query = query.eq("category_slug", categorySlug);
  }

  if (search) {
    query = query.ilike("display_name", `%${search}%`);
  }

  const { data, error, count } = await query
    .order("display_name", { ascending: true })
    .range(offset, rangeEnd);

  if (error) {
    console.error("getProducts (catalog) error:", error);
    throw error;
  }

  const variantIds = (data ?? [])
    .map((row) => row?.variant_id ?? row?.id ?? null)
    .filter(Boolean);

  let thumbnailsByVariantId = new Map();
  if (variantIds.length) {
    const { data: variantImages, error: variantImagesError } = await supabase
      .from("product_variant_images")
      .select("variant_id, image_path, image_type, is_primary, sort_order")
      .in("variant_id", variantIds)
      .eq("image_type", "thumbnail");

    if (variantImagesError) {
      console.error("getProducts (catalog thumbnails) error:", variantImagesError);
    } else {
      thumbnailsByVariantId = variantImages
        .sort((a, b) => {
          if (a.is_primary !== b.is_primary) {
            return a.is_primary ? -1 : 1;
          }
          return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
        })
        .reduce((map, img) => {
          const key = String(img.variant_id);
          if (!map.has(key)) {
            map.set(key, img.image_path ?? "");
          }
          return map;
        }, new Map());
    }
  }

  const processedItems = (data ?? [])
    .map((row) => {
      const productName = String(row?.product_name ?? "").trim();
      const variantId = row?.variant_id ?? row?.id ?? null;
      const categories = row?.categories && typeof row.categories === "object"
        ? {
            name: row.categories?.name ?? null,
            slug: row.categories?.slug ?? null
          }
        : row?.category_name || row?.category_slug
          ? {
              name: row?.category_name ?? null,
              slug: row?.category_slug ?? null
            }
          : null;
      const stockQty = Number(row?.stock_qty ?? 0);
      const displayName = String(row?.display_name ?? "").trim() || productName;
      const warehouseId = row?.warehouse_id ?? salesContext.warehouse_id;
      const pointOfSaleId = row?.point_of_sale_id ?? salesContext.point_of_sale_id;

      return {
        id: row?.id ?? variantId,
        variant_id: variantId,
        product_id: row?.product_id ?? null,
        name: displayName,
        product_name: productName,
        variant_name: String(row?.variant_name ?? "").trim(),
        price: Number(row?.price ?? 0),
        image_path: row?.image_path ?? "",
        thumbnail_path: thumbnailsByVariantId.get(String(variantId)) ?? row?.image_path ?? "",
        categories,
        stock_qty: Number.isFinite(stockQty) ? stockQty : 0,
        warehouse_id: warehouseId,
        point_of_sale_id: pointOfSaleId
      };
    })
    .filter((v) => Number(v.stock_qty ?? 0) > 0);

  const total = Number.isFinite(count) ? count : (processedItems.length || 0);
  const hasMore = offset + processedItems.length < total;

  return {
    items: processedItems,
    total,
    page,
    pageSize,
    hasMore
  };
}
