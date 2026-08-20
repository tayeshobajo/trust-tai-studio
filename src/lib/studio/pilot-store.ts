/**
 * Local pilot state for the one-scene-at-a-time production loop.
 *
 * IMPORTANT: this is BROWSER-LOCAL progress only, held next to the local
 * DirectorPlan so a refresh does not erase a running render. It is NOT durable
 * Studio storage: provider URLs here are temporary previews, and nothing here
 * counts as an approved, canon asset. Durable state lives in `public.assets`
 * and the private `studio-assets` bucket.
 */

import type { AssetKind } from "./ai-types";

export type PilotPhase = "idle" | "submitting" | "running" | "succeeded" | "failed";

export interface PilotTrack {
  phase: PilotPhase;
  /** Provider task id (Runway) for this track. */
  taskId: string | null;
  /** TEMPORARY provider preview URL — expires, never treat as durable. */
  previewUrl: string | null;
  /** Set once the output has been copied into `studio-assets`. */
  storagePath: string | null;
  /** Asset row id in `public.assets`, when the server could record it. */
  assetId: string | null;
  persisted: boolean;
  error: { code: string; message: string } | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ScenePilotState {
  sceneNumber: number;
  image: PilotTrack;
  video: PilotTrack;
  /** Prompt actually compiled and sent, kept for provenance. */
  provenance: {
    imagePrompt: string | null;
    motionPrompt: string | null;
    durationSeconds: number | null;
    ratio: string | null;
  };
}

export const emptyTrack: PilotTrack = {
  phase: "idle",
  taskId: null,
  previewUrl: null,
  storagePath: null,
  assetId: null,
  persisted: false,
  error: null,
  startedAt: null,
  completedAt: null,
};

export const emptyScene = (sceneNumber: number): ScenePilotState => ({
  sceneNumber,
  image: { ...emptyTrack },
  video: { ...emptyTrack },
  provenance: { imagePrompt: null, motionPrompt: null, durationSeconds: null, ratio: null },
});

export type PilotState = Record<number, ScenePilotState>;

const KEY = "trusttai.studio.pilot-runs.v1";

export const pilotStore = {
  read(): PilotState {
    if (typeof window === "undefined") return {};
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as PilotState;
    } catch {
      return {};
    }
  },
  write(state: PilotState) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, JSON.stringify(state));
  },
  clear() {
    if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
  },
};

/** Which track a provider task belongs to. */
export const trackFor = (kind: AssetKind): "image" | "video" =>
  kind === "video" ? "video" : "image";
