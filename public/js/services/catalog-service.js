import { supabase } from "../lib/supabase-client.js";
import { getStockByProduct } from "./stock-service.js";

export async function getProducts() {
  const [productsResult, stockRows] = await Promise.all([
    supabase
      .from("products")
      .select(`
        id,
        name,
        price,
        image_path,
        categories (
          name,
          slug
        )
      `)
      .eq("active", true)
      .order("created_at", { ascending: false }),
    getStockByProduct()
  ]);

  const { data, error } = productsResult;
  if (error) {
    console.error("getProducts error:", error);
    return [];
  }

  const stockByProductId = new Map();
  for (const row of stockRows ?? []) {
    const productId = row?.product_id ?? null;
    if (!productId) continue;
    const current = Number(stockByProductId.get(productId) ?? 0);
    const qty = Number(row?.stock_qty ?? 0);
    stockByProductId.set(productId, current + (Number.isFinite(qty) ? qty : 0));
  }

  return (data ?? []).map((p) => ({
    ...p,
    stock_qty: Number(stockByProductId.get(p.id) ?? 0)
  }));
}
