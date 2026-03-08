// public/js/auth.js
import {
  fetchCurrentProfile,
  fetchSession,
  fetchUser,
  signInWithGoogleOAuth,
  signOutSession,
  subscribeAuthChange
} from "./services/auth-service.js";

const DEFAULT_LOGIN_PATH = "/pages/login.html";
let cachedProfile = null;
let cachedProfileUserId = null;

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

function redirectToLogin() {
  const next = encodeURIComponent(location.pathname + location.search);
  location.href = `${DEFAULT_LOGIN_PATH}?next=${next}`;
}

function isSessionMissingError(error) {
  const message = String(error?.message ?? "");
  return error?.name === "AuthSessionMissingError" || message.includes("Auth session missing");
}

export function clearAuthCache() {
  cachedProfile = null;
  cachedProfileUserId = null;
}

export async function signInWithGoogle() {
  const next = readAuthNext();
  const redirectTo = `${location.origin}/pages/auth-callback.html${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  const { error } = await signInWithGoogleOAuth(redirectTo);
  if (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }
}

export async function signOut() {
  const { error } = await signOutSession();
  if (error) console.error("Sign out error:", error);
  clearAuthCache();
}

export async function getSession() {
  const { data, error } = await fetchSession();
  if (error) console.error("getSession error:", error);
  return data?.session ?? null;
}

export async function getCurrentUser(session = null) {
  const sessionUser = session?.user ?? null;
  if (sessionUser?.id) return sessionUser;

  const currentSession = await getSession();
  if (!currentSession?.user?.id) return null;

  const { data, error } = await fetchUser();
  if (error) {
    if (!isSessionMissingError(error)) {
      console.error("getCurrentUser error:", error);
    }
    return null;
  }
  return data?.user ?? null;
}

export async function getCurrentProfile(forceReload = false, session = null) {
  const user = await getCurrentUser(session);
  if (!user?.id) {
    clearAuthCache();
    return null;
  }

  if (!forceReload && cachedProfile && cachedProfileUserId === user.id) {
    return cachedProfile;
  }

  const { data, error } = await fetchCurrentProfile();
  if (error) {
    console.error("getCurrentProfile error:", error);
    clearAuthCache();
    return null;
  }

  cachedProfile = data ?? null;
  cachedProfileUserId = user.id;
  return cachedProfile;
}

export function onAuthChange(callback) {
  return subscribeAuthChange((session) => {
    if (!session) clearAuthCache();
    callback(session);
  });
}

// Guard para paginas protegidas
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirectToLogin();
    return null;
  }

  const profile = await getCurrentProfile(false, session);
  if (!profile || profile.is_active === false) {
    await signOut();
    redirectToLogin();
    return null;
  }

  // Backward-compatible return: existing pages can still use session.user.id
  return { ...session, session, profile };
}

export async function requireRole(roles = []) {
  const authState = await requireAuth();
  if (!authState) return null;

  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.length) return authState;

  const role = authState.profile?.role ?? "";
  if (!allowed.includes(role)) {
    location.replace("/pages/home.html");
    return null;
  }

  return authState;
}
