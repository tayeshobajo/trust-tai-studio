import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { SuiteShell } from "@/components/studio/SuiteShell";
import {
  formatLabels,
  libraryItems,
  statusLabels,
  type LibraryKind,
  type StoryStatus,
} from "@/lib/studio-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Library — Trust Tai Studio" },
      {
        name: "description",
        content:
          "Browse and search every Story, draft, and asset in production across the Trust Tai World.",
      },
      { property: "og:title", content: "Library — Trust Tai Studio" },
      {
        property: "og:description",
        content: "Story-first library of drafts, films, and assets in progress.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LibraryPage,
});

const kindFilters: { value: LibraryKind | "all"; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "story", label: "Stories" },
  { value: "draft", label: "Drafts" },
  { value: "asset", label: "Assets in progress" },
];

const statusTone: Record<StoryStatus, string> = {
  drafting: "border-border text-muted-foreground",
  in_production: "border-royal/30 bg-royal-soft text-royal",
  ready_for_approval: "border-success/30 text-success",
  live: "border-border bg-secondary text-foreground/80",
};

function LibraryPage() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<LibraryKind | "all">("all");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return libraryItems.filter(
      (item) =>
        (kind === "all" || item.kind === kind) &&
        (q === "" ||
          item.title.toLowerCase().includes(q) ||
          item.note.toLowerCase().includes(q) ||
          formatLabels[item.format].toLowerCase().includes(q)),
    );
  }, [query, kind]);

  return (
    <SuiteShell>
      <div className="wash-royal">
        <div className="mx-auto max-w-[1180px] px-6 pt-12 pb-20 lg:px-12">
          <div className="eyebrow">Library</div>
          <h1 className="mt-2 font-display text-[2.5rem] leading-[1.1] tracking-tight lg:text-[3rem]">
            Everything the Studio has made or is making.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Story-first. Drafts and assets live under the Story they belong to.
          </p>

          <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search stories, drafts, and assets"
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

          <p className="mt-4 font-mono text-[11px] text-muted-foreground">
            {results.length} item{results.length === 1 ? "" : "s"}
          </p>

          <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((item) => (
              <article
                key={item.id}
                className="group flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-tt transition-transform duration-300 hover:-translate-y-1"
              >
                <img
                  src={item.image}
                  alt=""
                  width={512}
                  height={512}
                  loading="lazy"
                  className="size-20 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="eyebrow truncate">{formatLabels[item.format]}</div>
                  <h2 className="mt-0.5 truncate font-display text-lg leading-tight">
                    {item.title}
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">{item.note}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[11px]",
                        statusTone[item.status],
                      )}
                    >
                      {statusLabels[item.status]}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {item.updatedLabel}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {results.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border p-12 text-center">
              <p className="font-display text-xl">Nothing here yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different search, or start something new in Create.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </SuiteShell>
  );
}
