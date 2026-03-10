import { supabase } from "../lib/supabaseClient.js";

export async function getOrderPaymentSummary() {
  const { data, error } = await supabase
    .from("v_order_payment_summary")
    .select("*");

  if (error) {
    console.error("getOrderPaymentSummary error:", error);
    return [];
  }

  return data ?? [];
}

export async function getPaymentsByOrderId(orderId) {
  const { data, error } = await supabase
    .from("payments")
    .select("id, order_id, customer_id, user_id, amount, currency_code, payment_method, payment_status, payment_date, reference_number, external_reference, notes, created_at, updated_at")
    .eq("order_id", orderId)
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("getPaymentsByOrderId error:", error);
    return [];
  }

  return data ?? [];
}
