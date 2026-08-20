import { createFileRoute } from "@tanstack/react-router";
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
} from "lucide-react";
import { toast } from "sonner";

import { SuiteShell } from "@/components/studio/SuiteShell";
import { activeWorld, formatLabels, type OutputFormat } from "@/lib/studio-data";
import { draftStore } from "@/lib/studio/repositories";
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

const discoveryFields = [
  { key: "source_truth", label: "Source truth", hint: "What was actually said or observed." },
  { key: "deeper_truth", label: "Deeper human truth", hint: "The thing underneath it." },
  { key: "premise", label: "Story premise", hint: "The story in one sentence." },
  { key: "why_it_matters", label: "Why it matters", hint: "Why this is worth anyone's time." },
  { key: "angle", label: "Recommended angle", hint: "How Studio would tell it." },
];

const outputs: { format: OutputFormat; icon: typeof Linkedin; hint: string }[] = [
  { format: "linkedin_post", icon: Linkedin, hint: "Short post + visual" },
  { format: "newsletter", icon: Mail, hint: "Email to subscribers" },
  { format: "blog_article", icon: FileText, hint: "Long form article" },
  { format: "visual_story", icon: ImageIcon, hint: "Image or carousel" },
  { format: "cinematic_film", icon: Clapperboard, hint: "Short film" },
];

function CreatePage() {
  const [mode, setMode] = useState<SourceKind>("text");
  const [text, setText] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [selected, setSelected] = useState<OutputFormat[]>([]);

  const canAnalyze = mode === "text" && text.trim().length > 0;

  const analyze = () => {
    if (!canAnalyze) return;
    const record = draftStore.save({ kind: "text", content: text.trim() });
    setSavedAt(record.savedAt);
    toast("Draft source saved in this browser.", {
      description: "Studio AI analysis unlocks when the OpenAI server integration is connected.",
    });
  };

  const toggleOutput = (format: OutputFormat) =>
    setSelected((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format],
    );

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
                onChange={(e) => {
                  setText(e.target.value);
                  setSavedAt(null);
                }}
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
                  <Sparkles className="size-4" strokeWidth={1.75} />
                  Analyze with Studio AI
                </button>
              </div>

              {savedAt ? (
                <div className="mt-5 flex gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" strokeWidth={2} />
                  <div className="text-sm">
                    <div className="font-medium">Integration needed — draft kept safe</div>
                    <p className="mt-1 text-muted-foreground">
                      Your source is stored locally in this browser (saved{" "}
                      {new Date(savedAt).toLocaleTimeString()}). Studio AI will read it and fill
                      the Story Discovery panel below once the OpenAI server integration is
                      connected. Nothing has been generated on your behalf.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {/* Story Discovery */}
          <section className="mt-14">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-3xl tracking-tight">Story Discovery</h2>
              <span className="font-mono text-[11px] text-muted-foreground">
                Awaiting Studio AI
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Studio AI works down from what you said to why it matters. These fields stay empty
              until the analysis is real.
            </p>

            <div className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {discoveryFields.map((field) => (
                <div key={field.key} className="grid gap-1 p-5 sm:grid-cols-[220px_1fr] sm:gap-6">
                  <div>
                    <div className="text-sm font-medium">{field.label}</div>
                    <div className="text-xs text-muted-foreground">{field.hint}</div>
                  </div>
                  <div className="flex items-center">
                    <div className="h-px w-full bg-border" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Output selection */}
          <section className="mt-14">
            <h2 className="font-display text-3xl tracking-tight">Then choose the outputs</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One Story, many channels. Select what this story should become — production begins
              after Story Discovery.
            </p>

            <div className="mt-6 grid gap-px overflow-hidden rounded-2xl bg-border sm:grid-cols-2 lg:grid-cols-3">
              {outputs.map(({ format, icon: Icon, hint }) => {
                const isOn = selected.includes(format);
                return (
                  <button
                    key={format}
                    type="button"
                    onClick={() => toggleOutput(format)}
                    className={cn(
                      "flex items-center gap-3 p-5 text-left transition-colors",
                      isOn ? "bg-royal-soft" : "bg-card hover:bg-secondary",
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
        </div>
      </div>
    </SuiteShell>
  );
}
