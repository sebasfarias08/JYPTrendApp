import { supabase } from "../lib/supabase-client.js";
import { fetchUser } from "./auth-service.js";

export async function getMyOrders({ limit = 50 } = {}) {
  const { data, error } = await supabase
    .from("v_order_summary")
    .select("id, order_number, created_at, order_status, payment_status, total, customer_name")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getMyOrders error:", error);
    return [];
  }
  return data ?? [];
}

export async function getMyOpenOrders({ limit = 80 } = {}) {
  const { data: userData, error: userErr } = await fetchUser();
  if (userErr) {
    console.error("getMyOpenOrders fetchUser error:", userErr);
    return [];
  }

  const userId = userData?.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, created_at, order_status, payment_status, total, customer_name, user_id")
    .eq("user_id", userId)
    .not("order_status", "in", "(Cancelado,Finalizado)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getMyOpenOrders error:", error);
    return [];
  }
  return data ?? [];
}

export async function getPendingPaymentsCount() {
  const { data, error } = await supabase
    .from("v_order_payment_summary")
    .select("pending_amount");

  if (error) {
    console.error("getPendingPaymentsCount error:", error);
    return 0;
  }

  return (data ?? []).filter((row) => Number(row.pending_amount ?? 0) > 0).length;
}

export async function getOrderDetail(orderId) {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      created_at,
      order_status,
      payment_status,
      customer_id,
      subtotal,
      discount_amount,
      shipping_amount,
      tax_amount,
      grand_total,
      total,
      customer_name,
      customer_name_snapshot,
      customer_phone,
      customer_phone_snapshot,
      customer_email_snapshot,
      customer_address_snapshot,
      notes,
      customers (
        full_name,
        phone,
        email
      ),
      order_items (
        id,
        product_id,
        variant_id,
        qty,
        unit_price,
        subtotal,
        product_name_snapshot,
        variant_name_snapshot,
        sku_snapshot,
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
