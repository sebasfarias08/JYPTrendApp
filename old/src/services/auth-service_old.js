import { supabase } from "../lib/supabase-client.js";

export async function signInWithGoogleOAuth(redirectTo) {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo }
  });
}

export async function signOutSession() {
  return supabase.auth.signOut();
}

export async function fetchSession() {
  return supabase.auth.getSession();
}

export async function fetchUser() {
  return supabase.auth.getUser();
}

export function subscribeAuthChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session ?? null);
  });
}
