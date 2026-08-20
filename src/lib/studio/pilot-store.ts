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

/** One entry in the visible generation timeline for a track. */
export interface PilotEvent {
  /** Short editorial label, e.g. "Sent to the production engine". */
  label: string;
  /** ISO timestamp of when it happened. */
  at: string;
  tone?: "neutral" | "good" | "bad";
}

export interface PilotTrack {
  phase: PilotPhase;
  /** Provider task id (Runway) for this track. */
  taskId: string | null;
  /** TEMPORARY provider preview URL — expires, never treat as durable. */
  previewUrl: string | null;
  /** Set once the output has been copied into `studio-assets`. */
  storagePath: string | null;
  /** True only when the bytes are in Studio storage, not just the provider. */
  durable: boolean;
  /** Short-lived signed URL from Studio storage; prefer it over previewUrl. */
  durableUrl: string | null;
  /** Honest reason durability has not happened yet. */
  durabilityNote: string | null;
  /** Review state for this track (approvals + creative feedback). */
  review: PilotReview;
  /** Asset row id in `public.assets`, when the server could record it. */
  assetId: string | null;
  persisted: boolean;
  error: { code: string; message: string } | null;
  startedAt: string | null;
  completedAt: string | null;
  /** Visible timeline of what actually happened, newest last. */
  events: PilotEvent[];
  /** How many times the browser has asked the provider for a status. */
  pollCount: number;
  lastPolledAt: string | null;
}

export interface PilotReview {
  phase: "idle" | "saving" | "approved" | "changes_requested" | "rejected" | "failed";
  note: string | null;
  error: string | null;
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
  durable: false,
  durableUrl: null,
  durabilityNote: null,
  review: { phase: "idle", note: null, error: null },
  assetId: null,
  persisted: false,
  error: null,
  startedAt: null,
  completedAt: null,
  events: [],
  pollCount: 0,
  lastPolledAt: null,

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
