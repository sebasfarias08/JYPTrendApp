import { supabase } from "../../app/core/supabase-client.js";
import { requireSalesContext } from "../../app/core/sales-context-service.js";

export async function getProducts(options = null) {
  const normalizedOptions = options && typeof options === "object" ? options : {};
  const salesContext = await requireSalesContext({
    userId: normalizedOptions.userId ?? null,
    profile: normalizedOptions.profile ?? null,
    forceReload: normalizedOptions.forceReload === true
  });

  const { data, error } = await supabase
    .from("v_catalog_variants_available")
    .select("*")
    .eq("warehouse_id", salesContext.warehouse_id)
    .eq("point_of_sale_id", salesContext.point_of_sale_id)
    .order("display_name", { ascending: true });

  if (error) {
    console.error("getProducts (catalog) error:", error);
    throw error;
  }

  return (data ?? [])
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
        categories,
        stock_qty: Number.isFinite(stockQty) ? stockQty : 0,
        warehouse_id: warehouseId,
        point_of_sale_id: pointOfSaleId
      };
    })
    .filter((v) => Number(v.stock_qty ?? 0) > 0);
}
