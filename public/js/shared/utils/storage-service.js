import { supabase } from "../../app/core/supabase-client.js";

export function getCatalogImageUrl(path) {
  if (!path) return "";
  const normalizedPath = String(path).trim().replace(/^\/+/, "");
  if (!normalizedPath) return "";
  const { data } = supabase.storage.from("catalog").getPublicUrl(normalizedPath);
  return data?.publicUrl ?? "";
}
