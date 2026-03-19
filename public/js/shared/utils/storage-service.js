import { supabase } from "../../app/core/supabase-client.js";

function normalizeImagePath(path) {
  if (!path) return "";
  const normalizedPath = String(path).trim().replace(/^\/+/, "");
  return normalizedPath || "";
}

function buildTransformOptions(options = null) {
  if (!options || typeof options !== "object") return null;

  const width = Number(options.width);
  const height = Number(options.height);
  const quality = Number(options.quality);
  const resize = String(options.resize ?? "").trim();
  const format = String(options.format ?? "").trim();

  const transform = {};
  if (Number.isFinite(width) && width > 0) transform.width = Math.round(width);
  if (Number.isFinite(height) && height > 0) transform.height = Math.round(height);
  if (Number.isFinite(quality) && quality > 0) transform.quality = Math.round(quality);
  if (resize) transform.resize = resize;
  if (format) transform.format = format;

  return Object.keys(transform).length ? { transform } : null;
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
