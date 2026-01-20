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
