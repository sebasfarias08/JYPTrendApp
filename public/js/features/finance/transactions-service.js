import { supabase } from "../../app/core/supabase-client.js";
import { getSessionSnapshot, logSupabaseError } from "../../app/auth/auth-service.js";

async function logError(action, error, extra = null) {
  const { session } = await getSessionSnapshot();
  logSupabaseError({ source: "finance/transactions-service", action, error, session, extra });
}

export async function getCashFlowLast7Days() {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 6);
  const isoDate = fromDate.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("financial_movements")
    .select("*")
    .gte("created_at", isoDate)
    .order("created_at", { ascending: true });

  if (error) {
    await logError("getCashFlowLast7Days", error, { fromDate: isoDate });
    return [];
  }

  return data ?? [];
}

export async function getFinancialMovements(limit = 100) {
  const { data, error } = await supabase
    .from("financial_movements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    await logError("getFinancialMovements", error);
    return [];
  }

  return data ?? [];
}
