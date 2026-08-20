/**
 * One scene of the production pilot loop.
 *
 * Shows only real provider output: no placeholder frames, no simulated
 * progress. Provider URLs are previews until they are copied into the private
 * `studio-assets` bucket, which is why approval stays disabled here.
 */

import { AlertCircle, Clapperboard, Film, ImageIcon, Loader2, Sparkles } from "lucide-react";

import type { DirectorPlan, SceneDirection, SceneStatus } from "@/lib/studio/ai-types";
import { emptyScene, type PilotTrack, type ScenePilotState } from "@/lib/studio/pilot-store";
import { cn } from "@/lib/utils";

const phaseCopy = {
  idle: "",
  submitting: "Sending to the production engine…",
  running: "Rendering…",
  succeeded: "Returned",
  failed: "Failed",
} as const;

function errorHeadline(code: string): string {
  switch (code) {
    case "provider_not_configured":
      return "Production engine credential rejected";
    case "rate_limited":
      return "Production engine rate limited — try again shortly";
    case "invalid_input":
      return "The engine rejected this scene request";
    case "task_failed":
      return "The provider task failed";
    case "timeout":
      return "Stopped watching this task";
    default:
      return "The production engine could not complete this";
  }
}

function TrackNote({ track }: { track: PilotTrack }) {
  return (
    <p className="mt-2 font-mono text-[11px] text-muted-foreground">
      {track.durable
        ? "Stored in Studio · studio-assets"
        : "Preview generated · not yet stored in Studio"}
      {track.persisted ? " · task recorded" : " · task not recorded in the database"}
      {!track.durable && track.durabilityNote ? ` · ${track.durabilityNote}` : ""}
    </p>
  );
}

/** Approve to World / Request changes for one finished track. */
function ReviewActions({
  track,
  sceneNumber,
  kind,
  onApprove,
  onRequestChanges,
}: {
  track: PilotTrack;
  sceneNumber: number;
  kind: "image" | "video";
  onApprove: (sceneNumber: number, kind: "image" | "video") => void;
  onRequestChanges: (sceneNumber: number, kind: "image" | "video") => void;
}) {
  const ready = track.durable && Boolean(track.assetId);
  const saving = track.review.phase === "saving";
  const blockedReason = !track.assetId
    ? "This generation was not recorded in Studio, so there is nothing to approve yet."
    : "This frame is still a provider preview. Approval opens once it is stored in Studio.";

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
      <button
        type="button"
        disabled={!ready || saving}
        title={ready ? "Approve this to the Active World" : blockedReason}
        onClick={() => onApprove(sceneNumber, kind)}
        className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[13px] transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="size-3.5 animate-spin" strokeWidth={1.8} />
        ) : (
          <Sparkles className="size-3.5" strokeWidth={1.8} />
        )}
        {track.review.phase === "approved" ? "Approved to World" : "Approve to World"}
      </button>
      <button
        type="button"
        disabled={!ready || saving}
        title={ready ? "Record what should change" : blockedReason}
        onClick={() => onRequestChanges(sceneNumber, kind)}
        className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[13px] transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Clapperboard className="size-3.5" strokeWidth={1.8} />
        Request changes
      </button>
      <span className="text-[12px] text-muted-foreground">
        {track.review.phase === "approved"
          ? "Recorded as canon in the Active World."
          : track.review.phase === "changes_requested"
            ? "Feedback saved to the World's creative memory · scene back for another pass."
            : track.review.error
              ? track.review.error
              : ready
                ? "Stored in Studio · ready for the World."
                : "Approval opens once this frame is stored in Studio."}
      </span>
    </div>
  );
}

export function ScenePilotCard({
  scene,
  plan,
  index,
  pilot,
  busyElsewhere,
  onGenerateImage,
  onAnimate,
  onApprove,
  onRequestChanges,
}: {
  scene: SceneDirection;
  plan: DirectorPlan;
  index: number;
  pilot?: ScenePilotState | undefined;
  busyElsewhere: boolean;
  onGenerateImage: (scene: SceneDirection) => void;
  onAnimate: (scene: SceneDirection) => void;
  onApprove: (sceneNumber: number, kind: "image" | "video") => void;
  onRequestChanges: (sceneNumber: number, kind: "image" | "video") => void;
}) {
  const state = pilot ?? emptyScene(scene.sceneNumber);
  const image = state.image;
  const video = state.video;
  const imageBusy = image.phase === "submitting" || image.phase === "running";
  const videoBusy = video.phase === "submitting" || video.phase === "running";
  const busy = imageBusy || videoBusy;

  const prev = plan.scenes[index - 1];
  const next = plan.scenes[index + 1];

  const status: SceneStatus = busy
    ? "generating"
    : video.phase === "succeeded" || image.phase === "succeeded"
      ? "review"
      : (scene.status ?? "planned");

  const canGenerate = !busy && !busyElsewhere;

  return (
    <article className="rounded-xl border border-border p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[11px] text-muted-foreground">
          Scene {String(scene.sceneNumber).padStart(2, "0")}
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px]",
            status === "review" ? "bg-royal/10 text-royal" : "bg-secondary text-muted-foreground",
          )}
        >
          {status === "generating"
            ? "Generating"
            : status === "review"
              ? "In review"
              : status === "ready_to_generate"
                ? "Ready to generate"
                : "Planned"}
        </span>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">
          {scene.durationSeconds}s · {scene.requiredAssetType}
        </span>
      </div>

      <p className="mt-2 text-[15px] leading-relaxed">{scene.narrativePurpose}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        {prev ? `From ${prev.transitionOut} — ` : "Opens on "}
        {scene.transitionIn}
        {next ? ` — into ${scene.transitionOut}` : " — closes the film"}
      </p>

      {/* Storyboard image track */}
      <div className="mt-4 border-t border-border pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!canGenerate}
            onClick={() => onGenerateImage(scene)}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[13px] transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {imageBusy ? (
              <Loader2 className="size-3.5 animate-spin" strokeWidth={1.8} />
            ) : (
              <ImageIcon className="size-3.5" strokeWidth={1.8} />
            )}
            {image.phase === "succeeded" ? "Regenerate storyboard image" : "Generate storyboard image"}
          </button>
          {image.phase !== "idle" ? (
            <span className="font-mono text-[11px] text-muted-foreground">
              Image · {phaseCopy[image.phase]}
              {image.taskId ? ` · task ${image.taskId.slice(0, 8)}` : ""}
            </span>
          ) : (
            <span className="font-mono text-[11px] text-muted-foreground">
              Cinematic 16:9 · prompt compiled from the direction
            </span>
          )}
        </div>

        {image.error ? (
          <div className="mt-3 flex gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-[13px]">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" strokeWidth={2} />
            <div>
              <div className="font-medium">{errorHeadline(image.error.code)}</div>
              <p className="mt-0.5 text-muted-foreground">{image.error.message}</p>
            </div>
          </div>
        ) : null}

        {image.phase === "succeeded" && image.previewUrl ? (
          <figure className="mt-3">
            <img
              src={image.durableUrl ?? image.previewUrl}
              alt={`Storyboard frame for scene ${scene.sceneNumber}`}
              className="w-full rounded-lg border border-border object-cover"
              loading="lazy"
            />
            <figcaption>
              <TrackNote track={image} />
            </figcaption>
          </figure>
          <ReviewActions
            track={image}
            sceneNumber={scene.sceneNumber}
            kind="image"
            onApprove={onApprove}
            onRequestChanges={onRequestChanges}
          />
        ) : null}
      </div>

      {/* Motion track */}
      {image.phase === "succeeded" && image.previewUrl ? (
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!canGenerate}
              onClick={() => onAnimate(scene)}
              className="inline-flex items-center gap-2 rounded-full bg-royal px-4 py-2 text-[13px] text-royal-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {videoBusy ? (
                <Loader2 className="size-3.5 animate-spin" strokeWidth={1.8} />
              ) : (
                <Film className="size-3.5" strokeWidth={1.8} />
              )}
              {video.phase === "succeeded" ? "Re-animate scene" : "Animate scene"}
            </button>
            <span className="font-mono text-[11px] text-muted-foreground">
              {video.phase !== "idle"
                ? `Video · ${phaseCopy[video.phase]}${video.taskId ? ` · task ${video.taskId.slice(0, 8)}` : ""}`
                : `Start frame above · motion compiled · ${scene.durationSeconds}s requested`}
            </span>
          </div>

          {video.error ? (
            <div className="mt-3 flex gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-[13px]">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" strokeWidth={2} />
              <div>
                <div className="font-medium">{errorHeadline(video.error.code)}</div>
                <p className="mt-0.5 text-muted-foreground">{video.error.message}</p>
              </div>
            </div>
          ) : null}

          {video.phase === "succeeded" && video.previewUrl ? (
            <figure className="mt-3">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                src={video.durableUrl ?? video.previewUrl}
                controls
                playsInline
                className="w-full rounded-lg border border-border"
              />
              <figcaption>
                <TrackNote track={video} />
              </figcaption>
            </figure>
            <ReviewActions
              track={video}
              sceneNumber={scene.sceneNumber}
              kind="video"
              onApprove={onApprove}
              onRequestChanges={onRequestChanges}
            />
          ) : null}
        </div>
      ) : null}

    </article>
  );
}
