import { supabase } from "../lib/supabase-client.js";

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

export async function createOrderWithItems(order, cartItems) {
  const userId = order?.user_id ?? null;
  const [warehouseId, pointOfSaleId] = await Promise.all([
    order?.warehouse_id ? Promise.resolve(order.warehouse_id) : getActiveWarehouseId(userId),
    order?.point_of_sale_id ? Promise.resolve(order.point_of_sale_id) : getActivePointOfSaleId(userId)
  ]);

  if (!warehouseId || !pointOfSaleId) {
    return {
      ok: false,
      error: new Error("Missing warehouse_id or point_of_sale_id for order creation.")
    };
  }

  const invalidItem = (cartItems ?? []).find((it) => !it?.product_id);
  if (invalidItem) {
    return {
      ok: false,
      error: new Error("Missing product_id in one or more order items.")
    };
  }

  const orderPayload = {
    ...order,
    warehouse_id: warehouseId,
    point_of_sale_id: pointOfSaleId
  };

  // 1) Insert order with canonical schema/status values.
  const { data: orderRow, error: orderErr } = await supabase
    .from("orders")
    .insert(orderPayload)
    .select("id")
    .single();

  if (orderErr) {
    console.error("Insert order error:", orderErr);
    return { ok: false, error: orderErr };
  }

  const order_id = orderRow.id;

  // Best-effort: ensure customer fields stay persisted even if DB defaults/triggers override on insert.
  const customerPatch = {
    customer_name: orderPayload.customer_name ?? null,
    customer_phone: orderPayload.customer_phone ?? null,
    notes: orderPayload.notes ?? null
  };
  const { error: patchErr } = await supabase
    .from("orders")
    .update(customerPatch)
    .eq("id", order_id);
  if (patchErr) {
    console.warn("Customer patch warning:", patchErr);
  }

  // 2) Insert items. DB trigger calculates subtotals/totals.
  const items = cartItems.map((it) => ({
    order_id,
    product_id: it.product_id,
    variant_id: it.variant_id || null,
    qty: Number(it.qty || 1),
    unit_price: Number(it.price || 0)
  }));

  const { error: itemsErr } = await supabase
    .from("order_items")
    .insert(items);

  if (itemsErr) {
    console.error("Insert items error:", itemsErr);
    // rollback best-effort
    await supabase.from("orders").delete().eq("id", order_id);
    return { ok: false, error: itemsErr };
  }

  let order_number = null;
  const { data: numRow, error: numErr } = await supabase
    .from("orders")
    .select("order_number")
    .eq("id", order_id)
    .maybeSingle();

  if (!numErr) {
    order_number = numRow?.order_number ?? null;
  }

  return { ok: true, order_id, order_number };
}
