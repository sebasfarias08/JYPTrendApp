import { supabase } from "../lib/supabase-client.js";
import { getStockByVariant } from "./stock-service.js";

export async function getProducts() {
  const [variantsResult, stockRows] = await Promise.all([
    supabase
      .from("product_variants")
      .select(`
        id,
        product_id,
        variant_name,
        sale_price,
        active,
        products!inner (
          id,
          name,
          image_path,
          active,
          categories (
            name,
            slug
          )
        )
      `)
      .eq("active", true)
      .eq("products.active", true)
      .order("variant_name", { ascending: true }),
    getStockByVariant()
  ]);

  const { data, error } = variantsResult;
  if (error) {
    console.error("getProducts (variants) error:", error);
    return [];
  }

  const stockByVariantId = new Map();
  for (const row of stockRows ?? []) {
    const variantId = row?.variant_id ?? null;
    if (!variantId) continue;
    const current = Number(stockByVariantId.get(variantId) ?? 0);
    const qty = Number(row?.stock_qty ?? 0);
    stockByVariantId.set(variantId, current + (Number.isFinite(qty) ? qty : 0));
  }

  const variants = (data ?? []).map((row) => {
    const product = row?.products ?? {};
    const productName = String(product?.name ?? "").trim();
    const variantName = String(row?.variant_name ?? "").trim();
    const stockQty = Number(stockByVariantId.get(row.id) ?? 0);
    const displayName = variantName || productName;

    return {
      id: row.id,
      variant_id: row.id,
      product_id: row.product_id ?? product?.id ?? null,
      name: displayName,
      product_name: productName,
      variant_name: variantName,
      price: Number(row?.sale_price ?? 0),
      image_path: product?.image_path ?? "",
      categories: product?.categories ?? null,
      stock_qty: stockQty
    };
  });

  return variants
    .filter((v) => Number(v.stock_qty ?? 0) > 0)
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "es", { sensitivity: "base" }));
}
