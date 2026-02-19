// public/js/order-service.js
import { supabase } from "./supabase-client.js";

function isConstraintError(err, constraintName) {
  return err?.code === "23514" && String(err?.message ?? "").includes(constraintName);
}

function toLegacyStatus(value) {
  const map = {
    NEW: "submitted",
    PREPARING: "preparing",
    READY: "ready",
    DELIVERED: "delivered",
    FINISHED: "finished",
    CANCELLED: "cancelled",
    PENDING: "pending",
    PARTIAL: "partial",
    PAID: "paid",
    NUEVO: "submitted",
    EN_PREPARACION: "preparing",
    LISTO_PARA_RETIRO: "ready",
    ENTREGADO: "delivered",
    FINALIZADO: "finished",
    CANCELADO: "cancelled",
    PENDIENTE: "pending",
    PARCIAL: "partial",
    PAGADO: "paid"
  };
  return map[value] ?? value;
}

async function insertOrder(payload) {
  return supabase
    .from("orders")
    .insert(payload)
    .select("id")
    .single();
}

export async function createOrderWithItems(order, cartItems) {
  // 1) Insert order (with compatibility fallback for different DB checks)
  let { data: orderRow, error: orderErr } = await insertOrder(order);

  if (orderErr && isConstraintError(orderErr, "orders_order_status_check")) {
    const legacyOrder = {
      ...order,
      order_status: toLegacyStatus(order.order_status),
      payment_status: toLegacyStatus(order.payment_status)
    };
    ({ data: orderRow, error: orderErr } = await insertOrder(legacyOrder));
  }

  if (
    orderErr &&
    (
      isConstraintError(orderErr, "orders_order_status_check") ||
      isConstraintError(orderErr, "orders_payment_status_check")
    )
  ) {
    // Last fallback: let DB defaults decide status columns
    const { order_status, payment_status, ...withoutStatuses } = order;
    ({ data: orderRow, error: orderErr } = await insertOrder(withoutStatuses));
  }

  if (orderErr) {
    console.error("Insert order error:", orderErr);
    return { ok: false };
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
