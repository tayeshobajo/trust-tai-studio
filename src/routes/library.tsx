import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";

import { SuiteShell } from "@/components/studio/SuiteShell";
import { AssetMemory } from "@/components/studio/AssetMemory";
import { listLibraryAssets } from "@/lib/studio/assets.functions";
import type { StudioAssetSummary } from "@/lib/studio/assets.server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Library — Trust Tai Studio" },
      {
        name: "description",
        content:
          "Approved, canon work in the Trust Tai World — every frame and film a human signed off on.",
      },
      { property: "og:title", content: "Library — Trust Tai Studio" },
      {
        property: "og:description",
        content: "Story-first library of approved canon assets in the Trust Tai World.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LibraryPage,
});

type Kind = "all" | "image" | "video";

const kindFilters: { value: Kind; label: string }[] = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Films" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function LibraryCard({ asset }: { asset: StudioAssetSummary }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-tt transition-transform duration-300 hover:-translate-y-1">
      {asset.previewUrl ? (
        asset.assetType === "video" ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={asset.previewUrl} controls playsInline className="aspect-video w-full object-cover" />
        ) : (
          <img
            src={asset.previewUrl}
            alt={asset.storyTitle ? `Canon frame from ${asset.storyTitle}` : "Canon frame"}
            loading="lazy"
            className="aspect-video w-full object-cover"
          />
        )
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-secondary text-[12px] text-muted-foreground">
          Preview link unavailable
        </div>
      )}
      <div className="p-4">
        <div className="eyebrow truncate">
          {asset.assetType === "video" ? "Film" : "Image"}
          {asset.worldName ? ` · ${asset.worldName}` : ""}
        </div>
        <h2 className="mt-0.5 truncate font-display text-lg leading-tight">
          {asset.storyTitle ?? "Untitled Story"}
        </h2>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {asset.sceneNumber != null ? `Scene ${String(asset.sceneNumber).padStart(2, "0")} · ` : ""}
          Canon
          {asset.createdAt ? ` · ${formatDate(asset.createdAt)}` : ""}
        </p>
        <AssetMemory assetId={asset.assetId} />
      </div>
    </article>
  );
}

function LibraryPage() {
  const fetchLibrary = useServerFn(listLibraryAssets);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind>("all");

  const { data, isPending } = useQuery({
    queryKey: ["studio", "library"],
    queryFn: () => fetchLibrary(),
  });

  const items = data?.ok ? data.data : [];

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (item) =>
        (kind === "all" || item.assetType === kind) &&
        (q === "" || (item.storyTitle ?? "").toLowerCase().includes(q)),
    );
  }, [items, kind, query]);

  return (
    <SuiteShell>
      <div className="wash-royal">
        <div className="mx-auto max-w-[1180px] px-6 pt-12 pb-20 lg:px-12">
          <div className="eyebrow">Library</div>
          <h1 className="mt-2 font-display text-[2.5rem] leading-[1.1] tracking-tight lg:text-[3rem]">
            Everything the Studio has made real.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Approved, canon work in the Active World. Nothing appears here until a human signs it
            off.
          </p>

          <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search approved work by Story"
                aria-label="Search the Library"
                className="h-12 w-full rounded-full border border-border bg-card pr-4 pl-11 text-sm outline-none focus:border-royal"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {kindFilters.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setKind(f.value)}
                  className={cn(
                    "h-10 rounded-full border px-4 text-sm transition-colors",
                    kind === f.value
                      ? "border-royal bg-royal-soft text-royal"
                      : "border-border text-foreground/80 hover:bg-secondary",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {isPending ? (
            <p className="mt-8 flex items-center gap-2 font-mono text-[12px] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" strokeWidth={1.8} />
              Reading the Library…
            </p>
          ) : data && !data.ok ? (
            <div className="mt-8 rounded-2xl border border-dashed border-border p-8">
              <p className="font-display text-xl">Studio memory is not connected yet.</p>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                The Library reads approved assets from Studio storage. Add these server environment
                variables and approved work will appear here:
              </p>
              <ul className="mt-3 space-y-1 font-mono text-[12px] text-muted-foreground">
                <li>STUDIO_SUPABASE_URL</li>
                <li>STUDIO_SUPABASE_SERVICE_ROLE_KEY</li>
              </ul>
            </div>
          ) : (
            <>
              <p className="mt-4 font-mono text-[11px] text-muted-foreground">
                {results.length} item{results.length === 1 ? "" : "s"}
              </p>
              <div className="mt-4 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((asset) => (
                  <LibraryCard key={asset.assetId} asset={asset} />
                ))}
              </div>
              {results.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-border p-12 text-center">
                  <p className="font-display text-xl">Nothing approved yet.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Approve work in Approvals and it lands here as canon.
                  </p>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </SuiteShell>
  );
}
