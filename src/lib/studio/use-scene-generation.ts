/**
 * Client-side driver for scene generation.
 *
 * Composes the Runway prompt from the SceneDirection (never free-form user
 * text), submits it through the typed server functions, then polls status
 * until the provider settles. All persistence happens server-side.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import type { DirectorPlan, SceneDirection, TrackedGenerationTask } from "./ai-types";
import {
  checkGenerationStatus,
  generateSceneImage,
  generateSceneVideo,
} from "./production.functions";

export interface SceneRun {
  phase: "idle" | "submitting" | "running" | "succeeded" | "failed";
  providerTaskId: string | null;
  outputUrl: string | null;
  /** Honest surface for provider or persistence problems. */
  message: string | null;
  persisted: boolean;
}

const idle: SceneRun = {
  phase: "idle",
  providerTaskId: null,
  outputUrl: null,
  message: null,
  persisted: false,
};

/** Prompt is derived from direction fields, so the browser cannot free-type it. */
export function composeScenePrompt(scene: SceneDirection, plan: DirectorPlan): string {
  return [
    scene.narrativePurpose,
    scene.setting,
    `${scene.cameraFraming}, ${scene.cameraMovement}`,
    scene.lighting,
    scene.wardrobe && `Wardrobe: ${scene.wardrobe}`,
    scene.props.length ? `Props: ${scene.props.join(", ")}` : "",
    scene.composition,
    scene.visualMetaphor,
    `Emotion: ${scene.emotion}`,
    plan.visualArc,
    scene.continuityNotes,
  ]
    .filter(Boolean)
    .join(". ");
}

export function useSceneGeneration(plan: DirectorPlan, storyId: string | null) {
  const [runs, setRuns] = useState<Record<number, SceneRun>>({});
  const submitImage = useServerFn(generateSceneImage);
  const submitVideo = useServerFn(generateSceneVideo);
  const poll = useServerFn(checkGenerationStatus);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(
    () => () => {
      Object.values(timers.current).forEach(clearTimeout);
    },
    [],
  );

  const set = useCallback((sceneNumber: number, patch: Partial<SceneRun>) => {
    setRuns((prev) => ({ ...prev, [sceneNumber]: { ...(prev[sceneNumber] ?? idle), ...patch } }));
  }, []);

  const applyTracked = useCallback(
    (sceneNumber: number, tracked: TrackedGenerationTask) => {
      const { task } = tracked;
      set(sceneNumber, {
        phase:
          task.status === "succeeded"
            ? "succeeded"
            : task.status === "failed"
              ? "failed"
              : "running",
        providerTaskId: task.provenance.providerTaskId,
        outputUrl: task.outputUrl,
        persisted: tracked.persisted,
        message: tracked.persistenceNote,
      });
      return task.status;
    },
    [set],
  );

  const schedulePoll = useCallback(
    (sceneNumber: number, providerTaskId: string) => {
      timers.current[sceneNumber] = setTimeout(async () => {
        const result = await poll({ data: { providerTaskId } });
        if (!result.ok) {
          set(sceneNumber, { phase: "failed", message: result.error.message });
          return;
        }
        const status = applyTracked(sceneNumber, result.data);
        if (status === "queued" || status === "running") {
          schedulePoll(sceneNumber, providerTaskId);
        }
      }, 5000);
    },
    [applyTracked, poll, set],
  );

  const start = useCallback(
    async (scene: SceneDirection) => {
      set(scene.sceneNumber, { ...idle, phase: "submitting" });
      const request = {
        storyId: storyId ?? plan.storyId ?? null,
        sceneId: null,
        worldId: null,
        sceneNumber: scene.sceneNumber,
        scenePrompt: composeScenePrompt(scene, plan),
      };

      const result =
        scene.requiredAssetType === "video"
          ? await submitVideo({
              data: {
                ...request,
                motionDirection: scene.motionDirection,
                durationSeconds: scene.durationSeconds,
              },
            })
          : await submitImage({ data: request });

      if (!result.ok) {
        set(scene.sceneNumber, { phase: "failed", message: result.error.message });
        return;
      }
      const status = applyTracked(scene.sceneNumber, result.data);
      const taskId = result.data.task.provenance.providerTaskId;
      if (taskId && (status === "queued" || status === "running")) {
        schedulePoll(scene.sceneNumber, taskId);
      }
    },
    [applyTracked, plan, schedulePoll, set, storyId, submitImage, submitVideo],
  );

  return { runs, start };
}
