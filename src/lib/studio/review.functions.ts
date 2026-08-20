/**
 * Server-function boundary for review: approve a durable asset to the World,
 * or record creative feedback and send the scene back for another pass.
 *
 * The browser sends an asset id and (for changes) a note — never a status it
 * chose itself. All rules live server-side in `review.server.ts`.
 */

import { createServerFn } from "@tanstack/react-start";

import type { ReviewOutcome, ServiceResult } from "./ai-types";
import type { UUID } from "./types";

export const approveAsset = createServerFn({ method: "POST" })
  .inputValidator((input: { assetId: UUID; note?: string | null }) => input)
  .handler(async ({ data }): Promise<ServiceResult<ReviewOutcome>> => {
    const { approveAssetToWorld } = await import("./review.server");
    return approveAssetToWorld({ assetId: data.assetId, note: data.note ?? null });
  });

export const requestChanges = createServerFn({ method: "POST" })
  .inputValidator((input: { assetId: UUID; feedback: string }) => input)
  .handler(async ({ data }): Promise<ServiceResult<ReviewOutcome>> => {
    const { requestSceneChanges } = await import("./review.server");
    return requestSceneChanges(data);
  });

/**
 * Explicit rejection of a generated asset. The reason is optional but becomes
 * part of the World's creative memory when given.
 */
export const rejectGeneratedAsset = createServerFn({ method: "POST" })
  .inputValidator((input: { assetId: UUID; reason?: string | null }) => input)
  .handler(async ({ data }): Promise<ServiceResult<ReviewOutcome>> => {
    const { rejectAsset } = await import("./review.server");
    return rejectAsset({ assetId: data.assetId, reason: data.reason ?? null });
  });
