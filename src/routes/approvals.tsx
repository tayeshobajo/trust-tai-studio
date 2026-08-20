import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, MessageSquare, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { SuiteShell } from "@/components/studio/SuiteShell";
import { approvals, formatLabels } from "@/lib/studio-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals — Trust Tai Studio" },
      {
        name: "description",
        content:
          "Stories waiting on a human decision: read the latest Studio AI draft and feedback, then approve or request changes.",
      },
      { property: "og:title", content: "Approvals — Trust Tai Studio" },
      {
        property: "og:description",
        content: "Every Story waits for a human before it becomes real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApprovalsPage,
});

type Decision = "approved" | "changes";

function ApprovalsPage() {
  const [selectedId, setSelectedId] = useState(approvals[0]?.id ?? "");
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [note, setNote] = useState("");

  const item = approvals.find((a) => a.id === selectedId) ?? approvals[0]!;
  const decision = decisions[item.id];
  const pending = approvals.filter((a) => !decisions[a.id]).length;

  const decide = (d: Decision) => {
    setDecisions((prev) => ({ ...prev, [item.id]: d }));
    setNote("");
    toast(d === "approved" ? "Approved" : "Changes requested", {
      description:
        d === "approved"
          ? `${item.storyTitle} moves forward.`
          : `Studio AI will revise ${item.storyTitle}.`,
    });
  };

  return (
    <SuiteShell>
      <div className="wash-royal">
        <div className="mx-auto max-w-[1180px] px-6 pt-12 pb-20 lg:px-12">
          <div className="eyebrow">Approvals</div>
          <h1 className="mt-2 font-display text-[2.5rem] leading-[1.1] tracking-tight lg:text-[3rem]">
            Nothing goes out without you.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            {pending} {pending === 1 ? "item is" : "items are"} waiting on a decision.
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
            {/* Queue */}
            <ul className="space-y-3">
              {approvals.map((a) => {
                const d = decisions[a.id];
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(a.id)}
                      className={cn(
                        "flex w-full gap-3 rounded-xl border p-3 text-left transition-colors",
                        a.id === item.id
                          ? "border-royal bg-card shadow-tt"
                          : "border-border bg-card/60 hover:bg-secondary",
                      )}
                    >
                      <img
                        src={a.image}
                        alt=""
                        width={512}
                        height={512}
                        loading="lazy"
                        className="size-14 shrink-0 rounded-lg object-cover"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="eyebrow block truncate">{formatLabels[a.format]}</span>
                        <span className="block truncate text-sm font-medium">{a.storyTitle}</span>
                        <span className="block truncate font-mono text-[11px] text-muted-foreground">
                          {d
                            ? d === "approved"
                              ? "Approved"
                              : "Changes requested"
                            : a.submittedLabel}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Detail */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-tt-md lg:p-8">
              <div className="eyebrow">{formatLabels[item.format]}</div>
              <h2 className="mt-1 font-display text-3xl leading-tight tracking-tight">
                {item.storyTitle}
              </h2>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {item.submittedLabel} · Waiting on: {item.waitingOn}
              </p>

              <img
                src={item.image}
                alt=""
                width={1200}
                height={750}
                loading="lazy"
                className="mt-6 h-52 w-full rounded-xl object-cover"
              />

              <div className="mt-6">
                <div className="eyebrow">Latest Studio AI draft</div>
                <p className="mt-2 text-[15px] leading-relaxed">{item.draft}</p>
              </div>

              <div className="mt-6 rounded-xl border border-royal/30 bg-royal-soft/60 p-5">
                <div className="eyebrow flex items-center gap-2 text-royal">
                  <Sparkles className="size-3.5" strokeWidth={1.75} />
                  Studio AI feedback
                </div>
                <p className="mt-2 text-[15px] leading-relaxed">{item.directorNote}</p>
              </div>

              {decision ? (
                <div
                  className={cn(
                    "mt-6 flex items-center gap-2 rounded-xl border p-4 text-sm",
                    decision === "approved"
                      ? "border-success/30 text-success"
                      : "border-border text-foreground/80",
                  )}
                >
                  {decision === "approved" ? (
                    <CheckCircle2 className="size-4" strokeWidth={1.75} />
                  ) : (
                    <MessageSquare className="size-4" strokeWidth={1.75} />
                  )}
                  {decision === "approved"
                    ? "You approved this. It moves into production."
                    : "Changes requested. Studio AI will bring a revision back here."}
                </div>
              ) : (
                <div className="mt-6 border-t border-border pt-6">
                  <label htmlFor="feedback" className="eyebrow">
                    Your direction (optional)
                  </label>
                  <textarea
                    id="feedback"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What should change, and why does it matter?"
                    className="mt-2 w-full resize-none rounded-xl border border-border bg-background p-4 text-sm leading-relaxed outline-none focus:border-royal"
                  />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => decide("approved")}
                      className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
                    >
                      <CheckCircle2 className="size-4" strokeWidth={1.75} />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => decide("changes")}
                      className="inline-flex h-12 items-center gap-2 rounded-full border border-border px-6 text-sm font-medium transition-colors hover:bg-secondary"
                    >
                      <MessageSquare className="size-4" strokeWidth={1.75} />
                      Request changes
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </SuiteShell>
  );
}
