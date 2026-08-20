/**
 * Server-function boundary for Story-level review.
 *
 * The browser sends a Story id and (for a rejection) a reason. Statuses are
 * decided server-side against the database's own allowed values.
 */

import { createServerFn } from "@tanstack/react-start";

import type { ServiceResult } from "./ai-types";
import type { StoryReviewItem, StoryReviewOutcome } from "./story-review.server";
import type { UUID } from "./types";

export const listStoryQueue = createServerFn({ method: "GET" }).handler(
  async (): Promise<ServiceResult<StoryReviewItem[]>> => {
    const { listStoryReviewQueue } = await import("./story-review.server");
    return listStoryReviewQueue();
  },
);

export const approveDirectedStory = createServerFn({ method: "POST" })
  .inputValidator((input: { storyId: UUID; note?: string | null }) => input)
  .handler(async ({ data }): Promise<ServiceResult<StoryReviewOutcome>> => {
    const { approveStory } = await import("./story-review.server");
    return approveStory({ storyId: data.storyId, note: data.note ?? null });
  });

export const rejectDirectedStory = createServerFn({ method: "POST" })
  .inputValidator((input: { storyId: UUID; reason: string }) => input)
  .handler(async ({ data }): Promise<ServiceResult<StoryReviewOutcome>> => {
    const { rejectStory } = await import("./story-review.server");
    return rejectStory(data);
  });
