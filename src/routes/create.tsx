import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Type,
  Mic,
  Upload,
  Database,
  Link2,
  Sparkles,
  Lock,
  Check,
  Linkedin,
  Mail,
  FileText,
  Image as ImageIcon,
  Clapperboard,
  AlertCircle,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { SuiteShell } from "@/components/studio/SuiteShell";
import { activeWorld, formatLabels, type OutputFormat } from "@/lib/studio-data";
import { draftStore } from "@/lib/studio/repositories";
import { discoverStory, planDirection } from "@/lib/studio/studio-ai.functions";
import {
  createStoryFromDiscovery,
  saveStoryDirectorPlan,
  saveStoryOutputs,
  updateStoryDiscovery,
} from "@/lib/studio/stories.functions";
import type { ServiceError, StoryDiscovery } from "@/lib/studio/ai-types";
import type { SourceKind } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Create — Trust Tai Studio" },
      {
        name: "description",
        content:
          "Bring a raw thought into Studio. Studio AI helps find the deeper truth, then shapes it into a Story and the outputs it deserves.",
      },
      { property: "og:title", content: "Create — Trust Tai Studio" },
      {
        property: "og:description",
        content: "Raw thought to Story concept to output selection, inside the Trust Tai World.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreatePage,
});

const sourceModes: {
  kind: SourceKind;
  label: string;
  icon: typeof Type;
  available: boolean;
  unavailableReason?: string;
}[] = [
  { kind: "text", label: "Text", icon: Type, available: true },
  {
    kind: "voice_note",
    label: "Voice Note",
    icon: Mic,
    available: false,
    unavailableReason: "Needs audio capture and transcription.",
  },
  {
    kind: "upload",
    label: "Upload",
    icon: Upload,
    available: false,
    unavailableReason: "Needs Studio file storage.",
  },
  {
    kind: "suite_signal",
    label: "From Suite",
    icon: Database,
    available: false,
    unavailableReason: "Needs shared Suite data access.",
  },
  {
    kind: "link",
    label: "Paste Link",
    icon: Link2,
    available: false,
    unavailableReason: "Needs server-side link reading.",
  },
];

const outputs: { format: OutputFormat; icon: typeof Linkedin; hint: string }[] = [
  { format: "linkedin_post", icon: Linkedin, hint: "Short post + visual" },
  { format: "newsletter", icon: Mail, hint: "Email to subscribers" },
  { format: "blog_article", icon: FileText, hint: "Long form article" },
  { format: "visual_story", icon: ImageIcon, hint: "Image or carousel" },
  { format: "cinematic_film", icon: Clapperboard, hint: "Short film" },
];

function FailureState({ error }: { error: ServiceError }) {
  const pending = error.code === "provider_not_configured";
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border p-4",
        pending ? "border-royal/30 bg-royal/5" : "border-warning/30 bg-warning/5",
      )}
    >
      <AlertCircle
        className={cn("mt-0.5 size-4 shrink-0", pending ? "text-royal" : "text-warning")}
        strokeWidth={2}
      />
      <div className="text-sm">
        <div className="font-medium">
          {pending ? "Studio is ready to connect" : "Studio could not complete this"}
        </div>
        <p className="mt-1 text-muted-foreground">
          {error.message} Your source material is still here — nothing was invented on your behalf.
        </p>
      </div>
    </div>
  );
}

/** One editable line of the discovered Story. Shaping, not form-filling. */
function ShapedField({
  label,
  value,
  display,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  display: "lead" | "body";
  onChange: (next: string) => void;
  rows?: number;
}) {
  return (
    <div className="mt-8">
      <div className="eyebrow">{label}</div>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "mt-2 w-full resize-none rounded-lg bg-transparent leading-relaxed outline-none transition-colors",
          "-mx-2 px-2 py-1 hover:bg-secondary/50 focus:bg-secondary/60",
          display === "lead"
            ? "font-display text-2xl leading-snug"
            : "text-[16px] text-foreground/90",
        )}
      />
    </div>
  );
}

function CreatePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<SourceKind>("text");
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<OutputFormat[]>([]);

  const [analyzing, setAnalyzing] = useState(false);
  const [discovery, setDiscovery] = useState<StoryDiscovery | null>(null);
  const [storyId, setStoryId] = useState<string | null>(null);
  const [discoveryError, setDiscoveryError] = useState<ServiceError | null>(null);

  const [working, setWorking] = useState<null | "shaping" | "directing">(null);
  const [continueError, setContinueError] = useState<ServiceError | null>(null);

  const runDiscovery = useServerFn(discoverStory);
  const runDirection = useServerFn(planDirection);
  const persistStory = useServerFn(createStoryFromDiscovery);
  const persistEdits = useServerFn(updateStoryDiscovery);
  const persistOutputs = useServerFn(saveStoryOutputs);
  const persistPlan = useServerFn(saveStoryDirectorPlan);

  const canAnalyze = mode === "text" && text.trim().length > 0 && !analyzing;
  const cinematicSelected = selected.includes("cinematic_film");

  const worldContext = { name: activeWorld.name, canonVersion: activeWorld.canon };

  const analyze = async () => {
    if (!canAnalyze) return;
    draftStore.save({ kind: "text", content: text.trim() });
    setAnalyzing(true);
    setDiscoveryError(null);
    setContinueError(null);
    setDiscovery(null);
    setStoryId(null);

    try {
      const result = await runDiscovery({
        data: { sourceText: text.trim(), world: worldContext, requestedOutputs: selected },
      });
      if (!result.ok) {
        setDiscoveryError(result.error);
        return;
      }
      setDiscovery(result.data);

      // Discovery succeeded — the Story becomes real immediately.
      const saved = await persistStory({
        data: { discovery: result.data, sourceText: text.trim(), formats: selected },
      });
      if (saved.ok) setStoryId(saved.data.storyId);
      else setContinueError(saved.error);
    } catch {
      setDiscoveryError({
        code: "provider_error",
        provider: "studio_ai",
        message: "Studio could not reach the analysis service.",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const edit = (key: keyof StoryDiscovery) => (next: string) =>
    setDiscovery((prev) => (prev ? { ...prev, [key]: next } : prev));

  const toggleOutput = (format: OutputFormat) =>
    setSelected((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format],
    );

  /** Saves edits + outputs. Returns the story id only when everything landed. */
  const commitStory = async (): Promise<string | null> => {
    if (!discovery || !storyId) {
      setContinueError({
        code: "provider_not_configured",
        provider: "studio_storage",
        message: "This Story has not been saved yet, so Studio cannot continue.",
      });
      return null;
    }
    const edits = await persistEdits({ data: { storyId, discovery } });
    if (!edits.ok) {
      setContinueError(edits.error);
      return null;
    }
    const saved = await persistOutputs({ data: { storyId, formats: selected } });
    if (!saved.ok) {
      setContinueError(saved.error);
      return null;
    }
    return storyId;
  };

  const shape = async () => {
    setWorking("shaping");
    setContinueError(null);
    try {
      const id = await commitStory();
      if (id) toast("Story saved", { description: "Your outputs are drafted against this Story." });
    } finally {
      setWorking(null);
    }
  };

  const direct = async () => {
    if (!discovery) return;
    setWorking("directing");
    setContinueError(null);
    try {
      const id = await commitStory();
      if (!id) return;

      const planned = await runDirection({ data: { discovery, world: worldContext } });
      if (!planned.ok) {
        setContinueError(planned.error);
        return;
      }
      const persisted = await persistPlan({
        data: { storyId: id, plan: { ...planned.data, storyId: id } },
      });
      if (!persisted.ok) {
        setContinueError(persisted.error);
        return;
      }
      toast("The film is directed", {
        description: `${persisted.data.scenes.length} scenes saved to this Story.`,
      });
      // Only navigate once the Story and its scenes are genuinely persisted.
      void navigate({ to: "/production", search: { story: id } });
    } catch {
      setContinueError({
        code: "provider_error",
        provider: "studio_ai",
        message: "Studio could not reach the direction service.",
      });
    } finally {
      setWorking(null);
    }
  };

  return (
    <SuiteShell>
      <div className="wash-royal">
        <div className="mx-auto max-w-[860px] px-6 pt-14 pb-24 lg:px-12">
          <header className="max-w-2xl">
            <div className="eyebrow">Studio · Create</div>
            <h1 className="mt-3 font-display text-[2.75rem] leading-[1.08] tracking-tight lg:text-[3.25rem]">
              What&rsquo;s the real story here?
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Share anything. Studio AI will help us find the deeper truth.
            </p>
          </header>

          {/* Source input */}
          <section className="mt-10 rounded-2xl border border-border bg-card shadow-tt-md">
            <div className="flex flex-wrap gap-1 border-b border-border p-2">
              {sourceModes.map(({ kind, label, icon: Icon, available, unavailableReason }) => (
                <button
                  key={kind}
                  type="button"
                  disabled={!available}
                  onClick={() => setMode(kind)}
                  title={available ? undefined : unavailableReason}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors",
                    !available && "cursor-not-allowed text-muted-foreground/60",
                    available && mode === kind
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : available && "text-foreground/85 hover:bg-secondary",
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                  {label}
                  {!available ? <Lock className="size-3" strokeWidth={2} /> : null}
                </button>
              ))}
            </div>

            <div className="p-6 lg:p-8">
              <label htmlFor="source" className="sr-only">
                Source material
              </label>
              <textarea
                id="source"
                rows={7}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="A conversation, an observation, a half-formed thought. Write it the way you'd say it out loud."
                className="w-full resize-none bg-transparent text-[17px] leading-relaxed outline-none placeholder:text-muted-foreground/70"
              />

              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {text.trim() ? `${text.trim().split(/\s+/).length} words` : "Text mode"}
                  {" · "}
                  {activeWorld.canon}
                </span>
                <button
                  type="button"
                  onClick={analyze}
                  disabled={!canAnalyze}
                  className="ml-auto inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  {analyzing ? (
                    <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
                  ) : (
                    <Sparkles className="size-4" strokeWidth={1.75} />
                  )}
                  {analyzing ? "Finding the story beneath the surface…" : "Analyze with Studio AI"}
                </button>
              </div>
            </div>
          </section>

          {discoveryError ? (
            <div className="mt-8">
              <FailureState error={discoveryError} />
            </div>
          ) : null}

          {analyzing ? (
            <section className="mt-14 space-y-4">
              <div className="h-8 w-2/3 animate-pulse rounded-full bg-secondary" />
              <div className="h-3 w-1/3 animate-pulse rounded-full bg-secondary" />
              <div className="h-3 w-5/6 animate-pulse rounded-full bg-secondary" />
              <p className="pt-2 text-sm text-muted-foreground">
                Finding the story beneath the surface…
              </p>
            </section>
          ) : null}

          {/* Story Discovery — one editorial section, shaped in place */}
          {discovery && !analyzing ? (
            <>
              <article className="mt-16 border-t border-border pt-10">
                <div className="flex items-baseline justify-between gap-4">
                  <div className="eyebrow">Story Discovery</div>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {storyId ? "Saved to Studio" : "Not saved yet"}
                  </span>
                </div>

                <textarea
                  value={discovery.title}
                  rows={2}
                  onChange={(e) => edit("title")(e.target.value)}
                  className="-mx-2 mt-4 w-full resize-none rounded-lg bg-transparent px-2 py-1 font-display text-[2.25rem] leading-[1.1] tracking-tight outline-none hover:bg-secondary/50 focus:bg-secondary/60"
                />

                <ShapedField
                  label="The deeper human truth"
                  display="lead"
                  value={discovery.deeperHumanTruth}
                  onChange={edit("deeperHumanTruth")}
                />
                <ShapedField
                  label="Story premise"
                  display="body"
                  value={discovery.premise}
                  onChange={edit("premise")}
                />
                <ShapedField
                  label="Why it matters"
                  display="body"
                  value={discovery.whyItMatters}
                  onChange={edit("whyItMatters")}
                />
                <ShapedField
                  label="Recommended angle"
                  display="body"
                  value={discovery.recommendedAngle}
                  onChange={edit("recommendedAngle")}
                />

                <details className="mt-10 border-t border-border pt-5">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Source truth &amp; original material
                  </summary>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {discovery.sourceTruth}
                  </p>
                  <p className="mt-4 whitespace-pre-wrap border-l-2 border-border pl-4 text-sm leading-relaxed text-muted-foreground/90">
                    {text.trim()}
                  </p>
                </details>
              </article>

              {/* Output selection */}
              <section className="mt-14">
                <h2 className="font-display text-3xl tracking-tight">What should it become?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  One Story, many channels. Each output is drafted from this Story — never a
                  separate, disconnected one.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {outputs.map(({ format, icon: Icon, hint }) => {
                    const isOn = selected.includes(format);
                    return (
                      <button
                        key={format}
                        type="button"
                        onClick={() => toggleOutput(format)}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors",
                          isOn
                            ? "border-royal bg-royal/5"
                            : "border-border bg-card hover:bg-secondary",
                        )}
                      >
                        <Icon
                          className={cn("size-5", isOn ? "text-royal" : "text-foreground/70")}
                          strokeWidth={1.6}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{formatLabels[format]}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {hint}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "flex size-5 items-center justify-center rounded-full border",
                            isOn ? "border-royal bg-royal" : "border-border",
                          )}
                        >
                          {isOn ? (
                            <Check className="size-3 text-royal-foreground" strokeWidth={3} />
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {continueError ? (
                  <div className="mt-6">
                    <FailureState error={continueError} />
                  </div>
                ) : null}

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={cinematicSelected ? direct : shape}
                    disabled={!selected.length || working !== null || !storyId}
                    className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                  >
                    {working ? (
                      <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
                    ) : cinematicSelected ? (
                      <Clapperboard className="size-4" strokeWidth={1.75} />
                    ) : (
                      <ChevronRight className="size-4" strokeWidth={1.75} />
                    )}
                    {working === "directing"
                      ? "Directing the film…"
                      : working === "shaping"
                        ? "Saving…"
                        : cinematicSelected
                          ? "Direct this Film"
                          : "Shape this Story"}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {cinematicSelected
                      ? "Studio AI directs one connected film, then opens Production. Nothing is rendered until you ask."
                      : selected.length
                        ? "Outputs are drafted against this Story."
                        : "Choose at least one output."}
                  </span>
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </SuiteShell>
  );
}
