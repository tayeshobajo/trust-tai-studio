/**
 * Server-function boundary for production (Runway).
 *
 * Deliberately NOT a generic prompt endpoint: every request is typed to a
 * planned scene / asset generation, so the browser cannot drive arbitrary
 * provider prompts. Models are configured server-side only.
 */

import { createServerFn } from "@tanstack/react-start";

import type {
  AssetKind,
  GenerationTask,
  ServiceResult,
  TrackedGenerationTask,
} from "./ai-types";
import type { UUID } from "./types";

export interface SceneGenerationRequest {
  storyId: UUID | null;
  sceneId: UUID | null;
  worldId: UUID | null;
  studioId?: UUID | null;
  /** Scene number from the director plan; keeps requests tied to a plan. */
  sceneNumber: number;
  /** Prompt composed from the scene direction, not free-form user text. */
  scenePrompt: string;
  aspectRatio?: string;
  referenceImageUrls?: string[];
}

export interface SceneVideoRequest extends SceneGenerationRequest {
  /** Source still for image-to-video. Omit for a text-only shot. */
  imageUrl?: string | null;
  motionDirection?: string;
  durationSeconds?: number;
}

const base = (input: SceneGenerationRequest) => ({
  prompt: input.scenePrompt,
  storyId: input.storyId,
  sceneId: input.sceneId,
  worldId: input.worldId,
  ...(input.aspectRatio ? { aspectRatio: input.aspectRatio } : {}),
  ...(input.referenceImageUrls?.length
    ? { referenceImageUrls: input.referenceImageUrls }
    : {}),
});

/** Shared post-submit path: record the task, mark the scene generating. */
async function track(
  input: SceneGenerationRequest,
  assetType: AssetKind,
  settings: Record<string, unknown>,
  result: ServiceResult<GenerationTask>,
): Promise<ServiceResult<TrackedGenerationTask>> {
  if (!result.ok) return result;
  const { recordGenerationStart } = await import("./production.server");
  return {
    ok: true as const,
    data: await recordGenerationStart({
      task: result.data,
      studioId: input.studioId ?? null,
      sceneNumber: input.sceneNumber,
      assetType,
      generationSettings: settings,
    }),
  };
}

export const generateSceneImage = createServerFn({ method: "POST" })
  .inputValidator((input: SceneGenerationRequest) => input)
  .handler(async ({ data }) => {
    const { productionEngine } = await import("./runway.server");
    const result = await productionEngine.generateImage(base(data));
    return track(
      data,
      "image",
      { aspectRatio: data.aspectRatio ?? null, sceneNumber: data.sceneNumber },
      result,
    );
  });

export const generateSceneVideo = createServerFn({ method: "POST" })
  .inputValidator((input: SceneVideoRequest) => input)
  .handler(async ({ data }) => {
    const { productionEngine } = await import("./runway.server");
    const shared = {
      ...base(data),
      ...(data.motionDirection ? { motionDirection: data.motionDirection } : {}),
      ...(typeof data.durationSeconds === "number"
        ? { durationSeconds: data.durationSeconds }
        : {}),
    };
    const result = data.imageUrl
      ? await productionEngine.imageToVideo({ ...shared, imageUrl: data.imageUrl })
      : await productionEngine.textToVideo(shared);
    return track(
      data,
      "video",
      {
        aspectRatio: data.aspectRatio ?? null,
        durationSeconds: data.durationSeconds ?? null,
        motionDirection: data.motionDirection ?? null,
        sourceImage: data.imageUrl ?? null,
        sceneNumber: data.sceneNumber,
      },
      result,
    );
  });

/**
 * Polls Runway and reconciles the asset row, its scene, and the story status.
 * Idempotent: matching happens on `provider_task_id`.
 */
export const checkGenerationStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { providerTaskId: string }) => input)
  .handler(async ({ data }) => {
    const { productionEngine } = await import("./runway.server");
    const result = await productionEngine.checkStatus(data.providerTaskId);
    if (!result.ok) return result;

    // Provider URLs are temporary; durability lands in `studio-assets`.
    let storagePath: string | null = null;
    if (result.data.status === "succeeded") {
      const { persistGenerationOutput } = await import("./assets.server");
      const durable = await persistGenerationOutput(result.data);
      if (durable.ok) storagePath = durable.data.storagePath;
    }

    const { recordGenerationProgress } = await import("./production.server");
    const tracked: TrackedGenerationTask = await recordGenerationProgress(
      result.data,
      null,
      storagePath,
    );
    return { ok: true as const, data: tracked };
  });

