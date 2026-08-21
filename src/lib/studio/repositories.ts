/**
 * Repository boundary.
 *
 * UI talks to these interfaces. Today they resolve against the seed data in
 * `studio-data.ts` and localStorage (Supabase tables are not reachable yet).
 * When Suite identity + RLS policies are wired, swap the implementations for
 * Supabase-backed ones without touching a single component.
 */

import {
  approvals as seedApprovals,
  activeWorld as seedWorld,
  inProduction,
  libraryItems,
} from "@/lib/studio-data";
import { getSupabase, isSupabaseConfigured } from "./supabase-client";
import type {
  Approval,
  Asset,
  CreativeFeedback,
  DraftSource,
  Scene,
  Story,
  StoryOutput,
  StorySource,
  Studio,
  World,
} from "./types";

export interface Repository<T> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
}

export interface StudioRepository extends Repository<Studio> {}
export interface WorldRepository extends Repository<World> {
  active(): Promise<World | null>;
}
export interface StoryRepository extends Repository<Story> {}
export interface StorySourceRepository extends Repository<StorySource> {}
export interface StoryOutputRepository extends Repository<StoryOutput> {}
export interface SceneRepository extends Repository<Scene> {}
export interface AssetRepository extends Repository<Asset> {}
export interface ApprovalRepository extends Repository<Approval> {}
export interface CreativeFeedbackRepository extends Repository<CreativeFeedback> {}

/** Live database availability, surfaced to the UI as an honest state. */
export const dataLayerStatus = {
  configured: isSupabaseConfigured,
  connected: () => getSupabase() !== null,
  reason: isSupabaseConfigured
    ? "Credentials present. Tables and Suite auth policies still pending."
    : "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are not set.",
};

const notConnected = async <T>(): Promise<T[]> => [];

/* ---------- V1 implementations (seed-backed, read-only) ---------- */

export const worldRepository: WorldRepository = {
  async list() {
    return [await this.active()].filter(Boolean) as World[];
  },
  async get(id) {
    const w = await this.active();
    return w && w.id === id ? w : null;
  },
  async active() {
    return {
      id: seedWorld.id,
      studioId: "studio-trust-tai",
      name: seedWorld.name,
      subtitle: seedWorld.subtitle,
      canonVersion: seedWorld.canon,
      bible: null,
      createdAt: new Date(0).toISOString(),
    };
  },
};

export const studioRepository: StudioRepository = {
  async list() {
    return [
      {
        id: "studio-trust-tai",
        organizationId: null,
        name: "Trust Tai Studio",
        activeWorldId: seedWorld.id,
        createdAt: new Date(0).toISOString(),
      },
    ];
  },
  async get(id) {
    return (await this.list()).find((s) => s.id === id) ?? null;
  },
};

export const storyRepository: StoryRepository = {
  async list() {
    return inProduction.map((s) => ({
      id: s.id,
      worldId: seedWorld.id,
      title: s.title,
      sourceTruth: null,
      deeperTruth: null,
      premise: s.premise,
      whyItMatters: null,
      recommendedAngle: null,
      // Legacy display seed uses "drafting"; the live DB canon is "draft".
      status: s.status === "drafting" ? "draft" : s.status === "live" ? "published" : s.status,
      createdAt: new Date(0).toISOString(),
    }));
  },
  async get(id) {
    return (await this.list()).find((s) => s.id === id) ?? null;
  },
};

export const approvalRepository: ApprovalRepository = {
  async list() {
    return seedApprovals.map((a) => ({
      id: a.id,
      storyId: null,
      storyOutputId: null,
      sceneId: null,
      decision: "pending" as const,
      note: a.directorNote,
      createdAt: new Date(0).toISOString(),
    }));
  },
  async get(id) {
    return (await this.list()).find((a) => a.id === id) ?? null;
  },
};

export const storySourceRepository: StorySourceRepository = {
  list: notConnected,
  get: async () => null,
};
export const storyOutputRepository: StoryOutputRepository = {
  list: notConnected,
  get: async () => null,
};
export const sceneRepository: SceneRepository = { list: notConnected, get: async () => null };
export const assetRepository: AssetRepository = { list: notConnected, get: async () => null };
export const creativeFeedbackRepository: CreativeFeedbackRepository = {
  list: notConnected,
  get: async () => null,
};

/** Library items are a read view across stories, outputs, and assets. */
export const libraryView = { list: async () => libraryItems };

/* ---------- Local draft persistence (until Studio AI is connected) ---------- */

const DRAFT_KEY = "trust-tai-studio:create-drafts";

export const draftStore = {
  all(): DraftSource[] {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? "[]") as DraftSource[];
    } catch {
      return [];
    }
  },
  save(draft: Omit<DraftSource, "id" | "savedAt">): DraftSource {
    const record: DraftSource = {
      ...draft,
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
    };
    const next = [record, ...draftStore.all()].slice(0, 20);
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    return record;
  },
  clear() {
    if (typeof window !== "undefined") window.localStorage.removeItem(DRAFT_KEY);
  },
};
