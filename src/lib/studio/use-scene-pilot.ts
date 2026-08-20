/**
 * Client driver for the one-scene-at-a-time production loop:
 *
 *   Director Plan -> compile prompt -> storyboard image -> poll -> real image
 *                 -> animate (image as start frame) -> poll -> real video
 *
 * The browser never chooses a provider or a model, and never writes a provider
 * prompt: it sends a scene number plus the deterministically compiled prompt.
 * Progress is mirrored into `pilotStore` so a refresh keeps the run visible.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import type { DirectorPlan, SceneDirection, TrackedGenerationTask } from "./ai-types";
import {
  checkGenerationStatus,
  generateSceneImage,
  generateSceneVideo,
} from "./production.functions";
import { approveAsset, rejectGeneratedAsset, requestChanges } from "./review.functions";
import { compileMotionPrompt, compileStoryboardPrompt, sceneContext } from "./scene-prompt";
import {
  emptyScene,
  pilotStore,
  type PilotEvent,
  type PilotReview,
  type PilotState,
  type PilotTrack,
} from "./pilot-store";

const POLL_MS = 6000;
const MAX_POLLS = 100; // ~10 minutes, then we stop and say so.
const STORYBOARD_RATIO = "1920:1080"; // cinematic 16:9, server contract value

type TrackName = "image" | "video";

export function useScenePilot(plan: DirectorPlan) {
  const [state, setState] = useState<PilotState>({});
  const submitImage = useServerFn(generateSceneImage);
  const submitVideo = useServerFn(generateSceneVideo);
  const poll = useServerFn(checkGenerationStatus);
  const approve = useServerFn(approveAsset);
  const reject = useServerFn(rejectGeneratedAsset);
  const askForChanges = useServerFn(requestChanges);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const stateRef = useRef<PilotState>({});

  // Restore persisted pilot progress after hydration.
  useEffect(() => {
    const restored = pilotStore.read();
    stateRef.current = restored;
    setState(restored);
  }, []);

  useEffect(
    () => () => {
      Object.values(timers.current).forEach(clearTimeout);
    },
    [],
  );

  const patch = useCallback(
    (
      sceneNumber: number,
      track: TrackName,
      next: Partial<PilotTrack>,
      provenance?: Partial<ScenePilotProvenance>,
      event?: Omit<PilotEvent, "at">,
    ) => {
      setState((prev) => {
        const scene = prev[sceneNumber] ?? emptyScene(sceneNumber);
        const previous = scene[track];
        const events = event
          ? [...(previous.events ?? []), { ...event, at: new Date().toISOString() }].slice(-12)
          : (previous.events ?? []);
        const updated: PilotState = {
          ...prev,
          [sceneNumber]: {
            ...scene,
            [track]: { ...previous, ...next, events },
            provenance: { ...scene.provenance, ...(provenance ?? {}) },
          },
        };
        stateRef.current = updated;
        pilotStore.write(updated);
        return updated;
      });
    },
    [],
  );

  const applyTracked = useCallback(
    (sceneNumber: number, track: TrackName, tracked: TrackedGenerationTask) => {
      const { task } = tracked;
      const settled = task.status === "succeeded" || task.status === "failed";
      const event: Omit<PilotEvent, "at"> | undefined =
        task.status === "succeeded"
          ? {
              label: tracked.durable
                ? "Returned and stored in Studio"
                : "Returned from the production engine",
              tone: "good",
            }
          : task.status === "failed"
            ? { label: task.failureReason ?? "The provider reported a failed task", tone: "bad" }
            : undefined;
      patch(sceneNumber, track, {
        phase:
          task.status === "succeeded"
            ? "succeeded"
            : task.status === "failed"
              ? "failed"
              : "running",
        taskId: task.provenance.providerTaskId,
        previewUrl: task.outputUrl,
        assetId: tracked.assetId,
        persisted: tracked.persisted,
        durable: tracked.durable,
        storagePath: tracked.storagePath,
        // Prefer Studio's own signed URL once the bytes are stored.
        durableUrl: tracked.durableUrl,
        durabilityNote: tracked.durabilityNote,
        error:
          task.status === "failed"
            ? {
                code: "task_failed",
                message:
                  task.failureReason ?? "The production engine reported a failed task.",
              }
            : null,
        ...(settled ? { completedAt: new Date().toISOString() } : {}),
      }, undefined, event);
      return task.status;
    },
    [patch],
  );

  const schedulePoll = useCallback(
    (sceneNumber: number, track: TrackName, taskId: string, attempt = 0) => {
      const key = `${sceneNumber}:${track}`;
      timers.current[key] = setTimeout(async () => {
        if (attempt >= MAX_POLLS) {
          patch(sceneNumber, track, {
            phase: "failed",
            error: {
              code: "timeout",
              message: "Stopped watching this task — it is taking unusually long.",
            },
          });
          return;
        }
        patch(sceneNumber, track, {
          lastPolledAt: new Date().toISOString(),
          pollCount: (stateRef.current[sceneNumber]?.[track].pollCount ?? 0) + 1,
        });
        let result;
        try {
          result = await poll({ data: { providerTaskId: taskId } });
        } catch {
          patch(sceneNumber, track, {
            phase: "failed",
            error: { code: "network", message: "Studio lost contact with the production engine." },
          });
          return;
        }
        if (!result.ok) {
          patch(sceneNumber, track, {
            phase: "failed",
            error: { code: result.error.code, message: result.error.message },
          });
          return;
        }
        const status = applyTracked(sceneNumber, track, result.data);
        if (status === "queued" || status === "running") {
          schedulePoll(sceneNumber, track, taskId, attempt + 1);
        }
      }, POLL_MS);
    },
    [applyTracked, patch, poll],
  );

  // Resume polling once for tracks that were still running when the page reloaded.
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current || !Object.keys(state).length) return;
    resumed.current = true;
    Object.values(state).forEach((scene) => {
      (["image", "video"] as TrackName[]).forEach((track) => {
        const t = scene[track];
        if ((t.phase === "running" || t.phase === "submitting") && t.taskId) {
          schedulePoll(scene.sceneNumber, track, t.taskId);
        }
      });
    });
  }, [state, schedulePoll]);

  const generateStoryboard = useCallback(
    async (scene: SceneDirection) => {
      const ctx = sceneContext(plan, scene.sceneNumber);
      if (!ctx) return;
      const prompt = compileStoryboardPrompt(ctx);
      patch(
        scene.sceneNumber,
        "image",
        {
          phase: "submitting",
          error: null,
          previewUrl: null,
          taskId: null,
          startedAt: new Date().toISOString(),
          completedAt: null,
        },
        { imagePrompt: prompt, ratio: STORYBOARD_RATIO },
        { label: "Prompt compiled from the direction · sent to the production engine" },
      );

      let result;
      try {
        result = await submitImage({
          data: {
            storyId: plan.storyId ?? null,
            sceneId: scene.sceneId ?? null,
            worldId: null,
            sceneNumber: scene.sceneNumber,
            scenePrompt: prompt,
            aspectRatio: STORYBOARD_RATIO,
          },
        });
      } catch {
        patch(scene.sceneNumber, "image", {
          phase: "failed",
          error: { code: "network", message: "Studio could not reach the production engine." },
        });
        return;
      }
      if (!result.ok) {
        patch(scene.sceneNumber, "image", {
          phase: "failed",
          error: { code: result.error.code, message: result.error.message },
        });
        return;
      }
      const status = applyTracked(scene.sceneNumber, "image", result.data);
      const taskId = result.data.task.provenance.providerTaskId;
      if (taskId) {
        patch(scene.sceneNumber, "image", {}, undefined, {
          label: `Accepted by the production engine · task ${taskId.slice(0, 8)}`,
        });
      }
      if (taskId && (status === "queued" || status === "running")) {
        schedulePoll(scene.sceneNumber, "image", taskId);
      }
    },
    [applyTracked, patch, plan, schedulePoll, submitImage],
  );

  const animateScene = useCallback(
    async (scene: SceneDirection) => {
      const ctx = sceneContext(plan, scene.sceneNumber);
      const imageUrl = stateRef.current[scene.sceneNumber]?.image.previewUrl ?? null;
      if (!ctx || !imageUrl) return;
      const prompt = compileMotionPrompt(ctx);
      patch(
        scene.sceneNumber,
        "video",
        {
          phase: "submitting",
          error: null,
          previewUrl: null,
          taskId: null,
          startedAt: new Date().toISOString(),
          completedAt: null,
        },
        { motionPrompt: prompt, durationSeconds: scene.durationSeconds },
        { label: "Motion compiled · start frame sent to the production engine" },
      );

      let result;
      try {
        result = await submitVideo({
          data: {
            storyId: plan.storyId ?? null,
            sceneId: scene.sceneId ?? null,
            worldId: null,
            sceneNumber: scene.sceneNumber,
            scenePrompt: prompt,
            imageUrl,
            motionDirection: scene.motionDirection,
            durationSeconds: scene.durationSeconds,
          },
        });
      } catch {
        patch(scene.sceneNumber, "video", {
          phase: "failed",
          error: { code: "network", message: "Studio could not reach the production engine." },
        });
        return;
      }
      if (!result.ok) {
        patch(scene.sceneNumber, "video", {
          phase: "failed",
          error: { code: result.error.code, message: result.error.message },
        });
        return;
      }
      const status = applyTracked(scene.sceneNumber, "video", result.data);
      const taskId = result.data.task.provenance.providerTaskId;
      if (taskId) {
        patch(scene.sceneNumber, "video", {}, undefined, {
          label: `Accepted by the production engine · task ${taskId.slice(0, 8)}`,
        });
      }
      if (taskId && (status === "queued" || status === "running")) {
        schedulePoll(scene.sceneNumber, "video", taskId);
      }
    },
    [applyTracked, patch, plan, schedulePoll, submitVideo],
  );

  const setReview = useCallback(
    (sceneNumber: number, track: TrackName, review: Partial<PilotReview>) => {
      const current =
        stateRef.current[sceneNumber]?.[track].review ??
        ({ phase: "idle", note: null, error: null } as PilotReview);
      patch(sceneNumber, track, { review: { ...current, ...review } });
    },
    [patch],
  );

  /** Approve a stored frame to the World. Server refuses non-durable assets. */
  const approveTrack = useCallback(
    async (sceneNumber: number, track: TrackName, note?: string) => {
      const assetId = stateRef.current[sceneNumber]?.[track].assetId;
      if (!assetId) return;
      setReview(sceneNumber, track, { phase: "saving", error: null });
      try {
        const result = await approve({ data: { assetId, note: note ?? null } });
        setReview(
          sceneNumber,
          track,
          result.ok
            ? { phase: "approved", note: note ?? null, error: null }
            : { phase: "failed", error: result.error.message },
        );
      } catch {
        setReview(sceneNumber, track, {
          phase: "failed",
          error: "Studio could not record that approval.",
        });
      }
    },
    [approve, setReview],
  );

  /** Record creative feedback; the scene goes back to ready_to_generate. */
  const requestTrackChanges = useCallback(
    async (sceneNumber: number, track: TrackName, feedback: string) => {
      const assetId = stateRef.current[sceneNumber]?.[track].assetId;
      if (!assetId) return;
      setReview(sceneNumber, track, { phase: "saving", error: null });
      try {
        const result = await askForChanges({ data: { assetId, feedback } });
        setReview(
          sceneNumber,
          track,
          result.ok
            ? { phase: "changes_requested", note: feedback, error: null }
            : { phase: "failed", error: result.error.message },
        );
      } catch {
        setReview(sceneNumber, track, {
          phase: "failed",
          error: "Studio could not record that feedback.",
        });
      }
    },
    [askForChanges, setReview],
  );

  /** Explicit rejection: the asset is out and the scene goes back for a pass. */
  const rejectTrack = useCallback(
    async (sceneNumber: number, track: TrackName, reason?: string) => {
      const assetId = stateRef.current[sceneNumber]?.[track].assetId;
      if (!assetId) return;
      setReview(sceneNumber, track, { phase: "saving", error: null });
      try {
        const result = await reject({ data: { assetId, reason: reason ?? null } });
        setReview(
          sceneNumber,
          track,
          result.ok
            ? { phase: "rejected", note: reason ?? null, error: null }
            : { phase: "failed", error: result.error.message },
        );
        if (result.ok) {
          patch(sceneNumber, track, {}, undefined, { label: "Rejected · scene sent back", tone: "bad" });
        }
      } catch {
        setReview(sceneNumber, track, {
          phase: "failed",
          error: "Studio could not record that rejection.",
        });
      }
    },
    [patch, reject, setReview],
  );

  const reset = useCallback(() => {
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
    stateRef.current = {};
    pilotStore.clear();
    setState({});
  }, []);

  return {
    state,
    generateStoryboard,
    animateScene,
    approveTrack,
    rejectTrack,
    requestTrackChanges,
    reset,
  };
}

interface ScenePilotProvenance {
  imagePrompt: string | null;
  motionPrompt: string | null;
  durationSeconds: number | null;
  ratio: string | null;
}
