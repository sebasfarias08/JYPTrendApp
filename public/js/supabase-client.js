import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://fkfipbrevepkztcmnfgi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_3NtZaq1zpVMsylskqSUmIQ_83xXQJts";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: "pkce",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});