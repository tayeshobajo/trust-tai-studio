/**
 * Story-level review — server-only.
 *
 * Assets are reviewed one frame at a time; a directed Story is reviewed as a
 * whole. This module surfaces Stories that have been directed (scenes exist)
 * and moves their status forward or back in Supabase, together with their
 * `story_outputs` rows.
 *
 * Allowed statuses in the live database:
 *   stories.status       draft | discovering | in_production | ready_for_approval |
 *                        approved | published | archived
 *   story_outputs.status draft | generating | ready_for_approval | approved |
 *                        published | failed
 * This module only moves between `in_production`, `ready_for_approval`,
 * `approved` (stories) and `draft` / `approved` (outputs).
 */

import type { ServiceResult } from "./ai-types";
import type { OutputFormat, UUID } from "./types";
import { getServerSupabase, NO_DATABASE_NOTE } from "./db.server";

const noDb = <T>(): ServiceResult<T> => ({
  ok: false,
  error: { code: "provider_not_configured", provider: "studio_storage", message: NO_DATABASE_NOTE },
});

export interface StoryReviewItem {
  storyId: UUID;
  title: string;
  status: string;
  premise: string | null;
  deeperTruth: string | null;
  worldName: string | null;
  createdAt: string | null;
  sceneCount: number;
  scenesApproved: number;
  outputs: { format: OutputFormat; status: string }[];
}

export interface StoryReviewOutcome {
  storyId: UUID;
  storyStatus: string;
  outputStatus: string;
  feedbackId: UUID | null;
}

/** Directed Stories waiting on a human verdict. */
export async function listStoryReviewQueue(): Promise<ServiceResult<StoryReviewItem[]>> {
  const db = getServerSupabase();
  if (!db) return noDb<StoryReviewItem[]>();

  const { data, error } = await db
    .from("stories")
    .select(
      "id, title, status, premise, deeper_truth, created_at, worlds(name), scenes(id, status), story_outputs(format, status)",
    )
    .in("status", ["in_production", "ready_for_approval"])
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    return { ok: false, error: { code: "provider_error", provider: "studio_storage", message: error.message } };
  }

  const items = (data ?? [])
    .map((raw) => {
      const row = raw as Record<string, unknown>;
      const scenes = (row["scenes"] as { status?: string | null }[] | null) ?? [];
      const outputs = (row["story_outputs"] as { format?: string; status?: string }[] | null) ?? [];
      return {
        storyId: row["id"] as UUID,
        title: (row["title"] as string | null) ?? "Untitled Story",
        status: (row["status"] as string | null) ?? "in_production",
        premise: (row["premise"] as string | null) ?? null,
        deeperTruth: (row["deeper_truth"] as string | null) ?? null,
        worldName: ((row["worlds"] as { name?: string | null } | null)?.name) ?? null,
        createdAt: (row["created_at"] as string | null) ?? null,
        sceneCount: scenes.length,
        scenesApproved: scenes.filter((s) => s.status === "approved").length,
        outputs: outputs.map((o) => ({
          format: (o.format ?? "visual_story") as OutputFormat,
          status: o.status ?? "draft",
        })),
      } satisfies StoryReviewItem;
    })
    // Only Stories that have actually been directed can be reviewed as a film.
    .filter((item) => item.sceneCount > 0);

  return { ok: true, data: items };
}

async function loadStory(db: NonNullable<ReturnType<typeof getServerSupabase>>, storyId: UUID) {
  const { data } = await db
    .from("stories")
    .select("id, studio_id, world_id, status")
    .eq("id", storyId)
    .maybeSingle();
  return data;
}

/** Approves a directed Story: the Story and its outputs move to `approved`. */
export async function approveStory(input: {
  storyId: UUID;
  note?: string | null;
}): Promise<ServiceResult<StoryReviewOutcome>> {
  const db = getServerSupabase();
  if (!db) return noDb<StoryReviewOutcome>();

  const story = await loadStory(db, input.storyId);
  if (!story) {
    return {
      ok: false,
      error: { code: "invalid_input", provider: "studio_storage", message: "That Story is not in Studio." },
    };
  }

  const { error } = await db
    .from("stories")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", input.storyId);
  if (error) {
    return { ok: false, error: { code: "provider_error", provider: "studio_storage", message: error.message } };
  }

  await db
    .from("story_outputs")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("story_id", input.storyId);

  await db.from("approvals").insert({
    studio_id: story["studio_id"],
    story_id: input.storyId,
    status: "approved",
    note: input.note?.trim() || null,
  });

  const note = input.note?.trim();
  let feedbackId: UUID | null = null;
  const { classifyFeedback } = await import("./review.server");
  const { data: row } = await db
    .from("creative_feedback")
    .insert({
      studio_id: story["studio_id"],
      world_id: story["world_id"],
      story_id: input.storyId,
      feedback: note || "This Story was approved as directed.",
      classification: note ? classifyFeedback(note) : "story",
      disposition: "approved_pattern",
    })
    .select("id")
    .maybeSingle();
  feedbackId = (row?.["id"] as UUID | undefined) ?? null;

  return {
    ok: true,
    data: { storyId: input.storyId, storyStatus: "approved", outputStatus: "approved", feedbackId },
  };
}

/**
 * Rejects a directed Story: it goes back to `in_production`, its outputs back
 * to `draft`, and the reason becomes durable creative memory.
 */
export async function rejectStory(input: {
  storyId: UUID;
  reason: string;
}): Promise<ServiceResult<StoryReviewOutcome>> {
  const reason = input.reason.trim();
  if (reason.length < 3) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        provider: "studio_storage",
        message: "Say what is wrong — the reason becomes part of the World's creative memory.",
      },
    };
  }

  const db = getServerSupabase();
  if (!db) return noDb<StoryReviewOutcome>();

  const story = await loadStory(db, input.storyId);
  if (!story) {
    return {
      ok: false,
      error: { code: "invalid_input", provider: "studio_storage", message: "That Story is not in Studio." },
    };
  }

  const { error } = await db
    .from("stories")
    .update({ status: "in_production", updated_at: new Date().toISOString() })
    .eq("id", input.storyId);
  if (error) {
    return { ok: false, error: { code: "provider_error", provider: "studio_storage", message: error.message } };
  }

  await db
    .from("story_outputs")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("story_id", input.storyId);

  await db.from("approvals").insert({
    studio_id: story["studio_id"],
    story_id: input.storyId,
    status: "rejected",
    note: reason,
  });

  const { classifyFeedback } = await import("./review.server");
  const { data: row } = await db
    .from("creative_feedback")
    .insert({
      studio_id: story["studio_id"],
      world_id: story["world_id"],
      story_id: input.storyId,
      feedback: reason,
      classification: classifyFeedback(reason),
      disposition: "rejected_pattern",
    })
    .select("id")
    .maybeSingle();

  return {
    ok: true,
    data: {
      storyId: input.storyId,
      storyStatus: "in_production",
      outputStatus: "draft",
      feedbackId: (row?.["id"] as UUID | undefined) ?? null,
    },
  };
}
