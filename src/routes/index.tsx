import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Paperclip,
  Mic,
  Upload,
  Link2,
  Database,
  Sparkles,
  ChevronRight,
  Linkedin,
  Mail,
  FileText,
  Image as ImageIcon,
  Clapperboard,
  CheckCircle2,
  CircleDashed,
  Circle,
  Check,
} from "lucide-react";

import { SuiteShell } from "@/components/studio/SuiteShell";
import { StudioAIStatus } from "@/components/studio/StudioAIStatus";
import {
  activeWorld,
  formatLabels,
  inProduction,
  nextMoves,
  suiteSignals,
  type Story,
} from "@/lib/studio-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Studio Home — Trust Tai Studio" },
      {
        name: "description",
        content:
          "The creative production room of the Trust Tai Suite. Turn real thinking into stories, films, and written work with Studio AI.",
      },
      { property: "og:title", content: "Studio Home — Trust Tai Studio" },
      {
        property: "og:description",
        content:
          "Bring an idea, recording, or Suite signal. Studio AI finds the story worth telling.",
      },
    ],
  }),
  component: StudioHome,
});

const quickOutputs = [
  { icon: Linkedin, label: "LinkedIn Post", hint: "Short post + visual" },
  { icon: Mail, label: "Newsletter", hint: "Email to subscribers" },
  { icon: FileText, label: "Blog Article", hint: "Long form article" },
  { icon: ImageIcon, label: "Visual Story", hint: "Image or carousel" },
  { icon: Clapperboard, label: "Cinematic Film", hint: "Short film / video" },
];

const sourceActions = [
  { icon: Paperclip, label: "Add text" },
  { icon: Mic, label: "Voice note" },
  { icon: Upload, label: "Upload" },
  { icon: Database, label: "From Suite" },
  { icon: Link2, label: "Paste link" },
];

function StatusLine({ story }: { story: Story }) {
  if (story.status === "in_production" && story.scenesTotal) {
    const pct = Math.round(((story.scenesReady ?? 0) / story.scenesTotal) * 100);
    return (
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
    );
  }
  if (story.status === "ready_for_approval") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-success">
        <CheckCircle2 className="size-4" strokeWidth={1.75} />
        Ready for approval
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <CircleDashed className="size-4" strokeWidth={1.75} />
      Drafting
    </div>
  );
}

function StudioHome() {
  const [draft, setDraft] = useState("");

  return (
    <SuiteShell>
      <div className="wash-royal">
        <div className="mx-auto max-w-[1180px] px-6 pt-14 pb-20 lg:px-12">
          {/* Opening */}
          <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="font-display text-[2.75rem] leading-[1.08] tracking-tight text-foreground lg:text-[3.25rem]">
                What story shall we bring to life today?
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                Start with an idea, experience, recording, project insight, or something you
                noticed. Studio AI will help find the story worth telling.
              </p>
            </div>
            <blockquote className="max-w-sm border-l border-border pl-5 lg:text-right lg:border-none lg:pl-0">
              <p className="font-display text-xl leading-snug text-foreground/90 italic">
                The world doesn&rsquo;t need more content. It needs more truth, seen in a new
                light.
              </p>
              <footer className="eyebrow mt-2">Trust Tai World</footer>
            </blockquote>
          </section>

          <StudioAIStatus />



          {/* Primary creation input */}
          <section className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-tt-md lg:p-8">
            <label htmlFor="story-source" className="sr-only">
              Bring source material into Studio
            </label>
            <textarea
              id="story-source"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder="Share an idea, paste something, upload a recording, or bring in a signal from Trust Tai."
              className="w-full resize-none bg-transparent text-[17px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/80"
            />
            <p className="mt-1 text-sm text-muted-foreground/80 italic">
              For example: I had a conversation today about why founders keep adding tools
              instead of fixing the system.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {sourceActions.map(({ icon: Icon, label }) => (
                <Link
                  key={label}
                  to="/create"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-4 text-sm text-foreground/85 transition-colors hover:bg-secondary"
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                  {label}
                </Link>
              ))}

              <Link
                to="/create"
                className="ml-auto inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5"
              >
                <Sparkles className="size-4" strokeWidth={1.75} />
                Create with Studio AI
              </Link>
            </div>
          </section>

          {/* Quick outputs */}
          <section className="mt-4 rounded-2xl border border-border bg-card/60 p-4 lg:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="lg:w-56 lg:shrink-0">
                <div className="eyebrow">Possible outputs</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Every one of these begins as a Story.
                </p>
              </div>
              <div className="grid flex-1 grid-cols-1 gap-px overflow-hidden rounded-xl bg-border sm:grid-cols-2 lg:grid-cols-5">
                {quickOutputs.map(({ icon: Icon, label, hint }) => (
                  <Link
                    key={label}
                    to="/create"
                    className="flex items-center gap-3 bg-card px-4 py-3 text-left transition-colors hover:bg-secondary"
                  >
                    <Icon className="size-5 text-royal" strokeWidth={1.6} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {hint}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* In Production */}
          <section className="mt-16">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="font-display text-3xl tracking-tight">In Production</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Stories we&rsquo;re building, directing, and refining.
                </p>
              </div>
              <Link
                to="/production"
                className="inline-flex items-center gap-1 text-sm text-foreground/80 hover:text-royal"
              >
                View all <ChevronRight className="size-4" />
              </Link>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {inProduction.map((story) => (
                <article
                  key={story.id}
                  className="group overflow-hidden rounded-2xl border border-border bg-card shadow-tt transition-transform duration-300 hover:-translate-y-1"
                >
                  <img
                    src={story.image}
                    alt={story.title}
                    width={1200}
                    height={750}
                    loading="lazy"
                    className="h-44 w-full object-cover"
                  />
                  <div className="space-y-3 p-5">
                    <div className="eyebrow flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-royal" />
                      {formatLabels[story.format]}
                    </div>
                    <h3 className="font-display text-xl leading-tight">{story.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {story.premise}
                    </p>
                    <StatusLine story={story} />
                    <div className="pt-1 font-mono text-[11px] text-muted-foreground">
                      {story.updatedLabel}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Signals + Next steps */}
          <section className="mt-16 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-2xl tracking-tight">Signals from the Suite</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Opportunities other Trust Tai rooms surfaced. Read-only.
                  </p>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">
                  Read-only
                </span>
              </div>

              <ul className="mt-5 divide-y divide-border border-t border-border">
                {suiteSignals.map((signal) => (
                  <li key={signal.id}>
                    <div className="flex w-full items-center gap-4 py-4 text-left">
                      <div className="min-w-0 flex-1">
                        <div className="eyebrow">{signal.source}</div>
                        <div className="mt-0.5 truncate text-sm font-medium">{signal.title}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {signal.opportunity}
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {signal.room}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-display text-2xl tracking-tight">Needs your decision</h2>
                <ul className="mt-4 space-y-4">
                  {nextMoves.map((move) => (
                    <li key={move.id} className="flex items-start gap-3">
                      {move.done ? (
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-royal">
                          <Check className="size-3 text-royal-foreground" strokeWidth={3} />
                        </span>
                      ) : (
                        <Circle
                          className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                          strokeWidth={1.5}
                        />
                      )}
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{move.label}</span>
                        <span className="block text-xs text-muted-foreground">
                          {move.context}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/approvals"
                  className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border text-sm font-medium transition-colors hover:bg-secondary"
                >
                  View approvals
                  <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] text-warning">
                    3
                  </span>
                </Link>
              </div>

              {/* Active World */}
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <img
                  src={activeWorld.thumbnail}
                  alt=""
                  width={512}
                  height={512}
                  loading="lazy"
                  className="h-28 w-full object-cover"
                />
                <div className="p-6">
                  <div className="eyebrow">Active World</div>
                  <h3 className="mt-1 font-display text-xl">{activeWorld.name}</h3>
                  <p className="text-sm text-muted-foreground">{activeWorld.subtitle}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {activeWorld.canon}
                  </p>
                  <Link
                    to="/world"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-royal hover:underline"
                  >
                    View World <ChevronRight className="size-4" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </SuiteShell>
  );
}
