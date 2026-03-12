import { supabase } from "../lib/supabase-client.js";

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("getCurrentUserId error:", error);
    return null;
  }

  return data?.user?.id ?? null;
}

async function getActiveWarehouseId(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("warehouses")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getActiveWarehouseId error:", error);
    return null;
  }

  return data?.id ?? null;
}

async function getActivePointOfSaleId(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("points_of_sale")
    .select("id")
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getActivePointOfSaleId error:", error);
    return null;
  }

  return data?.id ?? null;
}

export async function getSalesContext(userId = null) {
  const resolvedUserId = userId || await getCurrentUserId();
  if (!resolvedUserId) {
    return {
      user_id: null,
      warehouse_id: null,
      point_of_sale_id: null
    };
  }

  const [warehouse_id, point_of_sale_id] = await Promise.all([
    getActiveWarehouseId(resolvedUserId),
    getActivePointOfSaleId(resolvedUserId)
  ]);

  return {
    user_id: resolvedUserId,
    warehouse_id,
    point_of_sale_id
  };
}
