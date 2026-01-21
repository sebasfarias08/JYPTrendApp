import { supabase } from "./supabase-client.js";

export async function updateOrderStatus(orderId, order_status) {
  return supabase
    .from("orders")
    .update({ order_status })
    .eq("id", orderId);
}

export async function updatePaymentStatus(orderId, payment_status) {
  return supabase
    .from("orders")
    .update({ payment_status })
    .eq("id", orderId);
}