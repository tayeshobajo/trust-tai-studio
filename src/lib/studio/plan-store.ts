/**
 * Local hand-off between Create and Production until stories persist remotely.
 * Browser-only: every function guards `window`.
 */

import type { DirectorPlan, StoryDiscovery } from "./ai-types";

const KEY = "trusttai.studio.director-plan.v1";

export interface StoredPlan {
  savedAt: string;
  discovery: StoryDiscovery;
  plan: DirectorPlan;
}

export const planStore = {
  save(discovery: StoryDiscovery, plan: DirectorPlan): StoredPlan {
    const record: StoredPlan = { savedAt: new Date().toISOString(), discovery, plan };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(KEY, JSON.stringify(record));
    }
    return record;
  },
  read(): StoredPlan | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredPlan;
    } catch {
      return null;
    }
  },
  clear() {
    if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
  },
};
