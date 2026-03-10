import {
  fetchSession,
  fetchUser,
  signInWithGoogleOAuth,
  signOutSession,
  subscribeAuthChange
} from "./auth-service.js";
import { getCurrentProfile } from "./profiles.service.js";
import { normalizeRole, ROLES } from "../utils/permissions.js";

let cachedProfile = null;
let cachedProfileUserId = null;

export { signInWithGoogleOAuth, signOutSession, subscribeAuthChange };

export function clearAuthCache() {
  cachedProfile = null;
  cachedProfileUserId = null;
}

export async function getSession() {
  const { data, error } = await fetchSession();
  return { data: data?.session ?? null, error: error ?? null };
}

export async function getCurrentUser(session = null) {
  if (session?.user) return { data: session.user, error: null };

  const { data: sessionData } = await getSession();
  if (!sessionData?.user) return { data: null, error: null };

  const { data, error } = await fetchUser();
  return { data: data?.user ?? null, error: error ?? null };
}

export async function getAuthProfile(session = null, forceReload = false) {
  const { data: user, error: userError } = await getCurrentUser(session);
  if (userError) return { data: null, error: userError };
  if (!user?.id) {
    clearAuthCache();
    return { data: null, error: null };
  }

  if (!forceReload && cachedProfile && cachedProfileUserId === user.id) {
    return { data: cachedProfile, error: null };
  }

  const { data, error } = await getCurrentProfile();
  if (error) {
    clearAuthCache();
    return { data: null, error };
  }

  const normalized = {
    ...data,
    role: normalizeRole(data?.role ?? ROLES.VIEWER)
  };

  cachedProfile = normalized;
  cachedProfileUserId = user.id;

  return { data: normalized, error: null };
}

export async function getAuthContext() {
  const { data: session, error: sessionError } = await getSession();
  if (sessionError || !session) {
    return { session: null, profile: null, error: sessionError ?? null };
  }

  const { data: profile, error: profileError } = await getAuthProfile(session);
  return { session, profile, error: profileError ?? null };
}
