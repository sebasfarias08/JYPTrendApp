import { supabase } from "../../app/core/supabase-client.js";

function normalizeImagePath(path) {
  if (!path) return "";
  const normalizedPath = String(path).trim().replace(/^\/+/, "");
  return normalizedPath || "";
}

function buildTransformOptions(options = null) {
  return null;
}

export function getCatalogImageUrl(path, options = null) {
  const normalizedPath = normalizeImagePath(path);
  if (!normalizedPath) return "";
  const transformOptions = buildTransformOptions(options);
  const { data } = supabase.storage.from("catalog").getPublicUrl(normalizedPath, transformOptions || undefined);
  return data?.publicUrl ?? "";
}

export function getCatalogImageUrls(path, options = null) {
  const normalizedPath = normalizeImagePath(path);
  if (!normalizedPath) {
    return {
      publicUrl: "",
      transformedUrl: ""
    };
  }

  const publicUrl = getCatalogImageUrl(normalizedPath);
  const transformedUrl = options ? getCatalogImageUrl(normalizedPath, options) : publicUrl;

  return {
    publicUrl,
    transformedUrl
  };
}
