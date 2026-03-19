import { supabase } from "../core/supabase-client.js";

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

export async function getSessionSnapshot() {
  const { data, error } = await supabase.auth.getSession();
  return {
    session: data?.session ?? null,
    error: error ?? null
  };
}

export async function fetchUser() {
  return supabase.auth.getUser();
}

export function authDebugMeta(session) {
  return {
    hasSession: Boolean(session),
    userId: session?.user?.id ?? null,
    expiresAt: session?.expires_at
      ? new Date(session.expires_at * 1000).toISOString()
      : null
  };
}

export function logSupabaseError({ source, action, table = null, error, session = null, extra = null } = {}) {
  console.error(`[${source}] ${action} failed`, {
    table,
    ...authDebugMeta(session),
    errorCode: error?.code ?? null,
    errorMessage: error?.message ?? null,
    errorDetails: error?.details ?? null,
    errorHint: error?.hint ?? null,
    extra: extra ?? null
  });
}

export async function fetchCurrentProfile() {
  return supabase
    .from("profiles")
    .select("*")
    .single();
}

export function subscribeAuthChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback({
      event,
      session: session ?? null
    });
  });
}
