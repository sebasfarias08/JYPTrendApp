import { supabase } from "../../app/core/supabase-client.js";
import { getSessionSnapshot, logSupabaseError } from "../../app/auth/auth-service.js";

async function logError(action, error, extra = null) {
  const { session } = await getSessionSnapshot();
  logSupabaseError({ source: "finance/transfers-service", action, error, session, extra });
}

export async function createTransfer({ from_account_id, to_account_id, amount, note }) {
  const payload = {
    from_account_id: from_account_id ?? null,
    to_account_id: to_account_id ?? null,
    amount: Number(amount ?? 0),
    note: String(note ?? "").trim() || null
  };

  const { data, error } = await supabase
    .from("transfers")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    await logError("createTransfer", error, payload);
    return { ok: false, error };
  }

  return { ok: true, data };
}
