/**
 * Server-function boundary for Studio AI.
 *
 * The browser calls these; it never calls OpenAI or Runway directly.
 * Only handler bodies run on the server, so provider modules are imported
 * inside the handlers.
 */

import { createServerFn } from "@tanstack/react-start";

import type {
  DirectorPlan,
  DirectorPlanRequest,
  ServiceResult,
  StoryDiscovery,
  StoryDiscoveryRequest,
} from "./ai-types";

export const discoverStory = createServerFn({ method: "POST" })
  .inputValidator((input: StoryDiscoveryRequest) => input)
  .handler(async ({ data }): Promise<ServiceResult<StoryDiscovery>> => {
    const { studioAI } = await import("./studio-ai.server");
    return studioAI.discoverStory(data);
  });

export const planDirection = createServerFn({ method: "POST" })
  .inputValidator((input: DirectorPlanRequest) => input)
  .handler(async ({ data }): Promise<ServiceResult<DirectorPlan>> => {
    const { studioAI } = await import("./studio-ai.server");
    return studioAI.planDirection(data);
  });
