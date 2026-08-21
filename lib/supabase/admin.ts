import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Uses the SERVICE ROLE key, which bypasses Row Level Security entirely.
 * Only ever use this in server-side code (API routes), never in a component
 * that ships to the browser, and never pass this client's results directly
 * back to the client without checking permissions yourself.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
