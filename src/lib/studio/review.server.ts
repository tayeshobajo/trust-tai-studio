/**
 * Review — server-only. Approvals and creative feedback for generated assets.
 *
 * House rules enforced here, not in the browser:
 *   - An asset can only be approved to the World once it is DURABLE, i.e. its
 *     bytes live in `studio-assets` and `assets.storage_path` is set. Provider
 *     previews expire, so approving one would approve nothing.
 *   - Requesting changes writes durable creative memory (`creative_feedback`)
 *     and sends the scene back to `ready_to_generate`.
 */

import type { ReviewOutcome, SceneStatus, ServiceResult } from "./ai-types";
import type { UUID } from "./types";
import { getServerSupabase, NO_DATABASE_NOTE } from "./db.server";

const noDb = (): ServiceResult<ReviewOutcome> => ({
  ok: false,
  error: { code: "provider_not_configured", provider: "studio_storage", message: NO_DATABASE_NOTE },
});

/**
 * Deterministic, server-side classification of a review note. The producer is
 * never asked to categorise their own feedback; we infer it so the memory is
 * usable later, and fall back to `other` rather than guessing.
 */
export function classifyFeedback(text: string): "visual" | "continuity" | "story" | "world" | "other" {
  const t = text.toLowerCase();
  if (/\b(continuity|the same|changed|different (face|person)|character (changed|is)|wardrobe|outfit|prop)\b/.test(t))
    return "continuity";
  if (/\b(camera|light(ing)?|colou?r|frame|framing|composition|shot|angle|move|moving|left to right|texture|grain)\b/.test(t))
    return "visual";
  if (/\b(world|canon|trust tai|brand|feel like|tone|doesn'?t feel|does not feel)\b/.test(t)) return "world";
  if (/\b(story|opening|reveal|reveals|lesson|pacing|explain(s|ing)?|discover|ending|beat)\b/.test(t))
    return "story";
  return "other";
}

async function reconcileStory(
  db: NonNullable<ReturnType<typeof getServerSupabase>>,
  storyId: UUID | null,
): Promise<string | null> {
  if (!storyId) return null;
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

async function loadAsset(
  db: NonNullable<ReturnType<typeof getServerSupabase>>,
  assetId: UUID,
) {
  const { data } = await db
    .from("assets")
    .select("id, studio_id, story_id, scene_id, world_id, storage_path, status")
    .eq("id", assetId)
    .maybeSingle();
  return data;
}

export async function approveAssetToWorld(input: {
  assetId: UUID;
  note?: string | null;
}): Promise<ServiceResult<ReviewOutcome>> {
  const db = getServerSupabase();
  if (!db) return noDb();

  const asset = await loadAsset(db, input.assetId);
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
        message:
          "This frame is still a provider preview. It has to be stored in Studio before it can be approved to the World.",
      },
    };
  }

  const storyId = (asset["story_id"] as UUID | null) ?? null;
  const sceneId = (asset["scene_id"] as UUID | null) ?? null;

  const { data: approval, error: approvalError } = await db
    .from("approvals")
    .insert({
      studio_id: asset["studio_id"],
      story_id: storyId,
      scene_id: sceneId,
      asset_id: input.assetId,
      status: "approved",
      note: input.note ?? null,
    })
    .select("id")
    .maybeSingle();

  if (approvalError) {
    return {
      ok: false,
      error: { code: "provider_error", provider: "studio_storage", message: approvalError.message },
    };
  }

  await db.from("assets").update({ status: "ready", is_canon: true }).eq("id", input.assetId);

  let sceneStatus: SceneStatus | null = null;
  if (sceneId) {
    sceneStatus = "approved";
    await db
      .from("scenes")
      .update({ status: sceneStatus, updated_at: new Date().toISOString() })
      .eq("id", sceneId);
  }

  return {
    ok: true,
    data: {
      assetId: input.assetId,
      approvalId: (approval?.["id"] as UUID | undefined) ?? null,
      feedbackId: null,
      assetStatus: "approved",
      sceneStatus,
      storyStatus: await reconcileStory(db, storyId),
      isCanon: true,
    },
  };
}

export async function requestSceneChanges(input: {
  assetId: UUID;
  feedback: string;
}): Promise<ServiceResult<ReviewOutcome>> {
  const trimmed = input.feedback.trim();
  if (trimmed.length < 3) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        provider: "studio_storage",
        message: "Say what should change — the note becomes part of the World's creative memory.",
      },
    };
  }

  const db = getServerSupabase();
  if (!db) return noDb();

  const asset = await loadAsset(db, input.assetId);
  if (!asset) {
    return {
      ok: false,
      error: { code: "invalid_input", provider: "studio_storage", message: "That asset is not in Studio." },
    };
  }

  const storyId = (asset["story_id"] as UUID | null) ?? null;
  const sceneId = (asset["scene_id"] as UUID | null) ?? null;

  const { data: feedbackRow, error } = await db
    .from("creative_feedback")
    .insert({
      studio_id: asset["studio_id"],
      world_id: asset["world_id"],
      story_id: storyId,
      scene_id: sceneId,
      asset_id: input.assetId,
      feedback: trimmed,
      disposition: "changes_requested",
    })
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: { code: "provider_error", provider: "studio_storage", message: error.message } };
  }

  await db.from("approvals").insert({
    studio_id: asset["studio_id"],
    story_id: storyId,
    scene_id: sceneId,
    asset_id: input.assetId,
    status: "changes_requested",
    note: trimmed,
  });

  let sceneStatus: SceneStatus | null = null;
  if (sceneId) {
    sceneStatus = "ready_to_generate";
    await db
      .from("scenes")
      .update({ status: sceneStatus, updated_at: new Date().toISOString() })
      .eq("id", sceneId);
  }

  return {
    ok: true,
    data: {
      assetId: input.assetId,
      approvalId: null,
      feedbackId: (feedbackRow?.["id"] as UUID | undefined) ?? null,
      assetStatus: "ready",
      sceneStatus,
      storyStatus: await reconcileStory(db, storyId),
      isCanon: false,
    },
  };
}

/**
 * Explicit rejection: the asset is out. Unlike "request changes", this is a
 * verdict on the asset itself — it is marked rejected (never canon), the scene
 * goes back to `ready_to_generate`, and the story status is recomputed.
 */
export async function rejectAsset(input: {
  assetId: UUID;
  reason?: string | null;
}): Promise<ServiceResult<ReviewOutcome>> {
  const db = getServerSupabase();
  if (!db) return noDb();

  const asset = await loadAsset(db, input.assetId);
  if (!asset) {
    return {
      ok: false,
      error: { code: "invalid_input", provider: "studio_storage", message: "That asset is not in Studio." },
    };
  }

  const storyId = (asset["story_id"] as UUID | null) ?? null;
  const sceneId = (asset["scene_id"] as UUID | null) ?? null;
  const reason = input.reason?.trim() ?? null;

  const { data: approval, error } = await db
    .from("approvals")
    .insert({
      studio_id: asset["studio_id"],
      story_id: storyId,
      scene_id: sceneId,
      asset_id: input.assetId,
      status: "rejected",
      note: reason,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: { code: "provider_error", provider: "studio_storage", message: error.message } };
  }

  let feedbackId: UUID | null = null;
  if (reason) {
    const { data: feedbackRow } = await db
      .from("creative_feedback")
      .insert({
        studio_id: asset["studio_id"],
        world_id: asset["world_id"],
        story_id: storyId,
        scene_id: sceneId,
        asset_id: input.assetId,
        feedback: reason,
        disposition: "rejected",
      })
      .select("id")
      .maybeSingle();
    feedbackId = (feedbackRow?.["id"] as UUID | undefined) ?? null;
  }

  await db.from("assets").update({ status: "rejected", is_canon: false }).eq("id", input.assetId);

  let sceneStatus: SceneStatus | null = null;
  if (sceneId) {
    sceneStatus = "ready_to_generate";
    await db
      .from("scenes")
      .update({ status: sceneStatus, updated_at: new Date().toISOString() })
      .eq("id", sceneId);
  }

  return {
    ok: true,
    data: {
      assetId: input.assetId,
      approvalId: (approval?.["id"] as UUID | undefined) ?? null,
      feedbackId,
      assetStatus: "rejected",
      sceneStatus,
      storyStatus: await reconcileStory(db, storyId),
      isCanon: false,
    },
  };
}

