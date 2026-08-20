/**
 * Trust Tai Studio — intelligence & production contracts.
 *
 * Client-safe: types only, no secrets, no provider SDKs. Both the browser and
 * the server-only modules import from here so the wire shape stays honest.
 */

import type { OutputFormat, UUID } from "./types";

/* ---------------- shared result envelope ---------------- */

export type ServiceErrorCode =
  | "provider_not_configured"
  | "provider_error"
  | "invalid_input"
  | "rate_limited";

export interface ServiceError {
  code: ServiceErrorCode;
  /** Human-readable, safe to show. Never contains credentials or raw provider payloads. */
  message: string;
  /** Which provider the failure belongs to, for honest UI states. */
  provider: "studio_ai" | "runway";
}

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: ServiceError };

/* ---------------- Studio AI: Story Discovery ---------------- */

export interface WorldContext {
  name: string;
  canonVersion: string;
  /** Compiled creative rules / anti-drift lines, if the World has any yet. */
  creativeRules?: string[];
}

export interface StoryDiscoveryRequest {
  sourceText: string;
  world: WorldContext;
  requestedOutputs: OutputFormat[];
}

export interface StoryDiscovery {
  title: string;
  sourceTruth: string;
  deeperHumanTruth: string;
  premise: string;
  whyItMatters: string;
  recommendedAngle: string;
  suggestedCreativeTreatment: string;
}

/* ---------------- Studio AI: director contract ---------------- */

export type SceneStatus =
  | "planned"
  | "ready_to_generate"
  | "generating"
  | "review"
  | "approved";

export type AssetKind = "image" | "video" | "audio";

export interface StoryBeat {
  index: number;
  title: string;
  purpose: string;
  emotion: string;
  sceneNumbers: number[];
}

export interface SceneDirection {
  sceneNumber: number;
  narrativePurpose: string;
  emotion: string;
  characterRefs: string[];
  setting: string;
  cameraFraming: string;
  cameraMovement: string;
  lighting: string;
  wardrobe: string;
  props: string[];
  composition: string;
  visualMetaphor: string;
  dialogue: string | null;
  narration: string | null;
  transitionIn: string;
  transitionOut: string;
  motionDirection: string;
  durationSeconds: number;
  requiredAssetType: AssetKind;
  continuityNotes: string;
  status?: SceneStatus;
}

export interface DirectorPlan {
  storyId?: UUID;
  filmIntent: string;
  emotionalArc: string;
  visualArc: string;
  pacing: string;
  continuityRules: string[];
  beats: StoryBeat[];
  scenes: SceneDirection[];
}

export interface DirectorPlanRequest {
  discovery: StoryDiscovery;
  world: WorldContext;
  targetDurationSeconds?: number;
}

/* ---------------- Runway: production engine ---------------- */

export interface GenerationProvenance {
  storyId: UUID | null;
  sceneId: UUID | null;
  worldId: UUID | null;
  prompt: string;
  referenceAssetIds: UUID[];
  provider: "runway";
  providerTaskId: string | null;
}

export interface GenerationTask {
  provenance: GenerationProvenance;
  status: "queued" | "running" | "succeeded" | "failed";
  outputUrl: string | null;
}

export interface GenerateImageRequest {
  prompt: string;
  storyId?: UUID | null;
  sceneId?: UUID | null;
  worldId?: UUID | null;
  referenceAssetIds?: UUID[];
  aspectRatio?: string;
}

export interface ImageToVideoRequest extends GenerateImageRequest {
  imageUrl: string;
  durationSeconds?: number;
  motionDirection?: string;
}

export interface TextToVideoRequest extends GenerateImageRequest {
  durationSeconds?: number;
  motionDirection?: string;
}
