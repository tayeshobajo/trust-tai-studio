/**
 * Live progress indicator + timeline for one generation track.
 *
 * Everything shown here is real: submitted/accepted/returned events recorded by
 * the pilot driver, the provider task id, the number of status checks actually
 * made, and elapsed wall-clock time. The bar is an indeterminate "working"
 * shimmer, not a fake percentage — the provider does not report progress.
 */

import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, Loader2, XCircle } from "lucide-react";

import type { PilotTrack } from "@/lib/studio/pilot-store";
import { cn } from "@/lib/utils";

function elapsed(fromIso: string, toIso: string | null, now: number): string {
  const start = new Date(fromIso).getTime();
  const end = toIso ? new Date(toIso).getTime() : now;
  const secs = Math.max(0, Math.round((end - start) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function GenerationTimeline({ track, label }: { track: PilotTrack; label: string }) {
  const active = track.phase === "submitting" || track.phase === "running";
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  if (track.phase === "idle" || (!track.startedAt && track.events.length === 0)) return null;

  return (
    <div className="mt-3 rounded-lg border border-border bg-secondary/40 p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {active ? (
          <Loader2 className="size-3.5 animate-spin text-royal" strokeWidth={1.8} />
        ) : track.phase === "succeeded" ? (
          <CheckCircle2 className="size-3.5 text-royal" strokeWidth={1.8} />
        ) : (
          <XCircle className="size-3.5 text-warning" strokeWidth={1.8} />
        )}
        <span className="text-[13px]">
          {label} ·{" "}
          {active
            ? track.phase === "submitting"
              ? "sending"
              : "rendering"
            : track.phase === "succeeded"
              ? "returned"
              : "stopped"}
        </span>
        {track.startedAt ? (
          <span className="font-mono text-[11px] text-muted-foreground">
            {elapsed(track.startedAt, track.completedAt, now)} elapsed
          </span>
        ) : null}
        {track.pollCount > 0 ? (
          <span className="font-mono text-[11px] text-muted-foreground">
            {track.pollCount} status {track.pollCount === 1 ? "check" : "checks"}
          </span>
        ) : null}
        {track.taskId ? (
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
            task {track.taskId.slice(0, 8)}
          </span>
        ) : null}
      </div>

      {/* Indeterminate: the provider reports state, not percentage. */}
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border">
        <div
          className={cn(
            "h-1 rounded-full",
            active
              ? "w-1/3 animate-[tt-scan_1.6s_ease-in-out_infinite] bg-royal"
              : track.phase === "succeeded"
                ? "w-full bg-royal"
                : "w-full bg-warning/70",
          )}
        />
      </div>

      {track.events.length > 0 ? (
        <ol className="mt-3 space-y-1.5">
          {track.events.map((event, i) => (
            <li key={`${event.at}-${i}`} className="flex items-start gap-2 text-[12px]">
              <CircleDashed
                className={cn(
                  "mt-0.5 size-3 shrink-0",
                  event.tone === "good"
                    ? "text-royal"
                    : event.tone === "bad"
                      ? "text-warning"
                      : "text-muted-foreground",
                )}
                strokeWidth={1.8}
              />
              <span className="text-muted-foreground">{event.label}</span>
              <span className="ml-auto font-mono text-[11px] text-muted-foreground/80">
                {clock(event.at)}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      {active ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Studio keeps watching this task on the server, so the scene status keeps moving even if
          you leave this page.
        </p>
      ) : null}
    </div>
  );
}
