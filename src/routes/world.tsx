import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Palette, Film, Lock, UploadCloud, ShieldCheck } from "lucide-react";

import { SuiteShell } from "@/components/studio/SuiteShell";
import {
  activeWorld,
  approvedScenes,
  visualLanguage,
  worldBible,
} from "@/lib/studio-data";

export const Route = createFileRoute("/world")({
  head: () => ({
    meta: [
      { title: "The Trust Tai World — Trust Tai Studio" },
      {
        name: "description",
        content:
          "The World of Living Roads at Canon v1.0: world bible, visual language, and approved scenes that every Story must obey.",
      },
      { property: "og:title", content: "The Trust Tai World — Trust Tai Studio" },
      {
        property: "og:description",
        content: "World bible, visual language, and approved scenes at Canon v1.0.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorldPage,
});

function WorldPage() {
  return (
    <SuiteShell>
      <div className="wash-royal">
        <div className="mx-auto max-w-[1180px] px-6 pt-12 pb-20 lg:px-12">
          <section className="flex flex-col gap-6 lg:flex-row lg:items-end">
            <img
              src={activeWorld.thumbnail}
              alt=""
              width={512}
              height={512}
              className="size-28 rounded-2xl object-cover shadow-tt"
            />
            <div>
              <div className="eyebrow">Active World</div>
              <h1 className="mt-1 font-display text-[2.5rem] leading-[1.1] tracking-tight lg:text-[3rem]">
                {activeWorld.name}
              </h1>
              <p className="mt-1 text-[15px] text-muted-foreground">{activeWorld.subtitle}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-royal/30 bg-royal-soft px-3 py-1 font-mono text-[11px] text-royal">
                  {activeWorld.canon}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 font-mono text-[11px] text-muted-foreground">
                  <Lock className="size-3" strokeWidth={1.75} />
                  Canon locked
                </span>
              </div>
            </div>
          </section>

          {/* World bible */}
          <section className="mt-14">
            <div className="flex items-center gap-2">
              <BookOpen className="size-5 text-royal" strokeWidth={1.6} />
              <h2 className="font-display text-3xl tracking-tight">World Bible</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              The truths every Story in this World inherits.
            </p>
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              {worldBible.map((entry) => (
                <article key={entry.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="eyebrow">{entry.title}</div>
                  <p className="mt-2 text-[15px] leading-relaxed">{entry.body}</p>
                </article>
              ))}
              <article className="rounded-2xl border border-dashed border-border p-5">
                <div className="eyebrow">Characters</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Character canon arrives with the World editor.
                </p>
              </article>
              <article className="rounded-2xl border border-dashed border-border p-5">
                <div className="eyebrow">Locations</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Living Roads locations will be defined here.
                </p>
              </article>
              <article className="rounded-2xl border border-dashed border-border p-5">
                <div className="eyebrow">Narrative rules</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Constraints Studio AI must respect on every draft.
                </p>
              </article>
            </div>
          </section>

          {/* Visual language */}
          <section className="mt-14">
            <div className="flex items-center gap-2">
              <Palette className="size-5 text-royal" strokeWidth={1.6} />
              <h2 className="font-display text-3xl tracking-tight">Visual Language</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Palette, type, and light the production engine renders against.
            </p>

            <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="eyebrow">Palette</div>
                <div className="mt-4 grid gap-4 sm:grid-cols-4">
                  {visualLanguage.map((c) => (
                    <div key={c.id}>
                      <div
                        className="h-16 w-full rounded-xl border border-border"
                        style={{ background: c.swatch }}
                      />
                      <div className="mt-2 text-sm font-medium">{c.label}</div>
                      <div className="text-xs text-muted-foreground">{c.note}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="eyebrow">Typography</div>
                <p className="mt-3 font-display text-3xl leading-tight">
                  Cormorant Garamond — editorial voice
                </p>
                <p className="mt-2 text-sm">Inter — interface and body</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  JetBrains Mono — metadata
                </p>
                <div className="mt-5 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Light, lens, and grade references arrive with the visual canon editor.
                </div>
              </div>
            </div>
          </section>

          {/* Approved scenes */}
          <section className="mt-14">
            <div className="flex items-center gap-2">
              <Film className="size-5 text-royal" strokeWidth={1.6} />
              <h2 className="font-display text-3xl tracking-tight">Approved Scenes</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Scenes admitted into canon. Studio AI treats these as reference.
            </p>
            <div className="mt-5 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {approvedScenes.map((scene) => (
                <figure
                  key={scene.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-tt"
                >
                  <img
                    src={scene.image}
                    alt={scene.title}
                    width={1200}
                    height={750}
                    loading="lazy"
                    className="h-40 w-full object-cover"
                  />
                  <figcaption className="p-4">
                    <div className="font-display text-lg leading-tight">{scene.title}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {scene.canon}
                    </div>
                  </figcaption>
                </figure>
              ))}
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Newly approved scenes will appear here as production continues.
              </div>
            </div>
          </section>

          {/* World bible upload + creative rules */}
          <section className="mt-14 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6">
              <div className="flex items-center gap-2">
                <UploadCloud className="size-5 text-royal" strokeWidth={1.6} />
                <h2 className="font-display text-2xl tracking-tight">World Bible upload</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Drop the written canon — documents, references, transcripts — so Studio AI can
                read from the source instead of guessing.
              </p>
              <div className="mt-5 rounded-xl border border-border p-5 text-sm text-muted-foreground">
                Uploading is unavailable until Studio file storage is connected.
              </div>
              <div className="mt-4 font-mono text-[11px] text-muted-foreground">
                {activeWorld.canon} · canon version is set here once editing is enabled
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-royal" strokeWidth={1.6} />
                <h2 className="font-display text-2xl tracking-tight">Creative rules</h2>
              </div>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="border-l-2 border-royal/40 pl-3">
                  Every output begins as a Story. Never write to a channel first.
                </li>
                <li className="border-l-2 border-royal/40 pl-3">
                  Calm, editorial, unhurried. Peer to peer, never audience-facing.
                </li>
                <li className="border-l-2 border-royal/40 pl-3">
                  Nothing enters canon without human approval.
                </li>
              </ul>
              <div className="mt-5 rounded-xl border border-dashed border-border p-4">
                <div className="eyebrow">Anti-drift rules</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Hard constraints Studio AI and the production engine must not violate.
                  Placeholder until the World editor lands.
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </SuiteShell>
  );
}
