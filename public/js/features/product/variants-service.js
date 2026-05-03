import { supabase } from "../../app/core/supabase-client.js";

function mapVariant(row) {
  if (!row) return null;
  return {
    id: row.id,
    product_id: row.product_id ?? null,
    sku: row.sku ?? "",
    barcode: row.barcode ?? "",
    variant_name: row.variant_name ?? "",
    image_path: row.image_path ?? "",
    sale_price: row.sale_price == null ? null : Number(row.sale_price),
    active: row.active !== false,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    products: row.products ?? null
  };
}

export async function getVariantsForAdmin({ includeInactive = true, search = "" } = {}) {
  let query = supabase
    .from("product_variants")
    .select(`
      id,
      product_id,
      sku,
      barcode,
      variant_name,
      image_path,
      sale_price,
      active,
      created_at,
      updated_at,
      products (
        id,
        name,
        description,
        price,
        image_path,
        active,
        category_id,
        categories (
          id,
          name,
          slug
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (!includeInactive) {
    query = query.eq("active", true).eq("products.active", true);
  }

  const q = String(search || "").trim();
  if (q) {
    query = query.or(
      `variant_name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%,products.name.ilike.%${q}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("getVariantsForAdmin error:", error);
    return [];
  }

  return (data ?? []).map(mapVariant);
}

export async function getVariantById(id, { includeInactive = false } = {}) {
  let query = supabase
    .from("product_variants")
    .select(`
      id,
      product_id,
      sku,
      barcode,
      variant_name,
      image_path,
      sale_price,
      active,
      created_at,
      updated_at,
      products (
        id,
        name,
        description,
        price,
        image_path,
        active,
        category_id,
        categories (
          id,
          name,
          slug
        )
      )
    `)
    .eq("id", id);

  if (!includeInactive) {
    query = query.eq("active", true).eq("products.active", true);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("getVariantById error:", error);
    return null;
  }

  return mapVariant(data);
}

export async function setVariantActive(id, active) {
  const { error } = await supabase
    .from("product_variants")
    .update({ active })
    .eq("id", id);

  if (error) {
    console.error("setVariantActive error:", error);
    return false;
  }

  return true;
}

export async function updateVariant(id, changes) {
  const { error } = await supabase
    .from("product_variants")
    .update(changes)
    .eq("id", id);

  if (error) {
    console.error("updateVariant error:", error);
    return null;
  }

  return getVariantById(id);
}

export async function createVariant(payload) {
  const { data, error } = await supabase
    .from("product_variants")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("createVariant error:", error);
    return null;
  }

  return mapVariant(data);
}

export async function deleteVariant(id) {
  const { error } = await supabase
    .from("product_variants")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteVariant error:", error);
    return false;
  }

  return true;
}
