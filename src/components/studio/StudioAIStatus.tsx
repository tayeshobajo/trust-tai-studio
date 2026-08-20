/**
 * Studio AI status strip for Home.
 *
 * Reads booleans and counts from the server — never credentials — and offers a
 * one-click live Discovery check so a human can confirm the brain answers.
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, CheckCircle2, Loader2, AlertTriangle, Sparkles } from "lucide-react";

import { getStudioStatus, runStudioAICheck } from "@/lib/studio/status.functions";
import { cn } from "@/lib/utils";

function Dot({ tone }: { tone: "on" | "off" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        tone === "on" ? "bg-success" : "bg-muted-foreground/50",
      )}
    />
  );
}

function Item({ label, ready, detail }: { label: string; ready: boolean; detail: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1.5">
        <Dot tone={ready ? "on" : "off"} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
    </div>
  );
}

function relative(iso: string | null): string {
  if (!iso) return "no Story yet";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "moments ago";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function StudioAIStatus() {
  const fetchStatus = useServerFn(getStudioStatus);
  const check = useServerFn(runStudioAICheck);

  const { data, isPending } = useQuery({
    queryKey: ["studio", "ai-status"],
    queryFn: () => fetchStatus(),
    staleTime: 60_000,
  });

  const probe = useMutation({ mutationFn: () => check() });

  const status = data?.ok ? data.data : null;
  const live = probe.data?.ok ? probe.data.data : null;

  const overall = status
    ? status.discoveryConfigured && status.memoryConfigured
      ? "Studio AI is ready"
      : status.discoveryConfigured
        ? "Studio AI can think, but cannot remember"
        : "Studio AI is not connected"
    : "Checking Studio AI…";

  return (
    <section className="mt-4 rounded-2xl border border-border bg-card/60 p-4 lg:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="lg:w-56 lg:shrink-0">
          <div className="eyebrow flex items-center gap-2">
            <Activity className="size-3.5 text-royal" strokeWidth={1.8} />
            Studio AI · Discovery
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" strokeWidth={1.8} />
            ) : status?.discoveryConfigured ? (
              <CheckCircle2 className="size-3.5 text-success" strokeWidth={1.8} />
            ) : (
              <AlertTriangle className="size-3.5 text-warning" strokeWidth={1.8} />
            )}
            {overall}
          </p>
        </div>

        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <Item
            label="Discovery brain"
            ready={Boolean(status?.discoveryConfigured)}
            detail={
              status?.discoveryConfigured
                ? `Last Story ${relative(status.lastDiscoveryAt)}`
                : "No creative brain configured on the server"
            }
          />
          <Item
            label="Studio memory"
            ready={Boolean(status?.memoryConfigured)}
            detail={
              status?.memoryConfigured
                ? `${status.storyCount ?? 0} ${status.storyCount === 1 ? "Story" : "Stories"} · ${status.awaitingReview ?? 0} awaiting review`
                : "Stories and assets are not being stored"
            }
          />
          <Item
            label="Production engine"
            ready={Boolean(status?.productionConfigured)}
            detail={
              status?.productionConfigured
                ? `${status?.worldName ?? "Active World"}${status?.canonVersion ? ` · ${status.canonVersion}` : ""}`
                : "Frames and films cannot be rendered yet"
            }
          />
        </div>

        <div className="lg:shrink-0">
          <button
            type="button"
            onClick={() => probe.mutate()}
            disabled={probe.isPending}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-[13px] transition-colors hover:bg-secondary disabled:opacity-50"
          >
            {probe.isPending ? (
              <Loader2 className="size-3.5 animate-spin" strokeWidth={1.8} />
            ) : (
              <Sparkles className="size-3.5" strokeWidth={1.8} />
            )}
            {probe.isPending ? "Listening…" : "Run AI Discovery check"}
          </button>
        </div>
      </div>

      {probe.isPending ? (
        <p className="mt-3 border-t border-border pt-3 text-[13px] text-muted-foreground">
          Finding the story beneath the surface…
        </p>
      ) : live ? (
        <div className="mt-3 border-t border-border pt-3">
          <p className="flex items-center gap-2 text-[13px]">
            {live.ok ? (
              <CheckCircle2 className="size-3.5 text-success" strokeWidth={1.8} />
            ) : (
              <AlertTriangle className="size-3.5 text-warning" strokeWidth={1.8} />
            )}
            {live.message}
          </p>
          {live.sample ? (
            <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-muted-foreground italic">
              &ldquo;{live.sample}&rdquo;
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
