/**
 * Active Studio / World resolution — server-only.
 *
 * The seeded Trust Tai Studio row lives in the external Supabase project. Its
 * UUID must never be hardcoded into browser code, so every server path that
 * needs `studio_id` / `world_id` resolves it here instead. Resolution is cached
 * for the lifetime of the worker instance (studios rarely change) and degrades
 * to nulls when the server has no database credentials.
 */

import type { UUID } from "./types";
import { getServerSupabase } from "./db.server";

export interface StudioContext {
  studioId: UUID | null;
  worldId: UUID | null;
  studioName: string | null;
  worldName: string | null;
  /** Honest reason the context is empty, when it is. */
  note: string | null;
}

const EMPTY: StudioContext = {
  studioId: null,
  worldId: null,
  studioName: null,
  worldName: null,
  note: "No database credentials on the server, so the active Studio could not be resolved.",
};

let cached: StudioContext | null = null;

/** Resolves the active Studio and its Active World from the database. */
export async function resolveStudioContext(force = false): Promise<StudioContext> {
  if (cached && !force) return cached;

  const db = getServerSupabase();
  if (!db) return EMPTY;

  const { data: studio, error } = await db
    .from("studios")
    .select("id, name, active_world_id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !studio) {
    return {
      ...EMPTY,
      note: error
        ? `The active Studio could not be read (${error.message}).`
        : "No Studio row exists yet in the database.",
    };
  }

  const studioId = studio["id"] as UUID;
  let worldId = (studio["active_world_id"] as UUID | null) ?? null;
  let worldName: string | null = null;

  if (!worldId) {
    const { data: world } = await db
      .from("worlds")
      .select("id, name")
      .eq("studio_id", studioId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    worldId = (world?.["id"] as UUID | undefined) ?? null;
    worldName = (world?.["name"] as string | undefined) ?? null;
  } else {
    const { data: world } = await db
      .from("worlds")
      .select("name")
      .eq("id", worldId)
      .maybeSingle();
    worldName = (world?.["name"] as string | undefined) ?? null;
  }

  cached = {
    studioId,
    worldId,
    studioName: (studio["name"] as string | undefined) ?? null,
    worldName,
    note: null,
  };
  return cached;
}

/**
 * Relevant creative context for the Active World.
 *
 * Deliberately narrow: compiled canon lines when the World has them, otherwise
 * a short bible excerpt. The whole Bible is never sent to the model.
 */
export async function getWorldCreativeContext(): Promise<{
  name: string;
  canonVersion: string;
  creativeRules?: string[];
}> {
  const ctx = await resolveStudioContext();
  const fallback = { name: "The Trust Tai World", canonVersion: "Canon v1.0" };
  const db = getServerSupabase();
  if (!db || !ctx.worldId) return fallback;

  const { data } = await db
    .from("worlds")
    .select("name, canon_version, compiled_canon, bible_text")
    .eq("id", ctx.worldId)
    .maybeSingle();
  if (!data) return fallback;

  const compiled = data["compiled_canon"] as unknown;
  let rules: string[] = [];
  if (Array.isArray(compiled)) {
    rules = compiled.filter((v): v is string => typeof v === "string");
  } else if (compiled && typeof compiled === "object") {
    const maybe = (compiled as Record<string, unknown>)["rules"];
    if (Array.isArray(maybe)) rules = maybe.filter((v): v is string => typeof v === "string");
  }
  if (!rules.length) {
    const bible = data["bible_text"];
    if (typeof bible === "string" && bible.trim()) {
      rules = [bible.trim().slice(0, 1200)];
    }
  }

  return {
    name: (data["name"] as string | undefined) ?? fallback.name,
    canonVersion: (data["canon_version"] as string | undefined) ?? fallback.canonVersion,
    ...(rules.length ? { creativeRules: rules.slice(0, 12) } : {}),
  };
}
