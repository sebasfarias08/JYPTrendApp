import { supabase } from "../../app/core/supabase-client.js";
import { getSessionSnapshot, logSupabaseError } from "../../app/auth/auth-service.js";

async function logError(action, error, extra = null) {
  const { session } = await getSessionSnapshot();
  logSupabaseError({ source: "finance/expenses-service", action, error, session, extra });
}

export async function createExpense({ category, description, amount, account_id, counterparty }) {
  const payload = {
    category: String(category ?? "").trim() || null,
    description: String(description ?? "").trim() || null,
    amount: Number(amount ?? 0),
    account_id: account_id ?? null,
    counterparty: String(counterparty ?? "").trim() || null
  };

  const { data, error } = await supabase
    .from("expenses")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    await logError("createExpense", error, payload);
    return { ok: false, error };
  }

  return { ok: true, data };
}
