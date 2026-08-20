/**
 * Details view for one durable asset: what the World remembers about it, plus
 * an explicit "Run AI Discovery" action that asks Studio AI for the first
 * creative direction on this piece of work.
 *
 * Studio AI is only ever called when the human clicks.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Brain, ChevronDown, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { getAssetMemory, runAssetDiscovery } from "@/lib/studio/asset-memory.functions";
import type { CreativeMemoryEntry } from "@/lib/studio/ai-types";
import { cn } from "@/lib/utils";

const dispositionLabels: Record<string, string> = {
  approved_pattern: "Approved",
  rejected_pattern: "Rejected",
  observation: "Change requested",
  studio_ai_direction: "Studio AI direction",
};

function MemoryRow({ entry }: { entry: CreativeMemoryEntry }) {
  return (
    <li className="border-t border-border pt-2 first:border-none first:pt-0">
      <div className="flex items-center gap-2 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
        {entry.fromStudioAI ? <Brain className="size-3" strokeWidth={1.8} /> : null}
        {dispositionLabels[entry.disposition ?? ""] ?? entry.disposition ?? "Note"}
        {entry.classification ? ` · ${entry.classification}` : ""}
        {entry.createdAt
          ? ` · ${new Date(entry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
          : ""}
      </div>
      <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground">
        {entry.feedback}
      </p>
    </li>
  );
}

export function AssetMemory({
  assetId,
  defaultOpen = false,
}: {
  assetId: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const fetchMemory = useServerFn(getAssetMemory);
  const direct = useServerFn(runAssetDiscovery);
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ["studio", "asset-memory", assetId],
    queryFn: () => fetchMemory({ data: { assetId } }),
    enabled: open,
  });

  const discovery = useMutation({
    mutationFn: () => direct({ data: { assetId } }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast("Studio AI could not direct this", { description: result.error.message });
        return;
      }
      toast("Studio AI has given its direction", {
        description: result.data.persisted
          ? "Saved to the World's creative memory."
          : (result.data.note ?? "Direction was not saved."),
      });
      void queryClient.invalidateQueries({ queryKey: ["studio", "asset-memory", assetId] });
    },
  });

  const entries = data?.ok ? data.data : [];

  return (
    <div className="mt-4 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[12px] text-foreground/80 hover:text-royal"
          aria-expanded={open}
        >
          <ChevronDown
            className={cn("size-3.5 transition-transform", open && "rotate-180")}
            strokeWidth={1.8}
          />
          Details · Studio AI memory
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            discovery.mutate();
          }}
          disabled={discovery.isPending}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] transition-colors hover:bg-secondary disabled:opacity-50"
        >
          {discovery.isPending ? (
            <Loader2 className="size-3 animate-spin" strokeWidth={1.8} />
          ) : (
            <Sparkles className="size-3" strokeWidth={1.8} />
          )}
          {discovery.isPending ? "Studio AI is looking…" : "Run AI Discovery"}
        </button>
      </div>

      {open ? (
        <div className="mt-3">
          {isPending ? (
            <p className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <Loader2 className="size-3 animate-spin" strokeWidth={1.8} />
              Reading the World&rsquo;s memory…
            </p>
          ) : data && !data.ok ? (
            <p className="text-[12px] text-muted-foreground">{data.error.message}</p>
          ) : entries.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">
              Nothing recorded yet. Run AI Discovery for the first creative direction, or approve
              and request changes to build the memory.
            </p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry) => (
                <MemoryRow key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
