// public/js/auth.js
import {
  fetchSession,
  signInWithGoogleOAuth,
  signOutSession,
  subscribeAuthChange
} from "./services/auth-service.js";

function sanitizeInternalPath(value, fallback = "/pages/home.html") {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  try {
    const url = new URL(raw, location.origin);
    if (url.origin !== location.origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

function readAuthNext() {
  try {
    const raw = localStorage.getItem("auth_next");
    if (!raw) return "";
    const next = sanitizeInternalPath(raw, "");
    localStorage.removeItem("auth_next");
    return next;
  } catch {
    return "";
  }
}

export async function signInWithGoogle() {
  const next = readAuthNext();
  const redirectTo = `${location.origin}/pages/auth-callback.html${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  
  const { error } = await signInWithGoogleOAuth(redirectTo);

  if (error) console.error("Google sign-in error:", error);
}

export async function signOut() {
  const { error } = await signOutSession();
  if (error) console.error("Sign out error:", error);
}

export async function getSession() {
  const { data, error } = await fetchSession();
  if (error) console.error("getSession error:", error);
  return data?.session ?? null;
}

export function onAuthChange(callback) {
  return subscribeAuthChange(callback);
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
