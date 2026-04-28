import { supabase } from "../../app/core/supabase-client.js";
import { getSessionSnapshot, logSupabaseError } from "../../app/auth/auth-service.js";

function normalizeAccount(row) {
  if (!row) return null;
  return {
    account_id: row.account_id ?? row.id ?? null,
    account_name: row.account_name ?? row.name ?? "Cuenta desconocida",
    currency: row.currency ?? row.currency_code ?? "ARS",
    balance: Number(row.balance ?? row.current_balance ?? 0),
    available_balance: Number(row.available_balance ?? row.balance ?? 0),
    raw: row
  };
}

async function logError(action, error, extra = null) {
  const { session } = await getSessionSnapshot();
  logSupabaseError({ source: "finance/accounts-service", action, error, session, extra });
}

export async function getAccountBalances() {
  const { data, error } = await supabase
    .from("account_balance")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    await logError("getAccountBalances", error);
    return [];
  }

  return (data ?? []).map(normalizeAccount);
}

export async function getAccountOptions() {
  return (await getAccountBalances()).map((account) => ({
    id: account.account_id,
    name: account.account_name,
    currency: account.currency
  }));
}

export async function getAccounts() {
  return getAccountBalances();
}
