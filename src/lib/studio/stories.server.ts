/**
 * Story persistence — server-only.
 *
 * The real creative loop writes here: Story Discovery becomes a `stories` row
 * with its original source material in `story_sources`, chosen formats become
 * `story_outputs` draft rows, and a Director Plan becomes real `scenes`.
 *
 * Every write uses the resolved Studio/World identity from the database. No
 * fabricated UUIDs, no browser-supplied ownership, no silent success: when the
 * server has no database credentials the caller is told so explicitly.
 */

import type {
  DirectorPlan,
  SceneDirection,
  ServiceResult,
  StoryDiscovery,
} from "./ai-types";
import type { OutputFormat, UUID } from "./types";
import { NO_DATABASE_NOTE, getServerSupabase } from "./db.server";
import { resolveStudioContext } from "./studio-config.server";

export interface PersistedStory {
  storyId: UUID;
  studioId: UUID | null;
  worldId: UUID | null;
  status: string;
  discovery: StoryDiscovery;
}

export interface LoadedStory {
  storyId: UUID;
  title: string;
  status: string;
  discovery: StoryDiscovery;
  plan: DirectorPlan | null;
  outputs: OutputFormat[];
}

const dbError = <T>(message: string): ServiceResult<T> => ({
  ok: false,
  error: { code: "provider_error", provider: "studio_storage", message },
});

const noDb = <T>(): ServiceResult<T> => ({
  ok: false,
  error: {
    code: "provider_not_configured",
    provider: "studio_storage",
    message: NO_DATABASE_NOTE,
  },
});

const text = (v: unknown): string => (typeof v === "string" ? v : "");

function rowToDiscovery(row: Record<string, unknown>): StoryDiscovery {
  return {
    title: text(row["title"]),
    sourceTruth: text(row["source_truth"]),
    deeperHumanTruth: text(row["human_truth"]) || text(row["deeper_truth"]),
    premise: text(row["premise"]),
    whyItMatters: text(row["why_it_matters"]),
    recommendedAngle: text(row["recommended_angle"]),
    suggestedCreativeTreatment: text(row["creative_treatment"]),
  };
}

function rowToScene(row: Record<string, unknown>): SceneDirection {
  const list = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  return {
    sceneNumber: Number(row["scene_number"] ?? 1),
    sceneId: (row["id"] as UUID | undefined) ?? null,
    title: text(row["title"]) || undefined,
    narrativePurpose: text(row["narrative_purpose"]),
    emotion: text(row["emotion"]),
    characterRefs: list(row["character_refs"]),
    setting: text(row["setting"]),
    cameraFraming: text(row["camera_framing"]),
    cameraMovement: text(row["camera_movement"]),
    lighting: text(row["lighting"]),
    wardrobe: text(row["wardrobe"]),
    props: list(row["props"]),
    composition: text(row["composition"]),
    visualMetaphor: text(row["visual_metaphor"]),
    dialogue: (row["dialogue"] as string | null) ?? null,
    narration: (row["narration"] as string | null) ?? null,
    transitionIn: text(row["transition_in"]),
    transitionOut: text(row["transition_out"]),
    motionDirection: text(row["motion_direction"]),
    durationSeconds: Number(row["duration_seconds"] ?? 5),
    requiredAssetType:
      (row["required_asset_type"] as SceneDirection["requiredAssetType"]) ?? "image",
    continuityNotes: text(row["continuity_notes"]),
    directorNotes: text(row["director_notes"]) || undefined,
    status: (row["status"] as SceneDirection["status"]) ?? "planned",
  };
}

/** Creates the Story row plus its original source material. */
export async function createStory(input: {
  discovery: StoryDiscovery;
  sourceText: string;
  sourceKind?: string;
}): Promise<ServiceResult<PersistedStory>> {
  const db = getServerSupabase();
  if (!db) return noDb<PersistedStory>();
  if (!input.discovery?.title?.trim()) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        provider: "studio_storage",
        message: "A Story needs a title before it can be saved.",
      },
    };
  }

  const ctx = await resolveStudioContext();
  const { data, error } = await db
    .from("stories")
    .insert({
      studio_id: ctx.studioId,
      world_id: ctx.worldId,
      title: input.discovery.title.trim(),
      status: "draft",
      source_truth: input.discovery.sourceTruth,
      human_truth: input.discovery.deeperHumanTruth,
      deeper_truth: input.discovery.deeperHumanTruth,
      premise: input.discovery.premise,
      why_it_matters: input.discovery.whyItMatters,
      recommended_angle: input.discovery.recommendedAngle,
      creative_treatment: input.discovery.suggestedCreativeTreatment,
    })
    .select("id, status")
    .single();

  if (error || !data) {
    return dbError<PersistedStory>(
      `Studio could not save this Story${error ? ` (${error.message})` : ""}.`,
    );
  }

  const storyId = data["id"] as UUID;

  if (input.sourceText.trim()) {
    const { error: sourceError } = await db.from("story_sources").insert({
      story_id: storyId,
      source_type: input.sourceKind ?? "text",
      content: input.sourceText.trim(),
      source_room: "studio_create",
      metadata: { capturedAt: new Date().toISOString(), origin: "create_page" },
    });
    if (sourceError) {
      return dbError<PersistedStory>(
        `The Story was saved but its source material was not (${sourceError.message}).`,
      );
    }
  }

  return {
    ok: true,
    data: {
      storyId,
      studioId: ctx.studioId,
      worldId: ctx.worldId,
      status: data["status"] as string,
      discovery: input.discovery,
    },
  };
}

/** Applies the human's edits to a discovered Story. */
export async function updateStory(input: {
  storyId: UUID;
  discovery: StoryDiscovery;
}): Promise<ServiceResult<{ storyId: UUID }>> {
  const db = getServerSupabase();
  if (!db) return noDb<{ storyId: UUID }>();

  const { error } = await db
    .from("stories")
    .update({
      title: input.discovery.title.trim(),
      source_truth: input.discovery.sourceTruth,
      human_truth: input.discovery.deeperHumanTruth,
      deeper_truth: input.discovery.deeperHumanTruth,
      premise: input.discovery.premise,
      why_it_matters: input.discovery.whyItMatters,
      recommended_angle: input.discovery.recommendedAngle,
      creative_treatment: input.discovery.suggestedCreativeTreatment,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.storyId);
  if (error) return dbError(`Studio could not save your changes (${error.message}).`);
  return { ok: true, data: { storyId: input.storyId } };
}

/** Records the chosen formats as draft outputs of one Story. */
export async function saveOutputs(input: {
  storyId: UUID;
  formats: OutputFormat[];
}): Promise<ServiceResult<{ formats: OutputFormat[] }>> {
  const db = getServerSupabase();
  if (!db) return noDb<{ formats: OutputFormat[] }>();

  const { data: existing, error: readError } = await db
    .from("story_outputs")
    .select("id, format")
    .eq("story_id", input.storyId);
  if (readError) return dbError(`Studio could not read this Story's outputs (${readError.message}).`);

  const have = new Set((existing ?? []).map((r) => r["format"] as string));
  const missing = input.formats.filter((f) => !have.has(f));
  if (missing.length) {
    const { error } = await db
      .from("story_outputs")
      .insert(missing.map((format) => ({ story_id: input.storyId, format, status: "draft" })));
    if (error) return dbError(`Studio could not save the selected outputs (${error.message}).`);
  }

  const dropped = (existing ?? [])
    .filter((r) => !input.formats.includes(r["format"] as OutputFormat))
    .map((r) => r["id"] as UUID);
  if (dropped.length) {
    await db.from("story_outputs").delete().in("id", dropped);
  }

  return { ok: true, data: { formats: input.formats } };
}

/** Persists a Director Plan as real scenes and moves the Story into production. */
export async function saveDirectorPlan(input: {
  storyId: UUID;
  plan: DirectorPlan;
}): Promise<ServiceResult<{ storyId: UUID; scenes: SceneDirection[] }>> {
  const db = getServerSupabase();
  if (!db) return noDb<{ storyId: UUID; scenes: SceneDirection[] }>();
  if (!input.plan.scenes?.length) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        provider: "studio_storage",
        message: "The Director Plan has no scenes, so nothing was saved.",
      },
    };
  }

  // Re-direction replaces the plan wholesale: scenes are one film, not a pile.
  const { error: clearError } = await db.from("scenes").delete().eq("story_id", input.storyId);
  if (clearError) {
    return dbError(`Studio could not replace the previous scenes (${clearError.message}).`);
  }

  const rows = input.plan.scenes.map((scene) => ({
    story_id: input.storyId,
    scene_number: scene.sceneNumber,
    title: scene.title ?? null,
    narrative_purpose: scene.narrativePurpose,
    emotion: scene.emotion,
    character_refs: scene.characterRefs ?? [],
    setting: scene.setting,
    camera_framing: scene.cameraFraming,
    camera_movement: scene.cameraMovement,
    lighting: scene.lighting,
    wardrobe: scene.wardrobe,
    props: scene.props ?? [],
    composition: scene.composition,
    visual_metaphor: scene.visualMetaphor,
    dialogue: scene.dialogue,
    narration: scene.narration,
    transition_in: scene.transitionIn,
    transition_out: scene.transitionOut,
    motion_direction: scene.motionDirection,
    duration_seconds: scene.durationSeconds,
    required_asset_type: scene.requiredAssetType,
    continuity_notes: scene.continuityNotes,
    director_notes: scene.directorNotes ?? null,
    status: "ready_to_generate",
  }));

  const { data: inserted, error } = await db.from("scenes").insert(rows).select("*");
  if (error || !inserted) {
    return dbError(`Studio could not save the scenes${error ? ` (${error.message})` : ""}.`);
  }

  const { error: storyError } = await db
    .from("stories")
    .update({
      status: "in_production",
      director_plan: input.plan as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.storyId);
  if (storyError) {
    return dbError(`The scenes were saved but the Story status was not (${storyError.message}).`);
  }

  const { data: filmOutput } = await db
    .from("story_outputs")
    .select("id")
    .eq("story_id", input.storyId)
    .eq("format", "cinematic_film")
    .maybeSingle();
  if (filmOutput?.["id"]) {
    await db
      .from("story_outputs")
      .update({
        // Status vocabulary is constrained; direction readiness lives in metadata.
        metadata: { direction: "ready", scenes: rows.length, directedAt: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      })
      .eq("id", filmOutput["id"] as UUID);
  } else {
    await db.from("story_outputs").insert({
      story_id: input.storyId,
      format: "cinematic_film",
      status: "draft",
      metadata: { direction: "ready", scenes: rows.length, directedAt: new Date().toISOString() },
    });
  }

  const scenes = (inserted as Record<string, unknown>[])
    .map(rowToScene)
    .sort((a, b) => a.sceneNumber - b.sceneNumber);

  return { ok: true, data: { storyId: input.storyId, scenes } };
}

/** Reads a persisted Story with its scenes for the production room. */
export async function loadStory(storyId: UUID): Promise<ServiceResult<LoadedStory>> {
  const db = getServerSupabase();
  if (!db) return noDb<LoadedStory>();

  const { data: story, error } = await db
    .from("stories")
    .select("*")
    .eq("id", storyId)
    .maybeSingle();
  if (error) return dbError<LoadedStory>(`Studio could not read this Story (${error.message}).`);
  if (!story) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        provider: "studio_storage",
        message: "That Story no longer exists in Studio.",
      },
    };
  }

  const [{ data: sceneRows }, { data: outputRows }] = await Promise.all([
    db.from("scenes").select("*").eq("story_id", storyId).order("scene_number"),
    db.from("story_outputs").select("format").eq("story_id", storyId),
  ]);

  const scenes = (sceneRows ?? []).map((r) => rowToScene(r as Record<string, unknown>));
  const storedPlan = story["director_plan"] as Partial<DirectorPlan> | null;

  const plan: DirectorPlan | null = scenes.length
    ? {
        storyId,
        filmIntent: storedPlan?.filmIntent ?? text(story["premise"]),
        emotionalArc: storedPlan?.emotionalArc ?? text(story["human_truth"]),
        visualArc: storedPlan?.visualArc ?? text(story["creative_treatment"]),
        pacing: storedPlan?.pacing ?? "Unhurried, editorial",
        continuityRules: storedPlan?.continuityRules ?? [],
        beats: storedPlan?.beats ?? [],
        scenes,
      }
    : null;

  return {
    ok: true,
    data: {
      storyId,
      title: text(story["title"]),
      status: text(story["status"]),
      discovery: rowToDiscovery(story as Record<string, unknown>),
      plan,
      outputs: (outputRows ?? []).map((r) => r["format"] as OutputFormat),
    },
  };
}

/** Test-only cleanup used by smoke tests; safe because it cascades by story. */
export async function deleteStory(storyId: UUID): Promise<boolean> {
  const db = getServerSupabase();
  if (!db) return false;
  const { error } = await db.from("stories").delete().eq("id", storyId);
  return !error;
}
