import { createFileRoute, Link } from "@tanstack/react-router";
import { Clapperboard, ChevronRight, ArrowDown } from "lucide-react";
import { useEffect, useState } from "react";

import { SuiteShell } from "@/components/studio/SuiteShell";
import { formatLabels, inProduction, statusLabels } from "@/lib/studio-data";
import { planStore, type StoredPlan } from "@/lib/studio/plan-store";
import { useScenePilot } from "@/lib/studio/use-scene-pilot";
import { ScenePilotCard } from "@/components/studio/ScenePilotCard";
import { cn } from "@/lib/utils";

function DirectorPlanPanel({ stored }: { stored: StoredPlan }) {
  const { plan, discovery } = stored;
  const { state, generateStoryboard, animateScene } = useScenePilot(plan);

  // One scene at a time: while any track is in flight, other scenes wait.
  const busyScene = Object.values(state).find(
    (s) =>
      s.image.phase === "submitting" ||
      s.image.phase === "running" ||
      s.video.phase === "submitting" ||
      s.video.phase === "running",
  );

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

      <p className="mt-6 text-[13px] text-muted-foreground">
        Pilot loop — one scene at a time. Studio AI directs; the production engine renders. Frames
        and clips below are real provider output, held as previews until they are stored in Studio.
      </p>

      <ol className="mt-6 space-y-3">
        {plan.scenes.map((scene, i) => (
          <li key={scene.sceneNumber}>
            <ScenePilotCard
              scene={scene}
              plan={plan}
              index={i}
              pilot={state[scene.sceneNumber]}
              busyElsewhere={Boolean(busyScene && busyScene.sceneNumber !== scene.sceneNumber)}
              onGenerateImage={(s) => void generateStoryboard(s)}
              onAnimate={(s) => void animateScene(s)}
            />
            {plan.scenes[i + 1] ? (
              <div className="flex justify-center py-1 text-muted-foreground/60">
                <ArrowDown className="size-4" strokeWidth={1.5} />
              </div>
            ) : null}
          </li>
        ))}
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
