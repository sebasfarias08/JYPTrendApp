import { supabase } from "./supabase-client.js";

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("getCurrentUserId error:", error);
    return null;
  }
  return data?.user?.id ?? null;
}

function mapCustomer(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    full_name: row.full_name ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    notes: row.notes ?? "",
    is_active: Boolean(row.is_active),
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null
  };
}

export async function getCustomers({ includeInactive = false, search = "" } = {}) {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  let query = supabase
    .from("customers")
    .select("id, user_id, full_name, phone, email, notes, is_active, created_at, updated_at")
    .eq("user_id", userId)
    .order("full_name", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const normalized = String(search || "").trim();
  if (normalized) {
    query = query.ilike("full_name", `%${normalized}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getCustomers error:", error);
    return [];
  }

  return (data ?? []).map(mapCustomer);
}

export async function getActiveCustomers() {
  return getCustomers({ includeInactive: false });
}

export async function getCustomerById(id) {
  if (!id) return null;

  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from("customers")
    .select("id, user_id, full_name, phone, email, notes, is_active, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("getCustomerById error:", error);
    return null;
  }

  return mapCustomer(data);
}

export async function createCustomer(payload) {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "NO_SESSION" };

  const body = {
    user_id: userId,
    full_name: String(payload?.full_name ?? "").trim(),
    phone: String(payload?.phone ?? "").trim() || null,
    email: String(payload?.email ?? "").trim() || null,
    notes: String(payload?.notes ?? "").trim() || null,
    is_active: true
  };

  const { data, error } = await supabase
    .from("customers")
    .insert(body)
    .select("id, user_id, full_name, phone, email, notes, is_active, created_at, updated_at")
    .single();

  if (error) {
    console.error("createCustomer error:", error);
    return { ok: false, error };
  }

  return { ok: true, data: mapCustomer(data) };
}

export async function updateCustomer(id, payload) {
  if (!id) return { ok: false, error: "MISSING_ID" };

  const body = {
    full_name: String(payload?.full_name ?? "").trim(),
    phone: String(payload?.phone ?? "").trim() || null,
    email: String(payload?.email ?? "").trim() || null,
    notes: String(payload?.notes ?? "").trim() || null
  };

  const { data, error } = await supabase
    .from("customers")
    .update(body)
    .eq("id", id)
    .select("id, user_id, full_name, phone, email, notes, is_active, created_at, updated_at")
    .single();

  if (error) {
    console.error("updateCustomer error:", error);
    return { ok: false, error };
  }

  return { ok: true, data: mapCustomer(data) };
}

export async function deactivateCustomer(id) {
  if (!id) return { ok: false, error: "MISSING_ID" };

  const { data, error } = await supabase
    .from("customers")
    .update({ is_active: false })
    .eq("id", id)
    .select("id, user_id, full_name, phone, email, notes, is_active, created_at, updated_at")
    .single();

  if (error) {
    console.error("deactivateCustomer error:", error);
    return { ok: false, error };
  }

  return { ok: true, data: mapCustomer(data) };
}

export async function reactivateCustomer(id) {
  if (!id) return { ok: false, error: "MISSING_ID" };

  const { data, error } = await supabase
    .from("customers")
    .update({ is_active: true })
    .eq("id", id)
    .select("id, user_id, full_name, phone, email, notes, is_active, created_at, updated_at")
    .single();

  if (error) {
    console.error("reactivateCustomer error:", error);
    return { ok: false, error };
  }

  return { ok: true, data: mapCustomer(data) };
}
