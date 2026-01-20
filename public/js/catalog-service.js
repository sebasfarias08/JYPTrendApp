import { supabase } from "./supabase-client.js";

export async function getProducts() {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      price,
      image_path,
      categories (
        name,
        slug
      )
    `)
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data;
}