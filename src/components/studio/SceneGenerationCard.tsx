/**
 * Progress + honest error surface for a single typed scene generation.
 */

import { AlertCircle, Check, Clapperboard, Image as ImageIcon, Loader2 } from "lucide-react";

import type { SceneDirection } from "@/lib/studio/ai-types";
import type { SceneRun } from "@/lib/studio/use-scene-generation";
import { cn } from "@/lib/utils";

const idleRun: SceneRun = {
  phase: "idle",
  providerTaskId: null,
  outputUrl: null,
  message: null,
  errorCode: null,
  persisted: false,
};

const phaseLabel: Record<SceneRun["phase"], string> = {
  idle: "Not started",
  submitting: "Sending to the production engine…",
  running: "Rendering…",
  succeeded: "Render complete",
  failed: "Render failed",
};

const phaseWidth: Record<SceneRun["phase"], string> = {
  idle: "w-0",
  submitting: "w-1/4",
  running: "w-2/3",
  succeeded: "w-full",
  failed: "w-full",
};

/** Typed, human-readable headline per failure class. */
function errorHeadline(run: SceneRun): string {
  switch (run.errorCode) {
    case "provider_not_configured":
      return "Production engine credential rejected (401)";
    case "rate_limited":
      return "Production engine rate limited (429)";
    case "invalid_input":
      return "The engine rejected this scene request";
    case "task_failed":
      return "The provider task failed";
    default:
      return "The production engine could not complete this";
  }
}

export function SceneGenerationCard({
  scene,
  run = idleRun,
  onGenerate,
}: {
  scene: SceneDirection;
  run?: SceneRun;
  onGenerate: (scene: SceneDirection) => void;
}) {
  const busy = run.phase === "submitting" || run.phase === "running";
  const Icon = scene.requiredAssetType === "video" ? Clapperboard : ImageIcon;

  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary">
          <Icon className="size-4 text-foreground/70" strokeWidth={1.6} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="eyebrow">
            Scene {scene.sceneNumber} · {scene.requiredAssetType}
          </div>
          <p className="mt-1 text-[15px] leading-relaxed">{scene.narrativePurpose}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {scene.cameraFraming} · {scene.lighting}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onGenerate(scene)}
          disabled={busy}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" strokeWidth={1.75} /> : null}
          {run.phase === "succeeded" || run.phase === "failed" ? "Regenerate" : "Generate"}
        </button>
      </div>

      <div className="mt-4">
        <div className="h-1 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              phaseWidth[run.phase],
              run.phase === "failed" ? "bg-warning" : "bg-royal",
            )}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            {run.phase === "succeeded" ? (
              <Check className="size-3 text-royal" strokeWidth={3} />
            ) : null}
            {phaseLabel[run.phase]}
          </span>
          {run.providerTaskId ? <span>task {run.providerTaskId.slice(0, 8)}</span> : null}
          {run.phase !== "idle" && !run.persisted ? <span>not recorded in database</span> : null}
        </div>
      </div>

      {run.phase === "failed" ? (
        <div className="mt-4 flex gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" strokeWidth={2} />
          <div>
            <div className="font-medium">{errorHeadline(run)}</div>
            <p className="mt-1 text-muted-foreground">{run.message}</p>
          </div>
        </div>
      ) : null}

      {run.phase === "succeeded" && run.outputUrl ? (
        <a
          href={run.outputUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex text-sm font-medium text-royal hover:underline"
        >
          Open the rendered {scene.requiredAssetType} (temporary provider URL)
        </a>
      ) : null}

      {run.phase !== "failed" && run.message ? (
        <p className="mt-3 text-xs text-muted-foreground">{run.message}</p>
      ) : null}
    </article>
  );
}
