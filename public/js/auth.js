// public/js/auth.js
import { supabase } from "./supabase-client.js";

export async function signInWithGoogle() {
  const next = localStorage.getItem("auth_next");
  const redirectTo = `${location.origin}/pages/auth-callback.html${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo }
  });

  if (error) console.error("Google sign-in error:", error);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error("Sign out error:", error);
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) console.error("getSession error:", error);
  return data?.session ?? null;
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session ?? null);
  });
}

// Guard para páginas protegidas
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    // guardamos a dónde quería ir
    const next = encodeURIComponent(location.pathname + location.search);
    location.href = `/pages/login.html?next=${next}`;
    return null;
  }
  return session;
}