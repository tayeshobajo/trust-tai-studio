/**
 * Supabase browser boundary.
 *
 * Credentials come from environment variables only. Nothing is hardcoded and
 * nothing server-side (Runway, OpenAI) ever reaches this file.
 *
 * Expected env:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_PUBLISHABLE_KEY
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env['VITE_SUPABASE_URL'] as string | undefined;
const publishableKey = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] as string | undefined;

/** True when Studio has credentials to talk to the database. */
export const isSupabaseConfigured = Boolean(url && publishableKey);

let client: SupabaseClient | null = null;

/** Returns the client, or null when Studio is running without credentials. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url!, publishableKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}
