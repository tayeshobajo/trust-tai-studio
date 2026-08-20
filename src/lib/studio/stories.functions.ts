/**
 * Server-function boundary for Story persistence.
 *
 * The browser calls these; it never touches Supabase credentials and never
 * supplies studio/world ownership — that is resolved server-side.
 */

import { createServerFn } from "@tanstack/react-start";

import type { DirectorPlan, SceneDirection, ServiceResult, StoryDiscovery } from "./ai-types";
import type { OutputFormat, UUID } from "./types";
import type { LoadedStory, PersistedStory } from "./stories.server";

export const createStoryFromDiscovery = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { discovery: StoryDiscovery; sourceText: string; formats?: OutputFormat[] }) => input,
  )
  .handler(async ({ data }): Promise<ServiceResult<PersistedStory>> => {
    const { createStory, saveOutputs } = await import("./stories.server");
    const created = await createStory({
      discovery: data.discovery,
      sourceText: data.sourceText,
      sourceKind: "text",
    });
    if (created.ok && data.formats?.length) {
      await saveOutputs({ storyId: created.data.storyId, formats: data.formats });
    }
    return created;
  });

export const updateStoryDiscovery = createServerFn({ method: "POST" })
  .inputValidator((input: { storyId: UUID; discovery: StoryDiscovery }) => input)
  .handler(async ({ data }): Promise<ServiceResult<{ storyId: UUID }>> => {
    const { updateStory } = await import("./stories.server");
    return updateStory(data);
  });

export const saveStoryOutputs = createServerFn({ method: "POST" })
  .inputValidator((input: { storyId: UUID; formats: OutputFormat[] }) => input)
  .handler(async ({ data }): Promise<ServiceResult<{ formats: OutputFormat[] }>> => {
    const { saveOutputs } = await import("./stories.server");
    return saveOutputs(data);
  });

export const saveStoryDirectorPlan = createServerFn({ method: "POST" })
  .inputValidator((input: { storyId: UUID; plan: DirectorPlan }) => input)
  .handler(async ({ data }): Promise<ServiceResult<{ storyId: UUID; scenes: SceneDirection[] }>> => {
    const { saveDirectorPlan } = await import("./stories.server");
    return saveDirectorPlan(data);
  });

export const getStory = createServerFn({ method: "POST" })
  .inputValidator((input: { storyId: UUID }) => input)
  .handler(async ({ data }): Promise<ServiceResult<LoadedStory>> => {
    const { loadStory } = await import("./stories.server");
    return loadStory(data.storyId);
  });
