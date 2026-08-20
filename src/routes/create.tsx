import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Paperclip,
  Mic,
  Upload,
  Link2,
  Database,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  Linkedin,
  Mail,
  FileText,
  Image as ImageIcon,
  Clapperboard,
  Square,
} from "lucide-react";
import { toast } from "sonner";

import { SuiteShell } from "@/components/studio/SuiteShell";
import { suiteSignals, type OutputFormat } from "@/lib/studio-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Create a Story — Trust Tai Studio" },
      {
        name: "description",
        content:
          "Bring text, a voice note, an upload, or a Suite signal into Studio and let Studio AI shape a Story draft with an angle and first scenes.",
      },
      { property: "og:title", content: "Create a Story — Trust Tai Studio" },
      {
        property: "og:description",
        content: "A guided path from raw material to a Story worth telling.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreateFlow,
});

type SourceKind = "text" | "voice" | "upload" | "signal";

const sourceKinds: { kind: SourceKind; icon: typeof Paperclip; label: string; hint: string }[] = [
  { kind: "text", icon: Paperclip, label: "Text", hint: "Write or paste the thinking" },
  { kind: "voice", icon: Mic, label: "Voice note", hint: "Speak it out loud" },
  { kind: "upload", icon: Upload, label: "Upload", hint: "Document, deck, or recording" },
  { kind: "signal", icon: Database, label: "From the Suite", hint: "A signal another room raised" },
];

const formats: { value: OutputFormat; icon: typeof Linkedin; label: string; hint: string }[] = [
  { value: "linkedin_post", icon: Linkedin, label: "LinkedIn Post", hint: "Short post + visual" },
  { value: "newsletter", icon: Mail, label: "Newsletter", hint: "Email to subscribers" },
  { value: "blog_article", icon: FileText, label: "Blog Article", hint: "Long form article" },
  { value: "visual_story", icon: ImageIcon, label: "Visual Story", hint: "Image or carousel" },
  { value: "cinematic_film", icon: Clapperboard, label: "Cinematic Film", hint: "Short film" },
];

const steps = ["Source", "Material", "Intent", "Story draft"] as const;

function StepRail({ step }: { step: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {steps.map((label, i) => {
        const state = i < step ? "done" : i === step ? "current" : "todo";
        return (
          <li key={label} className="flex items-center gap-3">
            <span
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                state === "current" && "border-royal bg-royal-soft text-royal",
                state === "done" && "border-border bg-card text-foreground/80",
                state === "todo" && "border-border text-muted-foreground",
              )}
            >
              <span className="font-mono text-[10px]">
                {state === "done" ? <Check className="size-3" strokeWidth={3} /> : `0${i + 1}`}
              </span>
              {label}
            </span>
            {i < steps.length - 1 ? (
              <span className="hidden h-px w-6 bg-border sm:block" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function CreateFlow() {
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<SourceKind | null>(null);
  const [material, setMaterial] = useState("");
  const [signalId, setSignalId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [note, setNote] = useState("");
  const [chosenFormats, setChosenFormats] = useState<OutputFormat[]>([]);
  const [thinking, setThinking] = useState(false);
  const [drafted, setDrafted] = useState(false);

  const signal = suiteSignals.find((s) => s.id === signalId) ?? null;

  const materialSummary = useMemo(() => {
    if (kind === "signal" && signal)
      return [`${signal.title} — ${signal.opportunity}`, note.trim()].filter(Boolean).join(" · ");
    if (kind === "upload" && fileName)
      return [fileName, note.trim()].filter(Boolean).join(" · ");
    return [material.trim(), note.trim()].filter(Boolean).join(" — ");
  }, [kind, signal, fileName, material, note]);

  const canAdvance =
    (step === 0 && kind !== null) ||
    (step === 1 && materialSummary.length > 0) ||
    (step === 2 && chosenFormats.length > 0) ||
    step === 3;

  const runStudioAI = () => {
    setThinking(true);
    setStep(3);
    window.setTimeout(() => {
      setThinking(false);
      setDrafted(true);
    }, 1400);
  };

  const truth =
    "Founders keep adding tools because adding is easier than admitting the system underneath is the problem.";
  const angle =
    "Open on the moment of adding — the new tool, the fresh hope — then reveal the untouched system beneath it. The story is not about tools. It is about avoidance.";
  const scenes = [
    { n: 1, title: "The New Tool", beat: "A founder installs the answer. Relief, briefly." },
    { n: 2, title: "The Untouched Floor", beat: "The camera pans down. Nothing underneath moved." },
    { n: 3, title: "The Honest Look", beat: "She stops adding. She looks at the system itself." },
  ];

  return (
    <SuiteShell>
      <div className="wash-royal">
        <div className="mx-auto max-w-[1180px] px-6 pt-12 pb-20 lg:px-12">
          <div className="eyebrow">Create</div>
          <h1 className="mt-2 font-display text-[2.5rem] leading-[1.1] tracking-tight lg:text-[3rem]">
            Bring the material. Studio AI finds the story.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Four calm steps. Nothing is published, rendered, or shared until you say so.
          </p>

          <div className="mt-8">
            <StepRail step={step} />
          </div>

          <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-tt-md lg:p-8">
            {/* Step 1 — Source */}
            {step === 0 ? (
              <div>
                <h2 className="font-display text-2xl tracking-tight">Where is this coming from?</h2>
                <div className="mt-6 grid gap-px overflow-hidden rounded-xl bg-border sm:grid-cols-2">
                  {sourceKinds.map(({ kind: k, icon: Icon, label, hint }) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      className={cn(
                        "flex items-start gap-3 p-5 text-left transition-colors",
                        kind === k ? "bg-royal-soft" : "bg-card hover:bg-secondary",
                      )}
                    >
                      <Icon
                        className={cn("mt-0.5 size-5", kind === k ? "text-royal" : "text-royal/70")}
                        strokeWidth={1.6}
                      />
                      <span>
                        <span className="block text-sm font-medium">{label}</span>
                        <span className="block text-xs text-muted-foreground">{hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Step 2 — Material */}
            {step === 1 ? (
              <div>
                <h2 className="font-display text-2xl tracking-tight">The raw material</h2>

                {kind === "text" ? (
                  <textarea
                    autoFocus
                    rows={7}
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    placeholder="I had a conversation today about why founders keep adding tools instead of fixing the system."
                    className="mt-5 w-full resize-none rounded-xl border border-border bg-background p-4 text-[16px] leading-relaxed outline-none focus:border-royal"
                  />
                ) : null}

                {kind === "voice" ? (
                  <div className="mt-5 rounded-xl border border-border p-6">
                    <button
                      type="button"
                      onClick={() => {
                        if (recording) {
                          setRecording(false);
                          setMaterial(
                            "Voice note (0:42) — transcript: founders keep reaching for another tool when what they need is to look at the system underneath.",
                          );
                        } else {
                          setRecording(true);
                          toast("Recording simulated", {
                            description: "Real capture arrives with the Studio AI connection.",
                          });
                        }
                      }}
                      className={cn(
                        "inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-medium transition-colors",
                        recording
                          ? "bg-destructive text-white"
                          : "bg-primary text-primary-foreground",
                      )}
                    >
                      {recording ? (
                        <Square className="size-4" strokeWidth={2} />
                      ) : (
                        <Mic className="size-4" strokeWidth={1.75} />
                      )}
                      {recording ? "Stop recording" : "Start recording"}
                    </button>
                    {material ? (
                      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                        {material}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {kind === "upload" ? (
                  <label className="mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-10 text-center transition-colors hover:bg-secondary">
                    <Upload className="size-6 text-royal" strokeWidth={1.6} />
                    <span className="text-sm font-medium">
                      {fileName ?? "Choose a document, deck, or recording"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Stored locally in this session for now
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                    />
                  </label>
                ) : null}

                {kind === "signal" ? (
                  <ul className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border">
                    {suiteSignals.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => setSignalId(s.id)}
                          className={cn(
                            "flex w-full items-center gap-4 p-4 text-left transition-colors",
                            signalId === s.id ? "bg-royal-soft" : "hover:bg-secondary",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="eyebrow">{s.source}</div>
                            <div className="truncate text-sm font-medium">{s.title}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {s.opportunity}
                            </div>
                          </div>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {s.room}
                          </span>
                          {signalId === s.id ? (
                            <Check className="size-4 text-royal" strokeWidth={2.5} />
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {kind !== "text" ? (
                  <div className="mt-5">
                    <label htmlFor="context" className="eyebrow">
                      Anything to add?
                    </label>
                    <textarea
                      id="context"
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Optional context for Studio AI."
                      className="mt-2 w-full resize-none rounded-xl border border-border bg-background p-4 text-sm leading-relaxed outline-none focus:border-royal"
                    />
                  </div>
                ) : null}
              </div>

            ) : null}

            {/* Step 3 — Intent */}
            {step === 2 ? (
              <div>
                <h2 className="font-display text-2xl tracking-tight">
                  Where might this story live?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick one or several. Studio AI treats them all as outputs of one Story.
                </p>
                <div className="mt-6 grid gap-px overflow-hidden rounded-xl bg-border sm:grid-cols-2 lg:grid-cols-3">
                  {formats.map(({ value, icon: Icon, label, hint }) => {
                    const on = chosenFormats.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setChosenFormats((prev) =>
                            on ? prev.filter((f) => f !== value) : [...prev, value],
                          )
                        }
                        className={cn(
                          "flex items-center gap-3 p-4 text-left transition-colors",
                          on ? "bg-royal-soft" : "bg-card hover:bg-secondary",
                        )}
                      >
                        <Icon
                          className={cn("size-5", on ? "text-royal" : "text-royal/70")}
                          strokeWidth={1.6}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{label}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {hint}
                          </span>
                        </span>
                        {on ? <Check className="size-4 text-royal" strokeWidth={2.5} /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Step 4 — Draft */}
            {step === 3 ? (
              <div>
                {thinking ? (
                  <div className="flex flex-col items-center gap-3 py-14 text-center">
                    <Sparkles className="size-6 animate-pulse text-royal" strokeWidth={1.6} />
                    <p className="font-display text-2xl">Studio AI is reading your material…</p>
                    <p className="text-sm text-muted-foreground">
                      Finding the truth underneath, then the angle worth telling.
                    </p>
                  </div>
                ) : null}

                {drafted ? (
                  <div className="space-y-8">
                    <div>
                      <div className="eyebrow">Story draft — preview</div>
                      <h2 className="mt-2 font-display text-3xl leading-tight tracking-tight">
                        Adding Is Not Fixing
                      </h2>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                      <div className="rounded-xl border border-border bg-secondary/50 p-5">
                        <div className="eyebrow">The truth</div>
                        <p className="mt-2 text-[15px] leading-relaxed">{truth}</p>
                      </div>
                      <div className="rounded-xl border border-royal/30 bg-royal-soft/60 p-5">
                        <div className="eyebrow text-royal">Suggested angle</div>
                        <p className="mt-2 text-[15px] leading-relaxed">{angle}</p>
                      </div>
                    </div>

                    <div>
                      <div className="eyebrow">First scenes</div>
                      <ol className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border">
                        {scenes.map((s) => (
                          <li key={s.n} className="flex gap-4 p-4">
                            <span className="font-mono text-[11px] text-muted-foreground">
                              0{s.n}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-medium">{s.title}</span>
                              <span className="block text-sm text-muted-foreground">{s.beat}</span>
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="rounded-xl border border-border p-5">
                      <div className="eyebrow">Sources used</div>
                      <p className="mt-2 text-sm text-muted-foreground">{materialSummary}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {chosenFormats.map((f) => (
                          <span
                            key={f}
                            className="rounded-full border border-border px-3 py-1 text-xs"
                          >
                            {formats.find((x) => x.value === f)?.label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          toast("Draft kept in this session", {
                            description: "Saving to the Suite arrives with Studio AI.",
                          })
                        }
                        className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
                      >
                        Send to production
                      </button>
                      <Link
                        to="/library"
                        className="inline-flex h-12 items-center rounded-full border border-border px-6 text-sm font-medium transition-colors hover:bg-secondary"
                      >
                        Save to Library
                      </Link>
                      <button
                        type="button"
                        onClick={runStudioAI}
                        className="inline-flex h-12 items-center gap-2 rounded-full border border-border px-6 text-sm font-medium transition-colors hover:bg-secondary"
                      >
                        <Sparkles className="size-4" strokeWidth={1.75} />
                        Try another angle
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Wizard controls */}
            {step < 3 ? (
              <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
                <button
                  type="button"
                  disabled={step === 0}
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  className="inline-flex h-11 items-center gap-1 rounded-full px-4 text-sm text-foreground/80 transition-colors hover:bg-secondary disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" /> Back
                </button>
                <button
                  type="button"
                  disabled={!canAdvance}
                  onClick={() => (step === 2 ? runStudioAI() : setStep((s) => s + 1))}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  {step === 2 ? (
                    <>
                      <Sparkles className="size-4" strokeWidth={1.75} />
                      Create with Studio AI
                    </>
                  ) : (
                    <>
                      Continue <ChevronRight className="size-4" />
                    </>
                  )}
                </button>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </SuiteShell>
  );
}
