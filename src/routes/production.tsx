import { createFileRoute, Link } from "@tanstack/react-router";
import { Clapperboard, ChevronRight } from "lucide-react";

import { SuiteShell } from "@/components/studio/SuiteShell";
import { formatLabels, inProduction, statusLabels } from "@/lib/studio-data";

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
