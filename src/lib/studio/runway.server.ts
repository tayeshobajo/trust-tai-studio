/**
 * Runway — server-only production adapter.
 *
 * Production engine only: Studio AI decides, Runway renders. This pass builds
 * the typed seam and provenance envelope; no live Runway calls are made yet
 * because the API contract is not established in this repo.
 *
 * RUNWAY_API_KEY is read inside each call, never at module scope, never logged,
 * and never returned to the browser.
 */

import type {
  GenerateImageRequest,
  GenerationProvenance,
  GenerationTask,
  ImageToVideoRequest,
  ServiceResult,
  TextToVideoRequest,
} from "./ai-types";

export interface ProductionEngine {
  readonly id: string;
  generateImage(input: GenerateImageRequest): Promise<ServiceResult<GenerationTask>>;
  imageToVideo(input: ImageToVideoRequest): Promise<ServiceResult<GenerationTask>>;
  textToVideo(input: TextToVideoRequest): Promise<ServiceResult<GenerationTask>>;
  checkStatus(providerTaskId: string): Promise<ServiceResult<GenerationTask>>;
}

const notConfigured = (): ServiceResult<GenerationTask> => ({
  ok: false,
  error: {
    code: "provider_not_configured",
    provider: "runway",
    message:
      "The production engine is not connected. Add the RUNWAY_API_KEY server secret to enable rendering.",
  },
});

const notWired = (operation: string): ServiceResult<GenerationTask> => ({
  ok: false,
  error: {
    code: "provider_error",
    provider: "runway",
    message: `Runway ${operation} is not wired yet. The credential is present; the API contract lands in the production pass.`,
  },
});

const provenanceOf = (
  input: Partial<GenerateImageRequest> & { prompt: string },
): GenerationProvenance => ({
  storyId: input.storyId ?? null,
  sceneId: input.sceneId ?? null,
  worldId: input.worldId ?? null,
  prompt: input.prompt,
  referenceAssetIds: input.referenceAssetIds ?? [],
  provider: "runway",
  providerTaskId: null,
});

/** Reads the credential without ever returning or logging it. */
const credential = (): string | null => process.env["RUNWAY_API_KEY"] ?? null;

/**
 * HTTP seam. Every future Runway request goes through here so the key has
 * exactly one touch point.
 */
async function runwayFetch(
  apiKey: string,
  path: string,
  init: RequestInit,
): Promise<Response> {
  const base = process.env["RUNWAY_API_BASE"] ?? "https://api.dev.runwayml.com/v1";
  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      ...(init.headers ?? {}),
    },
  });
}
void runwayFetch; // reserved for the production pass

export const runwayEngine: ProductionEngine = {
  id: "runway",

  async generateImage(input) {
    if (!credential()) return notConfigured();
    void provenanceOf(input);
    return notWired("image generation");
  },

  async imageToVideo(input) {
    if (!credential()) return notConfigured();
    void provenanceOf(input);
    return notWired("image-to-video");
  },

  async textToVideo(input) {
    if (!credential()) return notConfigured();
    void provenanceOf(input);
    return notWired("text-to-video");
  },

  async checkStatus(providerTaskId) {
    if (!credential()) return notConfigured();
    void providerTaskId;
    return notWired("status checks");
  },
};

export const productionEngine: ProductionEngine = runwayEngine;
