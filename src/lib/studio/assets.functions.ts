/**
 * Server-function boundary for durable Studio assets.
 *
 * The browser only ever receives short-lived signed URLs minted server-side
 * from the private `studio-assets` bucket — never storage credentials, never a
 * public object URL.
 */

import { createServerFn } from "@tanstack/react-start";

import type { ServiceResult } from "./ai-types";
import type { AssetPreview, StudioAssetSummary } from "./assets.server";
import type { UUID } from "./types";

export const getAssetPreview = createServerFn({ method: "POST" })
  .inputValidator((input: { assetId: UUID }) => input)
  .handler(async ({ data }): Promise<ServiceResult<AssetPreview>> => {
    const { createAssetPreview } = await import("./assets.server");
    return createAssetPreview(data.assetId);
  });

/** Durable assets stored in Studio and still awaiting a human decision. */
export const listReviewQueue = createServerFn({ method: "GET" }).handler(
  async (): Promise<ServiceResult<StudioAssetSummary[]>> => {
    const { listAssetsAwaitingReview } = await import("./assets.server");
    return listAssetsAwaitingReview();
  },
);

/** Approved, canon assets — the Library's real data seam. */
export const listLibraryAssets = createServerFn({ method: "GET" }).handler(
  async (): Promise<ServiceResult<StudioAssetSummary[]>> => {
    const { listCanonAssets } = await import("./assets.server");
    return listCanonAssets();
  },
);
