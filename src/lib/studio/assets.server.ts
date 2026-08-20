/**
 * Asset durability seam — server-only.
 *
 * Provider (Runway) output URLs are TEMPORARY signed links. An asset is only
 * durable — and only eligible for approval or canon — once its bytes live in
 * the private `studio-assets` Supabase Storage bucket and `assets.storage_path`
 * is set.
 *
 * TODO(durability): implement the copy once Suite identity + service-role
 * access are connected:
 *   1. fetch(task.outputUrl) on the server
 *   2. upload the bytes to `studio-assets` at
 *      `${studioId}/${storyId ?? "unassigned"}/${assetId}.${ext}`
 *   3. update public.assets: storage_path, status='ready', provenance
 *   4. never return the raw provider URL to the browser as a durable source;
 *      serve a short-lived signed URL from the bucket instead.
 */

import type { GenerationTask, ServiceResult } from "./ai-types";

export interface DurableAssetRef {
  /** Path inside the private `studio-assets` bucket, once persisted. */
  storagePath: string | null;
  /** True only when the bytes are in our own storage. */
  durable: boolean;
  /** Temporary provider URL. Safe to preview, never to persist as the source. */
  temporaryUrl: string | null;
}

export async function persistGenerationOutput(
  task: GenerationTask,
): Promise<ServiceResult<DurableAssetRef>> {
  if (task.status !== "succeeded" || !task.outputUrl) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        provider: "runway",
        message: "Only a succeeded generation with an output can be made durable.",
      },
    };
  }

  // Not wired yet — the honest state is "preview only".
  return {
    ok: true,
    data: { storagePath: null, durable: false, temporaryUrl: task.outputUrl },
  };
}
