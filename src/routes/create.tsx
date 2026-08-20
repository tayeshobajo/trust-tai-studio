import { createFileRoute, Link } from "@tanstack/react-router";
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
import { planStore } from "@/lib/studio/plan-store";
import type { DirectorPlan, ServiceError, StoryDiscovery } from "@/lib/studio/ai-types";
import type { SourceKind } from "@/lib/studio/types";
import { planForOutputs, producibleOutputs } from "@/lib/studio/output-scenes";
import { useSceneGeneration } from "@/lib/studio/use-scene-generation";
import { SceneGenerationCard } from "@/components/studio/SceneGenerationCard";
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

const discoveryFields: {
  key: keyof StoryDiscovery;
  label: string;
  hint: string;
}[] = [
  { key: "sourceTruth", label: "Source truth", hint: "What was actually said or observed." },
  { key: "deeperHumanTruth", label: "Deeper human truth", hint: "The thing underneath it." },
  { key: "premise", label: "Story premise", hint: "The story in one sentence." },
  { key: "whyItMatters", label: "Why it matters", hint: "Why this is worth anyone's time." },
  { key: "recommendedAngle", label: "Recommended angle", hint: "How Studio would tell it." },
];

const outputs: { format: OutputFormat; icon: typeof Linkedin; hint: string }[] = [
  { format: "linkedin_post", icon: Linkedin, hint: "Short post + visual" },
  { format: "newsletter", icon: Mail, hint: "Email to subscribers" },
  { format: "blog_article", icon: FileText, hint: "Long form article" },
  { format: "visual_story", icon: ImageIcon, hint: "Image or carousel" },
  { format: "cinematic_film", icon: Clapperboard, hint: "Short film" },
];

function ConfigurationState({ error }: { error: ServiceError }) {
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
          {pending ? "Studio AI is ready to connect" : "Studio AI could not complete this"}
        </div>
        <p className="mt-1 text-muted-foreground">
          {error.message} Your source stays saved in this browser — nothing has been generated on
          your behalf.
        </p>
      </div>
    </div>
  );
}

/** Typed Runway generation for whatever producible outputs were selected. */
function OutputProduction({ plan }: { plan: DirectorPlan }) {
  const { runs, start } = useSceneGeneration(plan, plan.storyId ?? null);

  return (
    <section className="mt-14">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-3xl tracking-tight">Produce the visuals</h2>
        <span className="font-mono text-[11px] text-muted-foreground">
          {plan.scenes.length} scene{plan.scenes.length > 1 ? "s" : ""} · Runway
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Each request is typed to a planned scene — Studio composes the prompt from the direction,
        the browser never sends free-form instructions to the engine.
      </p>

      <div className="mt-6 space-y-4">
        {plan.scenes.map((scene) => (
          <SceneGenerationCard
            key={scene.sceneNumber}
            scene={scene}
            run={runs[scene.sceneNumber]}
            onGenerate={start}
          />
        ))}
      </div>
    </section>
  );
}

function CreatePage() {
  const [mode, setMode] = useState<SourceKind>("text");
  const [text, setText] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [selected, setSelected] = useState<OutputFormat[]>([]);

  const [analyzing, setAnalyzing] = useState(false);
  const [discovery, setDiscovery] = useState<StoryDiscovery | null>(null);
  const [discoveryError, setDiscoveryError] = useState<ServiceError | null>(null);

  const [directing, setDirecting] = useState(false);
  const [plan, setPlan] = useState<DirectorPlan | null>(null);
  const [planError, setPlanError] = useState<ServiceError | null>(null);

  const runDiscovery = useServerFn(discoverStory);
  const runDirection = useServerFn(planDirection);

  const canAnalyze = mode === "text" && text.trim().length > 0 && !analyzing;

  const worldContext = {
    name: activeWorld.name,
    canonVersion: activeWorld.canon,
  };

  const analyze = async () => {
    if (!canAnalyze) return;
    const record = draftStore.save({ kind: "text", content: text.trim() });
    setSavedAt(record.savedAt);
    setAnalyzing(true);
    setDiscoveryError(null);
    setDiscovery(null);
    setPlan(null);
    setPlanError(null);

    try {
      const result = await runDiscovery({
        data: {
          sourceText: text.trim(),
          world: worldContext,
          requestedOutputs: selected,
        },
      });
      if (result.ok) {
        setDiscovery(result.data);
      } else {
        setDiscoveryError(result.error);
      }
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

  const direct = async () => {
    if (!discovery || directing) return;
    setDirecting(true);
    setPlanError(null);
    try {
      const result = await runDirection({
        data: { discovery, world: worldContext },
      });
      if (result.ok) {
        setPlan(result.data);
        planStore.save(discovery, result.data);
        toast("Director plan ready", { description: "Open In Production to see the scenes." });
      } else {
        setPlanError(result.error);
      }
    } catch {
      setPlanError({
        code: "provider_error",
        provider: "studio_ai",
        message: "Studio could not reach the direction service.",
      });
    } finally {
      setDirecting(false);
    }
  };

  const toggleOutput = (format: OutputFormat) =>
    setSelected((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format],
    );

  const cinematicSelected = selected.includes("cinematic_film");
  const producible = selected.some((f) => producibleOutputs.includes(f));
  const productionPlan =
    discovery && producible
      ? planForOutputs({ discovery, world: worldContext, selected, directorPlan: plan })
      : null;

  return (
    <SuiteShell>
      <div className="wash-royal">
        <div className="mx-auto max-w-[980px] px-6 pt-14 pb-24 lg:px-12">
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
                  {analyzing ? "Reading it properly…" : "Analyze with Studio AI"}
                </button>
              </div>

              {savedAt && !discovery ? (
                <p className="mt-4 font-mono text-[11px] text-muted-foreground">
                  Source saved locally at {new Date(savedAt).toLocaleTimeString()}.
                </p>
              ) : null}
            </div>
          </section>

          {/* Story Discovery */}
          <section className="mt-14">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-3xl tracking-tight">Story Discovery</h2>
              <span className="font-mono text-[11px] text-muted-foreground">
                {analyzing
                  ? "Studio AI is thinking"
                  : discovery
                    ? "Complete"
                    : "Awaiting Studio AI"}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Studio AI works down from what you said to why it matters. Understand the story
              first — outputs come after.
            </p>

            {discoveryError ? (
              <div className="mt-6">
                <ConfigurationState error={discoveryError} />
              </div>
            ) : null}

            {discovery ? (
              <h3 className="mt-6 font-display text-2xl leading-tight">{discovery.title}</h3>
            ) : null}

            <div className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {discoveryFields.map((field) => (
                <div key={field.key} className="grid gap-1 p-5 sm:grid-cols-[220px_1fr] sm:gap-6">
                  <div>
                    <div className="text-sm font-medium">{field.label}</div>
                    <div className="text-xs text-muted-foreground">{field.hint}</div>
                  </div>
                  <div className="flex items-center">
                    {analyzing ? (
                      <div className="h-2 w-2/3 animate-pulse rounded-full bg-secondary" />
                    ) : discovery ? (
                      <p className="text-[15px] leading-relaxed">{discovery[field.key]}</p>
                    ) : (
                      <div className="h-px w-full bg-border" />
                    )}
                  </div>
                </div>
              ))}
              {discovery ? (
                <div className="grid gap-1 p-5 sm:grid-cols-[220px_1fr] sm:gap-6">
                  <div>
                    <div className="text-sm font-medium">Creative treatment</div>
                    <div className="text-xs text-muted-foreground">How it should feel.</div>
                  </div>
                  <p className="text-[15px] leading-relaxed">
                    {discovery.suggestedCreativeTreatment}
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          {/* Output selection */}
          <section className="mt-14">
            <h2 className="font-display text-3xl tracking-tight">Then choose the outputs</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One Story, many channels. Select what this story should become — production begins
              after Story Discovery.
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
                      isOn ? "border-royal bg-royal/5" : "border-border bg-card hover:bg-secondary",
                    )}
                  >
                    <Icon
                      className={cn("size-5", isOn ? "text-royal" : "text-foreground/70")}
                      strokeWidth={1.6}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{formatLabels[format]}</span>
                      <span className="block truncate text-xs text-muted-foreground">{hint}</span>
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

            <p className="mt-4 text-xs text-muted-foreground">
              {selected.length
                ? `${selected.length} output${selected.length > 1 ? "s" : ""} selected. They'll be created from the Story, not written directly.`
                : "Nothing selected yet."}
            </p>
          </section>

          {/* Cinematic branch */}
          {discovery && cinematicSelected ? (
            <section className="mt-12 rounded-2xl border border-border bg-card p-6 shadow-tt lg:p-8">
              <div className="eyebrow flex items-center gap-2">
                <Clapperboard className="size-4 text-royal" strokeWidth={1.6} />
                Cinematic Film
              </div>
              <h2 className="mt-3 font-display text-2xl leading-tight">Direct this film</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Studio AI directs the whole film at once — intent, emotional arc, pacing,
                continuity rules, beats, and scene-by-scene direction. Nothing is rendered here.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={direct}
                  disabled={directing}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  {directing ? (
                    <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
                  ) : (
                    <Clapperboard className="size-4" strokeWidth={1.75} />
                  )}
                  {directing ? "Directing…" : "Direct this film"}
                </button>
                {plan ? (
                  <Link
                    to="/production"
                    className="inline-flex items-center gap-1 text-sm font-medium text-royal hover:underline"
                  >
                    {plan.scenes.length} scenes planned — open In Production
                    <ChevronRight className="size-4" />
                  </Link>
                ) : null}
              </div>

              {planError ? (
                <div className="mt-5">
                  <ConfigurationState error={planError} />
                </div>
              ) : null}
            </section>
          ) : null}

          {productionPlan ? (
            <OutputProduction
              key={productionPlan.scenes.map((s) => s.sceneNumber).join("-")}
              plan={productionPlan}
            />
          ) : null}
        </div>
      </div>
    </SuiteShell>
  );
}
