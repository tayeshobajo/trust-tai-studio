import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, Clapperboard, Film, Loader2, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";

import { SuiteShell } from "@/components/studio/SuiteShell";
import { AssetMemory } from "@/components/studio/AssetMemory";
import { listReviewQueue } from "@/lib/studio/assets.functions";
import { approveAsset, requestChanges } from "@/lib/studio/review.functions";
import {
  approveDirectedStory,
  listStoryQueue,
  rejectDirectedStory,
} from "@/lib/studio/story-review.functions";
import { formatLabels } from "@/lib/studio-data";
import type { StoryReviewItem } from "@/lib/studio/story-review.server";
import type { StudioAssetSummary } from "@/lib/studio/assets.server";

export const Route = createFileRoute("/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals — Trust Tai Studio" },
      {
        name: "description",
        content:
          "Work stored in Studio and waiting on a human decision: approve it to the World, or tell Studio what should change.",
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

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ReviewCard({
  asset,
  onDone,
}: {
  asset: StudioAssetSummary;
  onDone: () => void;
}) {
  const approve = useServerFn(approveAsset);
  const askForChanges = useServerFn(requestChanges);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  const approving = useMutation({
    mutationFn: () => approve({ data: { assetId: asset.assetId, note: null } }),
    onSuccess: (result) => {
      if (result.ok) {
        toast("Approved to World", { description: "Recorded as canon in the Active World." });
        onDone();
      } else {
        toast("Not approved", { description: result.error.message });
      }
    },
  });

  const changing = useMutation({
    mutationFn: (feedback: string) =>
      askForChanges({ data: { assetId: asset.assetId, feedback } }),
    onSuccess: (result) => {
      if (result.ok) {
        toast("Saved to the World's memory", {
          description: "The scene is back for another pass.",
        });
        setOpen(false);
        setNote("");
        onDone();
      } else {
        toast("Not saved", { description: result.error.message });
      }
    },
  });

  const busy = approving.isPending || changing.isPending;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-tt">
      {asset.previewUrl ? (
        asset.assetType === "video" ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={asset.previewUrl} controls playsInline className="aspect-video w-full object-cover" />
        ) : (
          <img
            src={asset.previewUrl}
            alt={
              asset.storyTitle
                ? `Frame from ${asset.storyTitle}`
                : "Generated frame awaiting review"
            }
            loading="lazy"
            className="aspect-video w-full object-cover"
          />
        )
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-secondary text-[12px] text-muted-foreground">
          Preview link unavailable
        </div>
      )}

      <div className="p-5">
        <div className="eyebrow truncate">
          {asset.assetType === "video" ? "Film" : "Image"}
          {asset.worldName ? ` · ${asset.worldName}` : ""}
        </div>
        <h2 className="mt-1 truncate font-display text-xl leading-tight">
          {asset.storyTitle ?? "Untitled Story"}
        </h2>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {asset.sceneNumber != null ? `Scene ${String(asset.sceneNumber).padStart(2, "0")} · ` : ""}
          Stored in Studio · Ready for review
          {asset.createdAt ? ` · ${formatDate(asset.createdAt)}` : ""}
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => approving.mutate()}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[13px] text-primary-foreground disabled:opacity-50"
          >
            {approving.isPending ? (
              <Loader2 className="size-3.5 animate-spin" strokeWidth={1.8} />
            ) : (
              <Sparkles className="size-3.5" strokeWidth={1.8} />
            )}
            Approve to World
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[13px] transition-colors hover:bg-secondary disabled:opacity-50"
          >
            <Clapperboard className="size-3.5" strokeWidth={1.8} />
            Request changes
          </button>
        </div>

        {open ? (
          <div className="mt-3">
            <label htmlFor={`learn-${asset.assetId}`} className="eyebrow">
              What should Studio learn from this?
            </label>
            <textarea
              id={`learn-${asset.assetId}`}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="The character changed. / This does not feel like the Trust Tai World."
              className="mt-2 w-full resize-none rounded-xl border border-border bg-background p-3 text-[13px] leading-relaxed outline-none focus:border-royal"
            />
            <button
              type="button"
              disabled={note.trim().length < 3 || busy}
              onClick={() => changing.mutate(note.trim())}
              className="mt-2 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[13px] hover:bg-secondary disabled:opacity-50"
            >
              Save to the World's memory
            </button>
          </div>
        ) : null}

        <AssetMemory assetId={asset.assetId} />
      </div>
    </article>
  );
}

function StoryReviewCard({ story, onDone }: { story: StoryReviewItem; onDone: () => void }) {
  const approveFn = useServerFn(approveDirectedStory);
  const rejectFn = useServerFn(rejectDirectedStory);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const approving = useMutation({
    mutationFn: () => approveFn({ data: { storyId: story.storyId } }),
    onSuccess: (r) => {
      if (!r.ok) {
        toast("Could not approve", { description: r.error.message });
        return;
      }
      toast("Story approved", { description: `${story.title} is moving forward.` });
      onDone();
    },
  });

  const rejecting = useMutation({
    mutationFn: (text: string) => rejectFn({ data: { storyId: story.storyId, reason: text } }),
    onSuccess: (r) => {
      if (!r.ok) {
        toast("Could not reject", { description: r.error.message });
        return;
      }
      toast("Sent back", { description: "Studio will remember why." });
      setOpen(false);
      setReason("");
      onDone();
    },
  });

  const busy = approving.isPending || rejecting.isPending;

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-tt">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="eyebrow flex items-center gap-2">
            <Film className="size-3.5 text-royal" strokeWidth={1.8} />
            Directed Story
            {story.worldName ? ` · ${story.worldName}` : ""}
          </div>
          <h3 className="mt-1 font-display text-2xl leading-tight">{story.title}</h3>
          {story.premise ? (
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
              {story.premise}
            </p>
          ) : null}
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">
            {story.sceneCount} scene{story.sceneCount === 1 ? "" : "s"}
            {story.outputs.length
              ? ` · ${story.outputs.map((o) => formatLabels[o.format] ?? o.format).join(", ")}`
              : ""}
          </p>
        </div>
        <Link
          to="/production"
          search={{ story: story.storyId }}
          className="rounded-full border border-border px-4 py-2 text-[13px] transition-colors hover:bg-secondary"
        >
          Open in Production
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => approving.mutate()}
          className="inline-flex items-center gap-2 rounded-full bg-royal px-4 py-2 text-[13px] text-royal-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {approving.isPending ? (
            <Loader2 className="size-3.5 animate-spin" strokeWidth={1.8} />
          ) : (
            <CheckCircle2 className="size-3.5" strokeWidth={1.8} />
          )}
          Approve Story
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[13px] transition-colors hover:bg-secondary disabled:opacity-50"
        >
          <XCircle className="size-3.5" strokeWidth={1.8} />
          Send back
        </button>
      </div>

      {open ? (
        <div className="mt-3">
          <label htmlFor={`story-reason-${story.storyId}`} className="eyebrow">
            Why is this not right yet?
          </label>
          <textarea
            id={`story-reason-${story.storyId}`}
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="The premise is not the real truth here."
            className="mt-2 w-full resize-none rounded-xl border border-border bg-background p-3 text-[13px] leading-relaxed outline-none focus:border-royal"
          />
          <button
            type="button"
            disabled={reason.trim().length < 3 || busy}
            onClick={() => rejecting.mutate(reason.trim())}
            className="mt-2 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[13px] hover:bg-secondary disabled:opacity-50"
          >
            Send back with this note
          </button>
        </div>
      ) : null}
    </article>
  );
}



function ApprovalsPage() {
  const fetchQueue = useServerFn(listReviewQueue);
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["studio", "review-queue"],
    queryFn: () => fetchQueue(),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["studio", "review-queue"] });
  };

  const items = data?.ok ? data.data : [];

  return (
    <SuiteShell>
      <div className="wash-royal">
        <div className="mx-auto max-w-[1180px] px-6 pt-12 pb-20 lg:px-12">
          <div className="eyebrow">Approvals</div>
          <h1 className="mt-2 font-display text-[2.5rem] leading-[1.1] tracking-tight lg:text-[3rem]">
            Nothing goes out without you.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Work that is stored in Studio and waiting on a human decision.
          </p>

          {isPending ? (
            <p className="mt-8 flex items-center gap-2 font-mono text-[12px] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" strokeWidth={1.8} />
              Reading the review queue…
            </p>
          ) : data && !data.ok ? (
            <div className="mt-8 rounded-2xl border border-dashed border-border p-8">
              <p className="font-display text-xl">Studio memory is not connected yet.</p>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                The review queue reads durable assets from Studio storage. Add these server
                environment variables to this environment and the queue will populate itself:
              </p>
              <ul className="mt-3 space-y-1 font-mono text-[12px] text-muted-foreground">
                <li>STUDIO_SUPABASE_URL</li>
                <li>STUDIO_SUPABASE_SERVICE_ROLE_KEY</li>
              </ul>
            </div>
          ) : items.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center">
              <p className="font-display text-xl">Nothing is waiting on you.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Generated work appears here once it is stored in Studio.
              </p>
            </div>
          ) : (
            <>
              <p className="mt-8 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                <CheckCircle2 className="size-3.5" strokeWidth={1.75} />
                {items.length} {items.length === 1 ? "item is" : "items are"} waiting on a decision.
              </p>
              <div className="mt-4 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((asset) => (
                  <ReviewCard key={asset.assetId} asset={asset} onDone={invalidate} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </SuiteShell>
  );
}
