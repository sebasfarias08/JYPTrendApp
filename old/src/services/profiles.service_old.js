import { supabase } from "../lib/supabaseClient.js";
import { normalizeRole } from "../utils/permissions.js";

function normalizeProfile(profile) {
  if (!profile) return null;
  return {
    ...profile,
    role: normalizeRole(profile.role)
  };
}

export async function getCurrentProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: normalizeProfile(data), error: null };
}
