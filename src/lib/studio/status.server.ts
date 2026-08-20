/**
 * Studio AI status — server-only.
 *
 * Answers one honest question for the Home screen: is Studio AI actually able
 * to run Discovery right now? Presence of credentials is reported as a boolean
 * only — values are never read into the response, logged, or serialised.
 */

import type { ServiceResult } from "./ai-types";

export interface StudioAIStatus {
  /** True when the creative brain has a key on the server. */
  discoveryConfigured: boolean;
  /** True when the production engine has a key on the server. */
  productionConfigured: boolean;
  /** True when Studio memory (database + storage) is reachable. */
  memoryConfigured: boolean;
  studioName: string | null;
  worldName: string | null;
  canonVersion: string | null;
  /** Stories Studio has actually discovered. */
  storyCount: number | null;
  /** Durable assets waiting on a human decision. */
  awaitingReview: number | null;
  /** When Studio AI last produced a Story here. */
  lastDiscoveryAt: string | null;
  /** Honest note when something is not wired. */
  note: string | null;
}

export interface StudioAIProbe {
  ok: boolean;
  /** Round trip in ms for a minimal live Discovery call. */
  latencyMs: number;
  /** A short line of the model's own output, proving the round trip is real. */
  sample: string | null;
  message: string;
}

export async function getStudioAIStatus(): Promise<ServiceResult<StudioAIStatus>> {
  const discoveryConfigured = Boolean(process.env["OPENAI_API_KEY"]);
  const productionConfigured = Boolean(process.env["RUNWAY_API_KEY"]);

  const { getServerSupabase } = await import("./db.server");
  const db = getServerSupabase();

  const base: StudioAIStatus = {
    discoveryConfigured,
    productionConfigured,
    memoryConfigured: Boolean(db),
    studioName: null,
    worldName: null,
    canonVersion: null,
    storyCount: null,
    awaitingReview: null,
    lastDiscoveryAt: null,
    note: null,
  };

  if (!discoveryConfigured) {
    base.note = "Studio AI has no creative brain configured on this server yet.";
  }

  if (!db) {
    return {
      ok: true,
      data: {
        ...base,
        note: base.note ?? "Studio memory is not connected on this server.",
      },
    };
  }

  const { resolveStudioContext } = await import("./studio-config.server");
  const ctx = await resolveStudioContext();

  let canonVersion: string | null = null;
  if (ctx.worldId) {
    const { data } = await db.from("worlds").select("canon_version").eq("id", ctx.worldId).maybeSingle();
    canonVersion = (data?.["canon_version"] as string | undefined) ?? null;
  }

  const [{ count: storyCount }, { count: awaitingReview }, { data: latest }] = await Promise.all([
    db.from("stories").select("id", { count: "exact", head: true }),
    db
      .from("assets")
      .select("id", { count: "exact", head: true })
      .not("storage_path", "is", null)
      .eq("status", "ready")
      .eq("is_canon", false),
    db.from("stories").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  return {
    ok: true,
    data: {
      ...base,
      studioName: ctx.studioName,
      worldName: ctx.worldName,
      canonVersion,
      storyCount: storyCount ?? 0,
      awaitingReview: awaitingReview ?? 0,
      lastDiscoveryAt: (latest?.["created_at"] as string | undefined) ?? null,
    },
  };
}

/**
 * One minimal, real Discovery call so a human can confirm the loop works.
 * Kept deliberately tiny: a single short source line, nothing persisted.
 */
export async function probeStudioAI(): Promise<ServiceResult<StudioAIProbe>> {
  const started = Date.now();
  const { studioAI } = await import("./studio-ai.server");
  const { getWorldCreativeContext } = await import("./studio-config.server");
  const world = await getWorldCreativeContext();

  const result = await studioAI.discoverStory({
    sourceText:
      "A quick systems check: someone said the hardest part of their week was admitting they were the bottleneck.",
    world: { name: world.name, canonVersion: world.canonVersion },
    requestedOutputs: [],
  });

  const latencyMs = Date.now() - started;

  if (!result.ok) {
    return {
      ok: true,
      data: {
        ok: false,
        latencyMs,
        sample: null,
        message: result.error.message,
      },
    };
  }

  return {
    ok: true,
    data: {
      ok: true,
      latencyMs,
      sample: result.data.deeperHumanTruth.slice(0, 160),
      message: `Studio AI answered in ${(latencyMs / 1000).toFixed(1)}s.`,
    },
  };
}
