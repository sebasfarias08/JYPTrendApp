import { supabase } from "../../app/core/supabase-client.js";

export const INVENTORY_CHANGED_EVENT = "inventory:changed";

export function notifyInventoryChanged(detail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(INVENTORY_CHANGED_EVENT, { detail }));
}

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

export async function getStockByVariant({ warehouseId = null, pointOfSaleId = null } = {}) {
  let query = supabase
    .from("v_inventory_stock_by_variant")
    .select("product_id, variant_id, warehouse_id, point_of_sale_id, stock_qty");

  if (warehouseId) {
    query = query.eq("warehouse_id", warehouseId);
  }
  if (pointOfSaleId) {
    query = query.eq("point_of_sale_id", pointOfSaleId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getStockByVariant error:", error);
    return [];
  }
  return data ?? [];
}
