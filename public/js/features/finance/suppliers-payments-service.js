import { supabase } from "../../app/core/supabase-client.js";
import { getSessionSnapshot, logSupabaseError } from "../../app/auth/auth-service.js";

async function logError(action, error, extra = null) {
  const { session } = await getSessionSnapshot();
  logSupabaseError({ source: "finance/suppliers-payments-service", action, error, session, extra });
}

export async function getPendingSupplierPayments(limit = 8) {
  const { data, error } = await supabase
    .from("purchase_financials")
    .select("*")
    .gt("balance", 0)
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (error) {
    await logError("getPendingSupplierPayments", error);
    return [];
  }

  return data ?? [];
}

export async function createSupplierPayment({ purchase_order_id, amount, account_id, payment_method, note }) {
  const payload = {
    purchase_order_id: purchase_order_id ?? null,
    amount: Number(amount ?? 0),
    account_id: account_id ?? null,
    payment_method: String(payment_method ?? "").trim() || null,
    note: String(note ?? "").trim() || null
  };

  const { data, error } = await supabase
    .from("supplier_payments")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    await logError("createSupplierPayment", error, payload);
    return { ok: false, error };
  }

  return { ok: true, data };
}
