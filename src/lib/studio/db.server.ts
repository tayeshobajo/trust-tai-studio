/**
 * Server-only database boundary for Studio production.
 *
 * Reads credentials from server env at call time (never module scope, never
 * logged, never returned to the browser). Studio degrades honestly: when the
 * server has no database credentials, production still runs against Runway but
 * nothing is persisted and the UI is told so explicitly.
 *
 * Expected server env (Studio-owned names take precedence):
 *   STUDIO_SUPABASE_URL                 (falls back to SUPABASE_URL / VITE_SUPABASE_URL)
 *   STUDIO_SUPABASE_SERVICE_ROLE_KEY    (falls back to SUPABASE_SERVICE_ROLE_KEY)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getServerSupabase(): SupabaseClient | null {
  const url =
    process.env["STUDIO_SUPABASE_URL"] ??
    process.env["SUPABASE_URL"] ??
    process.env["VITE_SUPABASE_URL"];
  const key =
    process.env["STUDIO_SUPABASE_SERVICE_ROLE_KEY"] ??
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
    process.env["SUPABASE_PUBLISHABLE_KEY"] ??
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;


  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        // sb_* keys are opaque, not JWTs: send them as `apikey` only.
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export const NO_DATABASE_NOTE =
  "Generation ran, but nothing was recorded: the server has no database credentials (STUDIO_SUPABASE_URL / STUDIO_SUPABASE_SERVICE_ROLE_KEY).";

