import { supabase } from "../lib/supabase-client.js";

export async function createOrderWithItems(order, cartItems) {
  // 1) Insert order with canonical schema/status values.
  const { data: orderRow, error: orderErr } = await supabase
    .from("orders")
    .insert(order)
    .select("id")
    .single();

  if (orderErr) {
    console.error("Insert order error:", orderErr);
    return { ok: false, error: orderErr };
  }

  const order_id = orderRow.id;

  // Best-effort: ensure customer fields stay persisted even if DB defaults/triggers override on insert.
  const customerPatch = {
    customer_name: order.customer_name ?? null,
    customer_phone: order.customer_phone ?? null,
    notes: order.notes ?? null
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
