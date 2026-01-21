// public/js/order-service.js
import { supabase } from "./supabase-client.js";

export async function createOrderWithItems(order, cartItems) {
  // 1) Insert order
  const { data: orderRow, error: orderErr } = await supabase
    .from("orders")
    .insert(order)
    .select("id")
    .single();

  if (orderErr) {
    console.error("Insert order error:", orderErr);
    return { ok: false };
  }

  const order_id = orderRow.id;

  // 2) Insert items
  const items = cartItems.map(it => ({
    order_id,
    product_id: it.product_id,
    qty: Number(it.qty || 1),
    unit_price: Number(it.price || 0),
    subtotal: Number(it.price || 0) * Number(it.qty || 1)
  }));

  const { error: itemsErr } = await supabase
    .from("order_items")
    .insert(items);

  if (itemsErr) {
    console.error("Insert items error:", itemsErr);
    // rollback best-effort
    await supabase.from("orders").delete().eq("id", order_id);
    return { ok: false };
  }

  return { ok: true, order_id };
}