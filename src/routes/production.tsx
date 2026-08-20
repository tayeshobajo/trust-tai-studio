import { createFileRoute, Link } from "@tanstack/react-router";
import { Clapperboard, ChevronRight, ArrowDown, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { SuiteShell } from "@/components/studio/SuiteShell";
import { formatLabels, inProduction, statusLabels } from "@/lib/studio-data";
import { planStore, type StoredPlan } from "@/lib/studio/plan-store";
import type { SceneStatus } from "@/lib/studio/ai-types";
import { useSceneGeneration, type SceneRun } from "@/lib/studio/use-scene-generation";
import { cn } from "@/lib/utils";

const sceneStatusLabels: Record<SceneStatus, string> = {
  planned: "Planned",
  ready_to_generate: "Ready to generate",
  generating: "Generating",
  review: "In review",
  approved: "Approved",
};

const runLabels: Record<SceneRun["phase"], string> = {
  idle: "",
  submitting: "Sending to the production engine…",
  running: "Rendering…",
  succeeded: "Render complete",
  failed: "Render failed",
};

function DirectorPlanPanel({ stored }: { stored: StoredPlan }) {
  const { plan, discovery } = stored;
  const { runs, start } = useSceneGeneration(plan, plan.storyId ?? null);

  return (
    <section className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-tt lg:p-8">
      <div className="eyebrow flex items-center gap-2">
        <Clapperboard className="size-4 text-royal" strokeWidth={1.6} />
        Director plan
      </div>
      <h2 className="mt-3 font-display text-2xl leading-tight">{discovery.title}</h2>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed">{plan.filmIntent}</p>

      <dl className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-3">
        {[
          ["Emotional arc", plan.emotionalArc],
          ["Visual arc", plan.visualArc],
          ["Pacing", plan.pacing],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="eyebrow">{label}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      <ol className="mt-8 space-y-3">
        {plan.scenes.map((scene, i) => {
          const run = runs[scene.sceneNumber];
          const busy = run?.phase === "submitting" || run?.phase === "running";
          const status: SceneStatus = busy
            ? "generating"
            : run?.phase === "succeeded"
              ? "review"
              : (scene.status ?? "planned");
          const prev = plan.scenes[i - 1];
          const next = plan.scenes[i + 1];
          return (
            <li key={scene.sceneNumber}>
              <article className="rounded-xl border border-border p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    Scene {String(scene.sceneNumber).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px]",
                      status === "approved" || status === "review"
                        ? "bg-royal/10 text-royal"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {sceneStatusLabels[status]}
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

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void start(scene)}
                    className="inline-flex items-center gap-2 rounded-full bg-royal px-4 py-2 text-[13px] text-royal-foreground disabled:opacity-60"
                  >
                    {busy ? (
                      <Loader2 className="size-3.5 animate-spin" strokeWidth={1.8} />
                    ) : (
                      <Sparkles className="size-3.5" strokeWidth={1.8} />
                    )}
                    {run?.phase === "succeeded" ? "Regenerate" : "Generate this scene"}
                  </button>
                  {run && run.phase !== "idle" ? (
                    <span className="text-[13px] text-muted-foreground">
                      {runLabels[run.phase]}
                      {run.providerTaskId ? (
                        <span className="ml-2 font-mono text-[11px]">
                          task {run.providerTaskId.slice(0, 8)}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                  {run?.outputUrl ? (
                    <a
                      href={run.outputUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13px] text-royal underline underline-offset-4"
                    >
                      Preview output
                    </a>
                  ) : null}
                </div>
                {run?.message ? (
                  <p className="mt-2 text-[13px] text-muted-foreground">{run.message}</p>
                ) : null}
              </article>

              {next ? (
                <div className="flex justify-center py-1 text-muted-foreground/60">
                  <ArrowDown className="size-4" strokeWidth={1.5} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export const Route = createFileRoute("/production")({
  head: () => ({
    meta: [
      { title: "In Production — Trust Tai Studio" },
      {
        name: "description",
        content:
          "Every Story currently in production inside the Trust Tai World, with scene progress and where each one is waiting.",
      },
      { property: "og:title", content: "In Production — Trust Tai Studio" },
      {
        property: "og:description",
        content: "Stories being built, directed, and refined in Trust Tai Studio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductionPage,
});

function ProductionPage() {
  const [stored, setStored] = useState<StoredPlan | null>(null);
  useEffect(() => {
    setStored(planStore.read());
  }, []);

  return (
    <SuiteShell>
      <div className="wash-royal">
        <div className="mx-auto max-w-[1180px] px-6 pt-12 pb-20 lg:px-12">
          <header className="max-w-2xl">
            <div className="eyebrow">Studio · Production</div>
            <h1 className="mt-3 font-display text-[2.5rem] leading-[1.1] tracking-tight lg:text-[3rem]">
              In Production
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              Stories that have found their truth and are being shaped into scenes, assets, and
              formats.
            </p>
          </header>

          {stored ? <DirectorPlanPanel stored={stored} /> : null}

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {inProduction.map((story) => {
              const pct = story.scenesTotal
                ? Math.round(((story.scenesReady ?? 0) / story.scenesTotal) * 100)
                : null;
              return (
                <article
                  key={story.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-tt"
                >
                  <img
                    src={story.image}
                    alt={story.title}
                    width={1200}
                    height={750}
                    loading="lazy"
                    className="h-40 w-full object-cover"
                  />
                  <div className="space-y-3 p-5">
                    <div className="eyebrow flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-royal" />
                      {formatLabels[story.format]}
                    </div>
                    <h2 className="font-display text-xl leading-tight">{story.title}</h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {story.premise}
                    </p>
                    {pct !== null ? (
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-royal">
                            {story.scenesReady} of {story.scenesTotal} scenes ready
                          </span>
                          <span className="font-mono text-muted-foreground">{pct}%</span>
                        </div>
                        <div className="mt-1.5 h-1 w-full rounded-full bg-secondary">
                          <div className="h-1 rounded-full bg-royal" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        {statusLabels[story.status]}
                      </div>
                    )}
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {story.updatedLabel}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <section className="mt-12 flex flex-col gap-4 rounded-2xl border border-dashed border-border p-6 sm:flex-row sm:items-center">
            <Clapperboard className="size-5 text-royal" strokeWidth={1.6} />
            <div className="flex-1">
              <div className="text-sm font-medium">Scene and asset production</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Rendering visual and film assets runs server-side through the production engine.
                It is not connected in this pass, so nothing here is generated.
              </p>
            </div>
            <Link
              to="/approvals"
              className="inline-flex items-center gap-1 text-sm font-medium text-royal hover:underline"
            >
              Go to approvals <ChevronRight className="size-4" />
            </Link>
          </section>
        </div>
      </div>
    </SuiteShell>
  );
}
