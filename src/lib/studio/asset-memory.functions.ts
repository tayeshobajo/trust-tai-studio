/**
 * Server-function boundary for asset creative memory and on-demand direction.
 */

import { createServerFn } from "@tanstack/react-start";

import type { CreativeMemoryEntry, ServiceResult } from "./ai-types";
import type { AssetDirectionResult } from "./asset-memory.server";
import type { UUID } from "./types";

export const getAssetMemory = createServerFn({ method: "POST" })
  .inputValidator((input: { assetId: UUID }) => input)
  .handler(async ({ data }): Promise<ServiceResult<CreativeMemoryEntry[]>> => {
    const { listAssetMemory } = await import("./asset-memory.server");
    return listAssetMemory(data.assetId);
  });

/** Explicit, human-triggered Studio AI direction for one durable asset. */
export const runAssetDiscovery = createServerFn({ method: "POST" })
  .inputValidator((input: { assetId: UUID }) => input)
  .handler(async ({ data }): Promise<ServiceResult<AssetDirectionResult>> => {
    const { runAssetDirection } = await import("./asset-memory.server");
    return runAssetDirection(data.assetId);
  });
