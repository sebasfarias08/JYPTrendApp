// public/js/auth.js
import {
  authDebugMeta,
  fetchCurrentProfile,
  fetchSession,
  getSessionSnapshot,
  logSupabaseError,
  signInWithGoogleOAuth,
  signOutSession,
  subscribeAuthChange
} from "./auth-service.js";
import { clearSalesContextCache, getSalesContext } from "../core/sales-context-service.js";
import { canAccessCatalogRoute, normalizeRole, ROLES } from "./permissions.js";

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

function isProfilesPolicyRecursionError(error) {
  return error?.code === "42P17" && String(error?.message ?? "").includes('relation "profiles"');
}

function buildFallbackViewerProfile(user) {
  return {
    id: user?.id ?? null,
    email: user?.email ?? "",
    full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || "",
    role: ROLES.VIEWER,
    is_active: true
  };
}

export function clearAuthCache() {
  cachedProfile = null;
  cachedProfileUserId = null;
  clearSalesContextCache();
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
  if (error) {
    const { session } = await getSessionSnapshot();
    logSupabaseError({ source: "auth", action: "signOut", error, session });
  }
  clearAuthCache();
}

export async function getSession() {
  const { data, error } = await fetchSession();
  if (error) {
    logSupabaseError({ source: "auth", action: "getSession", error });
  }
  return data?.session ?? null;
}

export async function getCurrentUser(session = null) {
  const activeSession = session ?? await getSession();
  return activeSession?.user ?? null;
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
    if (isProfilesPolicyRecursionError(error)) {
      const fallback = buildFallbackViewerProfile(user);
      console.warn("profiles RLS recursion detected (42P17). Using fallback viewer profile until DB policy is fixed.");
      cachedProfile = fallback;
      cachedProfileUserId = user.id;
      return fallback;
    }
    const activeSession = session ?? await getSession();
    if (!isSessionMissingError(error)) {
      logSupabaseError({ source: "auth", action: "getCurrentProfile", table: "profiles", error, session: activeSession });
    }
    clearAuthCache();
    return null;
  }

  cachedProfile = data ?? null;
  if (cachedProfile) {
    cachedProfile.role = normalizeRole(cachedProfile.role);
  }
  cachedProfileUserId = user.id;
  return cachedProfile;
}

export function onAuthChange(callback) {
  return subscribeAuthChange(({ event, session }) => {
    console.info("[auth] state changed", {
      event,
      ...authDebugMeta(session)
    });
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

  const role = normalizeRole(profile.role);
  if (role === ROLES.VIEWER && !canAccessCatalogRoute(location.pathname)) {
    location.replace("/index.html?tab=perfumes");
    return null;
  }

  const salesContext = await getSalesContext({
    userId: session.user.id,
    profile
  });

  // Backward-compatible return: existing pages can still use session.user.id
  return { ...session, session, profile, salesContext };
}

export async function requireRole(roles = []) {
  const authState = await requireAuth();
  if (!authState) return null;

  const allowed = (Array.isArray(roles) ? roles : [roles]).map((role) => normalizeRole(role));
  if (!allowed.length) return authState;

  const role = normalizeRole(authState.profile?.role);
  if (!allowed.includes(role)) {
    location.replace("/pages/home.html");
    return null;
  }

  return authState;
}
