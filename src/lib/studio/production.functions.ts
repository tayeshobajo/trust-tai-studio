/**
 * Server-function boundary for production (Runway).
 *
 * Deliberately NOT a generic prompt endpoint: every request is typed to a
 * planned scene / asset generation, so the browser cannot drive arbitrary
 * provider prompts. Models are configured server-side only.
 */

import { createServerFn } from "@tanstack/react-start";

import type { GenerationTask, ServiceResult } from "./ai-types";
import type { UUID } from "./types";

export interface SceneGenerationRequest {
  storyId: UUID | null;
  sceneId: UUID | null;
  worldId: UUID | null;
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

export const generateSceneImage = createServerFn({ method: "POST" })
  .inputValidator((input: SceneGenerationRequest) => input)
  .handler(async ({ data }): Promise<ServiceResult<GenerationTask>> => {
    const { productionEngine } = await import("./runway.server");
    return productionEngine.generateImage(base(data));
  });

export const generateSceneVideo = createServerFn({ method: "POST" })
  .inputValidator((input: SceneVideoRequest) => input)
  .handler(async ({ data }): Promise<ServiceResult<GenerationTask>> => {
    const { productionEngine } = await import("./runway.server");
    const shared = {
      ...base(data),
      ...(data.motionDirection ? { motionDirection: data.motionDirection } : {}),
      ...(typeof data.durationSeconds === "number"
        ? { durationSeconds: data.durationSeconds }
        : {}),
    };
    return data.imageUrl
      ? productionEngine.imageToVideo({ ...shared, imageUrl: data.imageUrl })
      : productionEngine.textToVideo(shared);
  });

export const checkGenerationStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { providerTaskId: string }) => input)
  .handler(async ({ data }): Promise<ServiceResult<GenerationTask>> => {
    const { productionEngine } = await import("./runway.server");
    const result = await productionEngine.checkStatus(data.providerTaskId);
    if (!result.ok) return result;
    // Provider URLs are temporary; durability lands in `studio-assets`.
    const { persistGenerationOutput } = await import("./assets.server");
    if (result.data.status === "succeeded") void (await persistGenerationOutput(result.data));
    return result;
  });
