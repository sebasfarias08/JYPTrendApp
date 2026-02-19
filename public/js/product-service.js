// public/js/product-service.js
import { supabase } from "./supabase-client.js";

export async function getProductById(id) {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      description,
      price,
      image_path,
      categories (
        name,
        slug
      )
    `)
    .eq("id", id)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("getProductById error:", error);
    return null;
  }
  return data;
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

  const updated = await getProductById(id);
  return { ok: true, data: updated };
}
