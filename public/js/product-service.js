// public/js/product-service.js
import { supabase } from "./supabase-client.js";

function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name ?? "",
    description: row.description ?? "",
    price: Number(row.price ?? 0),
    image_path: row.image_path ?? "",
    active: row.active !== false,
    category_id: row.category_id ?? row.categories?.id ?? null,
    categories: row.categories ?? null,
    created_at: row.created_at ?? null
  };
}

export async function getProductById(id, { includeInactive = false } = {}) {
  let query = supabase
    .from("products")
    .select(`
      id,
      name,
      description,
      price,
      image_path,
      active,
      category_id,
      created_at,
      categories (
        id,
        name,
        slug
      )
    `)
    .eq("id", id);

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("getProductById error:", error);
    return null;
  }
  return mapProduct(data);
}

export async function getProductsForAdmin({ includeInactive = true, search = "" } = {}) {
  let query = supabase
    .from("products")
    .select(`
      id,
      name,
      description,
      price,
      image_path,
      active,
      category_id,
      created_at,
      categories (
        id,
        name,
        slug
      )
    `)
    .order("created_at", { ascending: false });

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  const q = String(search || "").trim();
  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getProductsForAdmin error:", error);
    return [];
  }

  return (data ?? []).map(mapProduct);
}

export async function getProductCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name", { ascending: true });

  if (error) {
    console.error("getProductCategories error:", error);
    return [];
  }

  return data ?? [];
}

export async function createProduct(payload) {
  const body = {
    name: String(payload?.name ?? "").trim(),
    description: String(payload?.description ?? "").trim() || null,
    price: Number(payload?.price ?? 0),
    image_path: String(payload?.image_path ?? "").trim() || null,
    category_id: payload?.category_id || null,
    active: true
  };

  const { data, error } = await supabase
    .from("products")
    .insert(body)
    .select("id")
    .single();

  if (error) {
    console.error("createProduct error:", error);
    return { ok: false, error };
  }

  const full = await getProductById(data.id, { includeInactive: true });
  return { ok: true, data: full };
}

export async function updateProductById(id, changes) {
  const { error } = await supabase
    .from("products")
    .update(changes)
    .eq("id", id);

  if (error) {
    console.error("updateProductById error:", error);
    return { ok: false, error };
  }

  const updated = await getProductById(id, { includeInactive: true });
  return { ok: true, data: updated };
}

export async function setProductActive(id, active) {
  const { error } = await supabase
    .from("products")
    .update({ active: Boolean(active) })
    .eq("id", id);

  if (error) {
    console.error("setProductActive error:", error);
    return { ok: false, error };
  }

  const updated = await getProductById(id, { includeInactive: true });
  return { ok: true, data: updated };
}
