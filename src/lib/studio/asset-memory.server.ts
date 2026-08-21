/**
 * Creative memory for a durable asset — server-only.
 *
 * Two responsibilities:
 *   1. read back what the World has already learned about one asset
 *      (approvals, rejections, change requests, Studio AI direction)
 *   2. run Studio AI on demand to produce the FIRST creative direction for a
 *      durable asset, and persist that direction as memory
 *
 * Studio AI never runs automatically here: direction costs a real call, so it
 * happens only when a human asks for it.
 */

import type { AssetDirection, CreativeMemoryEntry, ServiceResult } from "./ai-types";
import type { UUID } from "./types";
import { getServerSupabase, NO_DATABASE_NOTE } from "./db.server";

/**
 * Studio AI direction is an AI proposal, not a human verdict, so it is stored
 * with the live-allowed disposition `experiment` (the DB check constraint
 * allows only: observation, approved_pattern, rejected_pattern, canon_rule,
 * experiment). Provenance is carried by a stable marker prefix in the feedback
 * text rather than a new constrained value or extra schema.
 */
const STUDIO_AI_DISPOSITION = "experiment";
const STUDIO_AI_MARKER = "[studio-ai:direction]";

const noDb = <T>(): ServiceResult<T> => ({
  ok: false,
  error: { code: "provider_not_configured", provider: "studio_storage", message: NO_DATABASE_NOTE },
});

function toEntry(row: Record<string, unknown>): CreativeMemoryEntry {
  const disposition = (row["disposition"] as string | null) ?? null;
  const rawFeedback = String(row["feedback"] ?? "");
  const fromStudioAI = disposition === STUDIO_AI_DISPOSITION && rawFeedback.startsWith(STUDIO_AI_MARKER);
  return {
    id: row["id"] as UUID,
    feedback: fromStudioAI ? rawFeedback.slice(STUDIO_AI_MARKER.length).trimStart() : rawFeedback,
    classification: (row["classification"] as string | null) ?? null,
    disposition,
    createdAt: (row["created_at"] as string | null) ?? null,
    fromStudioAI,
  };
}

/** Everything the World remembers about this asset, newest first. */
export async function listAssetMemory(assetId: UUID): Promise<ServiceResult<CreativeMemoryEntry[]>> {
  const db = getServerSupabase();
  if (!db) return noDb<CreativeMemoryEntry[]>();

  const { data, error } = await db
    .from("creative_feedback")
    .select("id, feedback, classification, disposition, created_at")
    .eq("asset_id", assetId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return { ok: false, error: { code: "provider_error", provider: "studio_storage", message: error.message } };
  }
  return { ok: true, data: (data ?? []).map((row) => toEntry(row as Record<string, unknown>)) };
}

export interface AssetDirectionResult {
  direction: AssetDirection;
  /** Row id in `creative_feedback`, when the direction was stored. */
  memoryId: UUID | null;
  persisted: boolean;
  /** Honest reason the direction was not stored, when it was not. */
  note: string | null;
}

/**
 * Runs Studio AI against one durable asset and records the result as memory.
 * Requires the asset to be stored in Studio — a provider preview expires, so
 * directing one would be direction about nothing.
 */
export async function runAssetDirection(assetId: UUID): Promise<ServiceResult<AssetDirectionResult>> {
  const db = getServerSupabase();
  if (!db) return noDb<AssetDirectionResult>();

  const { data: asset } = await db
    .from("assets")
    .select(
      "id, studio_id, story_id, scene_id, world_id, asset_type, prompt, storage_path, stories(title), scenes(scene_number, narrative_purpose)",
    )
    .eq("id", assetId)
    .maybeSingle();

  if (!asset) {
    return {
      ok: false,
      error: { code: "invalid_input", provider: "studio_storage", message: "That asset is not in Studio." },
    };
  }
  if (!asset["storage_path"]) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        provider: "studio_storage",
        message: "This is still a provider preview. Studio directs work it owns, once the bytes are stored here.",
      },
    };
  }

  const prior = await listAssetMemory(assetId);
  const priorFeedback = prior.ok ? prior.data.map((entry) => entry.feedback) : [];

  const scene = asset["scenes"] as { scene_number?: number | null; narrative_purpose?: string | null } | null;
  const story = asset["stories"] as { title?: string | null } | null;

  const { getWorldCreativeContext } = await import("./studio-config.server");
  const { studioAI } = await import("./studio-ai.server");
  const world = await getWorldCreativeContext();

  const result = await studioAI.directAsset({
    world,
    storyTitle: story?.title ?? null,
    sceneNumber: scene?.scene_number ?? null,
    scenePrompt: (asset["prompt"] as string | null) ?? scene?.narrative_purpose ?? null,
    assetType: (asset["asset_type"] as string | null) ?? "image",
    priorFeedback,
  });

  if (!result.ok) return result;

  const direction = result.data;
  const memoryText = [
    `${STUDIO_AI_MARKER} ${direction.direction}`,
    `What works: ${direction.whatWorks}`,
    `What to change: ${direction.whatToChange}`,
    `Next shot: ${direction.nextShot}`,
  ].join("\n");

  const { data: row, error } = await db
    .from("creative_feedback")
    .insert({
      studio_id: asset["studio_id"],
      world_id: asset["world_id"],
      story_id: asset["story_id"],
      scene_id: asset["scene_id"],
      asset_id: assetId,
      feedback: memoryText,
      classification: "story",
      disposition: STUDIO_AI_DISPOSITION,
    })
    .select("id")
    .maybeSingle();

  return {
    ok: true,
    data: {
      direction,
      memoryId: (row?.["id"] as UUID | undefined) ?? null,
      persisted: !error && Boolean(row),
      note: error ? "Studio AI answered, but the direction could not be saved to memory." : null,
    },
  };
}
