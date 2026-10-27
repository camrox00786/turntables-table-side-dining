import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseProjectRef =
  (import.meta.env.VITE_SUPABASE_PROJECT_REF as string | undefined) ?? "";
export const dataMode =
  (import.meta.env.VITE_TURNTABLES_DATA_MODE as string | undefined) === "supabase"
    ? "supabase"
    : "demo";
export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

let client: SupabaseClient | null = null;

/**
 * Public-key client only. Never place a Supabase service-role key in VITE_ variables.
 * Demo mode remains the default until the application has authenticated staff and customer RPCs.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

export function requireSupabaseClient(): SupabaseClient {
  const configured = getSupabaseClient();
  if (!configured) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return configured;
}
