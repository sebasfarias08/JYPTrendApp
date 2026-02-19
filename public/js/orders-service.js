// public/js/orders-service.js
import { supabase } from "./supabase-client.js";

export async function getMyOrders({ limit = 50 } = {}) {
  const { data, error } = await supabase
    .from("orders")
    .select("id, created_at, order_status, payment_status, total, customer_name")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getMyOrders error:", error);
    return [];
  }
  return data ?? [];
}

export async function getOrderDetail(orderId) {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      created_at,
      order_status,
      payment_status,
      total,
      customer_name,
      customer_phone,
      notes,
      order_items (
        qty,
        unit_price,
        subtotal,
        products (
          id,
          name,
          image_path
        )
      )
    `)
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    console.error("getOrderDetail error:", error);
    return null;
  }
  return data ?? null;
}

export async function updateOrderStatus(orderId, order_status) {
  const { data, error } = await supabase
    .from("orders")
    .update({ order_status })
    .eq("id", orderId);
  if (error) throw error;
  return data;
}

export async function updatePaymentStatus(orderId, payment_status) {
  const { data, error } = await supabase
    .from("orders")
    .update({ payment_status })
    .eq("id", orderId);
  if (error) throw error;
  return data;
}
