import { supabase } from "../lib/supabase-client.js";

export async function getStockByProduct() {
  const { data, error } = await supabase
    .from("v_inventory_stock_by_product")
    .select("*");

  if (error) {
    console.error("getStockByProduct error:", error);
    return [];
  }
  return data ?? [];
}

export async function getStockByVariant() {
  const { data, error } = await supabase
    .from("v_inventory_stock_by_variant")
    .select("*");

  if (error) {
    console.error("getStockByVariant error:", error);
    return [];
  }
  return data ?? [];
}
