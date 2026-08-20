/**
 * Production tracking — server-only.
 *
 * Owns the write side of Truth -> Story -> Scenes -> Assets:
 *   - records every Runway task as a row in `public.assets` (provider_task_id)
 *   - moves `scenes.status` and `stories.status` forward as generation runs
 *
 * Never called from the browser directly; `production.functions.ts` is the
 * only entry point. If the server has no database credentials, every function
 * returns an honest "not persisted" result instead of pretending.
 */

import type {
  AssetKind,
  AssetStatus,
  GenerationTask,
  SceneStatus,
  TrackedGenerationTask,
} from "./ai-types";
import type { UUID } from "./types";
import { getServerSupabase, NO_DATABASE_NOTE } from "./db.server";

export interface RecordTaskInput {
  task: GenerationTask;
  studioId?: UUID | null;
  sceneNumber: number;
  assetType: AssetKind;
  generationSettings?: Record<string, unknown>;
}

const untracked = (
  task: GenerationTask,
  assetStatus: AssetStatus,
  note: string,
): TrackedGenerationTask => ({
  task,
  assetId: null,
  assetStatus,
  persisted: false,
  persistenceNote: note,
  sceneStatus: null,
  storyStatus: null,
});

const assetStatusFor = (status: GenerationTask["status"]): AssetStatus =>
  status === "succeeded" ? "ready" : status === "failed" ? "failed" : "generating";

const sceneStatusFor = (status: GenerationTask["status"]): SceneStatus =>
  status === "succeeded" ? "review" : status === "failed" ? "ready_to_generate" : "generating";

/** Resolves the scene row for a plan scene, preferring an explicit scene id. */
async function resolveSceneId(
  db: NonNullable<ReturnType<typeof getServerSupabase>>,
  storyId: UUID | null,
  sceneId: UUID | null,
  sceneNumber: number,
): Promise<UUID | null> {
  if (sceneId) return sceneId;
  if (!storyId) return null;
  const { data } = await db
    .from("scenes")
    .select("id")
    .eq("story_id", storyId)
    .eq("scene_number", sceneNumber)
    .maybeSingle();
  return (data?.["id"] as UUID | undefined) ?? null;
}

/** Rolls the story forward from its scenes' statuses. */
async function reconcileStoryStatus(
  db: NonNullable<ReturnType<typeof getServerSupabase>>,
  storyId: UUID,
): Promise<string | null> {
  const { data } = await db.from("scenes").select("status").eq("story_id", storyId);
  const statuses = (data ?? []).map((row) => String(row["status"]));
  if (statuses.length === 0) return null;

  const next = statuses.every((s) => s === "approved")
    ? "live"
    : statuses.every((s) => s === "approved" || s === "review")
      ? "ready_for_approval"
      : "in_production";

  await db
    .from("stories")
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq("id", storyId);
  return next;
}

/**
 * Persists a freshly submitted Runway task and marks the scene as generating.
 */
export async function recordGenerationStart(
  input: RecordTaskInput,
): Promise<TrackedGenerationTask> {
  const { task } = input;
  const assetStatus = assetStatusFor(task.status);
  const db = getServerSupabase();
  if (!db) return untracked(task, assetStatus, NO_DATABASE_NOTE);

  const { storyId, sceneId, worldId, prompt, providerTaskId } = task.provenance;
  const resolvedSceneId = await resolveSceneId(db, storyId, sceneId, input.sceneNumber);

  const { data, error } = await db
    .from("assets")
    .insert({
      studio_id: input.studioId ?? null,
      story_id: storyId,
      scene_id: resolvedSceneId,
      world_id: worldId,
      asset_type: input.assetType,
      status: assetStatus,
      provider: "runway",
      provider_task_id: providerTaskId,
      prompt,
      generation_settings: input.generationSettings ?? {},
      provenance: { ...task.provenance, sceneNumber: input.sceneNumber },
    })
    .select("id")
    .maybeSingle();

  if (error) {
    return untracked(task, assetStatus, `Generation started, but it could not be recorded: ${error.message}`);
  }

  let sceneStatus: SceneStatus | null = null;
  if (resolvedSceneId) {
    sceneStatus = "generating";
    await db
      .from("scenes")
      .update({ status: sceneStatus, updated_at: new Date().toISOString() })
      .eq("id", resolvedSceneId);
  }

  const storyStatus = storyId ? await reconcileStoryStatus(db, storyId) : null;

  return {
    task,
    assetId: (data?.["id"] as UUID | undefined) ?? null,
    assetStatus,
    persisted: true,
    persistenceNote: null,
    sceneStatus,
    storyStatus,
  };
}

/**
 * Applies a polled provider status to the asset row, its scene, and the story.
 * Matching is by `provider_task_id`, so polling is idempotent.
 */
export async function recordGenerationProgress(
  task: GenerationTask,
  durableUrl: string | null,
  storagePath: string | null,
): Promise<TrackedGenerationTask> {
  const assetStatus = assetStatusFor(task.status);
  const db = getServerSupabase();
  const providerTaskId = task.provenance.providerTaskId;
  if (!db) return untracked(task, assetStatus, NO_DATABASE_NOTE);
  if (!providerTaskId) {
    return untracked(task, assetStatus, "No provider task id to reconcile against.");
  }

  const { data: assetRow } = await db
    .from("assets")
    .select("id, story_id, scene_id")
    .eq("provider_task_id", providerTaskId)
    .maybeSingle();

  if (!assetRow) {
    return untracked(task, assetStatus, "This generation was never recorded, so there is nothing to update.");
  }

  await db
    .from("assets")
    .update({
      status: assetStatus,
      // Provider URLs are temporary; storage_path is the durable source.
      url: durableUrl ?? task.outputUrl,
      storage_path: storagePath,
    })
    .eq("id", assetRow["id"] as string);

  const sceneId = (assetRow["scene_id"] as UUID | null) ?? null;
  let sceneStatus: SceneStatus | null = null;
  if (sceneId) {
    sceneStatus = sceneStatusFor(task.status);
    await db
      .from("scenes")
      .update({ status: sceneStatus, updated_at: new Date().toISOString() })
      .eq("id", sceneId);
  }

  const storyId = (assetRow["story_id"] as UUID | null) ?? null;
  const storyStatus = storyId ? await reconcileStoryStatus(db, storyId) : null;

  return {
    task,
    assetId: assetRow["id"] as UUID,
    assetStatus,
    persisted: true,
    persistenceNote: null,
    sceneStatus,
    storyStatus,
  };
}
