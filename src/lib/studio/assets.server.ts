/**
 * Asset durability — server-only.
 *
 * Provider (Runway) output URLs are TEMPORARY signed links. An asset is only
 * durable — and only eligible for approval or canon — once its bytes live in
 * the private `studio-assets` Supabase Storage bucket and `assets.storage_path`
 * is set.
 *
 * This module owns that copy:
 *   1. fetch the provider output on the server
 *   2. upload the bytes to `studio-assets` at
 *      `${studioId}/${storyId}/${sceneNumber}/${taskId}.${ext}`
 *   3. hand back the storage path plus a short-lived SIGNED url
 *
 * The raw provider URL is never returned as a durable source, and the bucket
 * stays private — reads always go through `createSignedUrl`.
 */

import type { GenerationTask, ServiceResult } from "./ai-types";
import { getServerSupabase, NO_DATABASE_NOTE } from "./db.server";

export const STUDIO_ASSETS_BUCKET = "studio-assets";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export interface DurableAssetRef {
  /** Path inside the private `studio-assets` bucket, once persisted. */
  storagePath: string | null;
  /** True only when the bytes are in our own storage. */
  durable: boolean;
  /** Short-lived signed URL served from Studio storage. */
  signedUrl: string | null;
  /** Temporary provider URL. Safe to preview, never to persist as the source. */
  temporaryUrl: string | null;
  /** Honest reason durability did not happen, when it did not. */
  note: string | null;
}

const preview = (task: GenerationTask, note: string): ServiceResult<DurableAssetRef> => ({
  ok: true,
  data: {
    storagePath: null,
    durable: false,
    signedUrl: null,
    temporaryUrl: task.outputUrl,
    note,
  },
});

function extensionFor(url: string, contentType: string | null): string {
  const fromType = contentType?.split(";")[0]?.trim();
  if (fromType === "video/mp4") return "mp4";
  if (fromType === "image/png") return "png";
  if (fromType === "image/webp") return "webp";
  if (fromType === "image/jpeg") return "jpg";
  const path = url.split("?")[0] ?? "";
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  return /^(png|jpg|jpeg|webp|mp4|webm)$/.test(ext) ? ext : "bin";
}

function objectPath(task: GenerationTask, ext: string): string {
  const { storyId, sceneId, providerTaskId } = task.provenance;
  return [
    "runway",
    storyId ?? "unassigned-story",
    sceneId ?? "unassigned-scene",
    `${providerTaskId ?? crypto.randomUUID()}.${ext}`,
  ].join("/");
}

/**
 * Copies a succeeded generation into the private `studio-assets` bucket.
 * Idempotent: re-running for the same provider task overwrites the same object
 * (`upsert`), so repeated polls after completion do not duplicate work.
 */
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

  const db = getServerSupabase();
  if (!db) return preview(task, NO_DATABASE_NOTE);

  let bytes: ArrayBuffer;
  let contentType: string;
  try {
    const res = await fetch(task.outputUrl);
    if (!res.ok) {
      return preview(
        task,
        `The provider preview could not be downloaded for storage (HTTP ${res.status}).`,
      );
    }
    contentType = res.headers.get("content-type") ?? "application/octet-stream";
    bytes = await res.arrayBuffer();
  } catch {
    return preview(task, "The provider preview could not be downloaded for storage.");
  }

  const path = objectPath(task, extensionFor(task.outputUrl, contentType));
  const storage = db.storage.from(STUDIO_ASSETS_BUCKET);

  const { error: uploadError } = await storage.upload(path, bytes, {
    contentType,
    upsert: true,
  });
  if (uploadError) {
    return preview(
      task,
      `Studio storage rejected this file (${uploadError.message}). The preview link still works for now.`,
    );
  }

  const { data: signed } = await storage.createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  return {
    ok: true,
    data: {
      storagePath: path,
      durable: true,
      signedUrl: signed?.signedUrl ?? null,
      temporaryUrl: task.outputUrl,
      note: null,
    },
  };
}

/** Refreshes a short-lived read URL for an already-stored object. */
export async function signStoredAsset(storagePath: string): Promise<string | null> {
  const db = getServerSupabase();
  if (!db) return null;
  const { data } = await db.storage
    .from(STUDIO_ASSETS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}
