// public/js/image.js
const SUPABASE_PROJECT_ID = "fkfipbrevepkztcmnfgi"; // ej: abcd1234

export function getImageUrl(path) {
  if (!path) return "";

  return `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/catalog/${path}`;
}
