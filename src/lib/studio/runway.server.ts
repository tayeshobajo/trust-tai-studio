/**
 * Runway — server-only production adapter.
 *
 * Production engine only: Studio AI decides, Runway renders.
 *
 * RUNWAY_API_KEY is read inside each call, never at module scope, never logged,
 * and never returned to the browser. Provider response bodies are never logged.
 *
 * ASSET DURABILITY: Runway output URLs are TEMPORARY (short-lived signed URLs).
 * Nothing in the product may treat `outputUrl` as permanent — see
 * `persistGenerationOutput` in `./assets.server` for the durability seam that
 * copies successful outputs into the private `studio-assets` bucket.
 */

import type {
  GenerateImageRequest,
  GenerationProvenance,
  GenerationTask,
  ImageToVideoRequest,
  ServiceError,
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

const RUNWAY_VERSION = "2024-11-06";
const DEFAULT_IMAGE_MODEL = "gen4_image";
const DEFAULT_VIDEO_MODEL = "gen4.5";
const DEFAULT_IMAGE_RATIO = "1920:1080";
const DEFAULT_VIDEO_RATIO = "1280:720";

const fail = (error: ServiceError): ServiceResult<GenerationTask> => ({ ok: false, error });

const notConfigured = () =>
  fail({
    code: "provider_not_configured",
    provider: "runway",
    message:
      "The production engine is not connected. Add the RUNWAY_API_KEY server secret to enable rendering.",
  });

const providerError = (message: string) =>
  fail({ code: "provider_error", provider: "runway", message });

const provenanceOf = (
  input: Partial<GenerateImageRequest> & { prompt: string },
  providerTaskId: string | null = null,
): GenerationProvenance => ({
  storyId: input.storyId ?? null,
  sceneId: input.sceneId ?? null,
  worldId: input.worldId ?? null,
  prompt: input.prompt,
  referenceAssetIds: input.referenceAssetIds ?? [],
  provider: "runway",
  providerTaskId,
});

/** Reads the credential without ever returning or logging it. */
const credential = (): string | null => process.env["RUNWAY_API_KEY"] ?? null;

const imageModel = () => process.env["RUNWAY_IMAGE_MODEL"] ?? DEFAULT_IMAGE_MODEL;
const videoModel = () => process.env["RUNWAY_VIDEO_MODEL"] ?? DEFAULT_VIDEO_MODEL;

/** Single touch point for the credential; every Runway request goes through here. */
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
      "X-Runway-Version": RUNWAY_VERSION,
      ...(init.headers ?? {}),
    },
  });
}

/** Maps a transport/HTTP failure to a safe, typed error. Never includes the body. */
function errorForStatus(status: number): ServiceError {
  if (status === 401 || status === 403) {
    return {
      code: "provider_not_configured",
      provider: "runway",
      message:
        "The production engine rejected the credential. Check the RUNWAY_API_KEY server secret.",
    };
  }
  if (status === 429) {
    return {
      code: "rate_limited",
      provider: "runway",
      message: "The production engine is rate limited right now. Try again in a moment.",
    };
  }
  if (status === 400 || status === 422) {
    return {
      code: "invalid_input",
      provider: "runway",
      message: "The production engine rejected this generation request as invalid.",
    };
  }
  return {
    code: "provider_error",
    provider: "runway",
    message: `The production engine returned an unexpected error (status ${status}).`,
  };
}

type RunwayTaskResponse = {
  id?: unknown;
  status?: unknown;
  output?: unknown;
  failure?: unknown;
};

function normalizeStatus(raw: unknown): GenerationTask["status"] | null {
  switch (String(raw ?? "").toUpperCase()) {
    case "PENDING":
    case "THROTTLED":
      return "queued";
    case "RUNNING":
      return "running";
    case "SUCCEEDED":
      return "succeeded";
    case "FAILED":
    case "CANCELED":
    case "CANCELLED":
      return "failed";
    default:
      return null;
  }
}

function firstOutputUrl(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    const first = output[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && typeof (first as { url?: unknown }).url === "string") {
      return (first as { url: string }).url;
    }
  }
  return null;
}

/** POSTs a task and returns the normalized queued task, or a safe typed error. */
async function submitTask(
  path: string,
  body: Record<string, unknown>,
  provenanceInput: Partial<GenerateImageRequest> & { prompt: string },
): Promise<ServiceResult<GenerationTask>> {
  const apiKey = credential();
  if (!apiKey) return notConfigured();
  if (!provenanceInput.prompt?.trim()) {
    return fail({
      code: "invalid_input",
      provider: "runway",
      message: "A prompt is required before the production engine can render.",
    });
  }

  let response: Response;
  try {
    response = await runwayFetch(apiKey, path, { method: "POST", body: JSON.stringify(body) });
  } catch {
    return providerError("Could not reach the production engine.");
  }

  if (!response.ok) return fail(errorForStatus(response.status));

  let json: RunwayTaskResponse;
  try {
    json = (await response.json()) as RunwayTaskResponse;
  } catch {
    return providerError("The production engine returned a malformed response.");
  }

  const taskId = typeof json.id === "string" ? json.id : null;
  if (!taskId) return providerError("The production engine did not return a task id.");

  return {
    ok: true,
    data: {
      provenance: provenanceOf(provenanceInput, taskId),
      status: normalizeStatus(json.status) ?? "queued",
      outputUrl: null,
    },
  };
}

export const runwayEngine: ProductionEngine = {
  id: "runway",

  /** POST /text_to_image */
  async generateImage(input) {
    const body: Record<string, unknown> = {
      model: imageModel(),
      promptText: input.prompt,
      ratio: input.aspectRatio ?? DEFAULT_IMAGE_RATIO,
    };
    if (input.referenceImageUrls?.length) {
      body["referenceImages"] = input.referenceImageUrls.map((uri, i) => ({
        uri,
        tag: `ref${i + 1}`,
      }));
    }
    return submitTask("/text_to_image", body, input);
  },

  /** POST /image_to_video */
  async imageToVideo(input) {
    return submitTask(
      "/image_to_video",
      {
        model: videoModel(),
        promptImage: input.imageUrl,
        promptText: [input.prompt, input.motionDirection].filter(Boolean).join(" "),
        ratio: input.aspectRatio ?? DEFAULT_VIDEO_RATIO,
        duration: input.durationSeconds ?? 5,
      },
      input,
    );
  },

  /** POST /image_to_video without promptImage (text-only on compatible models). */
  async textToVideo(input) {
    return submitTask(
      "/image_to_video",
      {
        model: videoModel(),
        promptText: [input.prompt, input.motionDirection].filter(Boolean).join(" "),
        ratio: input.aspectRatio ?? DEFAULT_VIDEO_RATIO,
        duration: input.durationSeconds ?? 5,
      },
      input,
    );
  },

  /** GET /tasks/{id} */
  async checkStatus(providerTaskId) {
    const apiKey = credential();
    if (!apiKey) return notConfigured();
    if (!providerTaskId) {
      return fail({
        code: "invalid_input",
        provider: "runway",
        message: "A provider task id is required to check generation status.",
      });
    }

    let response: Response;
    try {
      response = await runwayFetch(apiKey, `/tasks/${encodeURIComponent(providerTaskId)}`, {
        method: "GET",
      });
    } catch {
      return providerError("Could not reach the production engine.");
    }

    if (!response.ok) return fail(errorForStatus(response.status));

    let json: RunwayTaskResponse;
    try {
      json = (await response.json()) as RunwayTaskResponse;
    } catch {
      return providerError("The production engine returned a malformed response.");
    }

    const status = normalizeStatus(json.status);
    if (!status) return providerError("The production engine returned an unknown task status.");

    return {
      ok: true,
      data: {
        provenance: provenanceOf({ prompt: "" }, providerTaskId),
        status,
        // TEMPORARY URL — durable only once copied into `studio-assets`.
        outputUrl: status === "succeeded" ? firstOutputUrl(json.output) : null,
      },
    };
  },
};

export const productionEngine: ProductionEngine = runwayEngine;
