/* public/js/supabase.js */

// Recomendación: setear estas variables por tu pipeline de deploy
// o cargar un /config.json que NO subas con secretos.
// La anon key es "pública", pero igual no la hardcodees si podés.

export function getSupabaseConfig() {
  const url = window.__SUPABASE_URL__;
  const anonKey = window.__SUPABASE_ANON_KEY__;
  if (!url || !anonKey) {
    console.warn("Supabase config not set yet (window.__SUPABASE_URL__ / __SUPABASE_ANON_KEY__).");
  }
  return { url, anonKey };
}