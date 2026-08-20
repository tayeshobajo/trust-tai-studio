/**
 * Asset durability & access — server-only.
 *
 * Provider (Runway) output URLs are TEMPORARY signed links. An asset is only
 * durable — and only eligible for approval or canon — once its bytes live in
 * the private `studio-assets` Supabase Storage bucket and `assets.storage_path`
 * is set.
 *
 * This module owns that copy and the read path back out:
 *   1. fetch the provider output on the server (reject non-2xx / empty bodies)
 *   2. upload the bytes to `studio-assets` at a deterministic, sanitised path
 *      `<studioId>/<storyId|unassigned-story>/<sceneId|scene-N>/<assetId>.<ext>`
 *   3. set `assets.storage_path` and only then mark the asset `ready`
 *   4. hand back the storage path plus a short-lived SIGNED url
 *
 * The raw provider URL is kept as provenance/history only, and the bucket stays
 * private — reads always go through `createSignedUrl`.
 */

import type { GenerationTask, ServiceResult } from "./ai-types";
import type { UUID } from "./types";
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

export interface AssetPreview {
  assetId: UUID;
  /** Short-lived signed URL from the private bucket. */
  url: string;
  expiresInSeconds: number;
  expiresAt: string;
  assetType: string;
}

const notDurable = (task: GenerationTask, note: string): ServiceResult<DurableAssetRef> => ({
  ok: true,
  data: {
    storagePath: null,
    durable: false,
    signedUrl: null,
    temporaryUrl: task.outputUrl,
    note,
  },
});

/** Allow-listed provider output types; anything else is stored as raw bytes. */
const TYPE_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

function extensionFor(url: string, contentType: string | null): string {
  const fromType = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (TYPE_EXT[fromType]) return TYPE_EXT[fromType]!;
  // Never trust a provider-supplied filename: only accept a known extension.
  const path = (url.split("?")[0] ?? "").toLowerCase();
  const ext = path.slice(path.lastIndexOf(".") + 1);
  return /^(png|jpg|jpeg|webp|mp4|webm)$/.test(ext) ? (ext === "jpeg" ? "jpg" : ext) : "bin";
}

/** Storage path segments are ours, never provider text — sanitise regardless. */
function segment(value: string | null | undefined, fallback: string): string {
  const cleaned = (value ?? "").replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 64);
  return cleaned.replace(/^-|-$/g, "") || fallback;
}

function objectPath(row: AssetRow, sceneNumber: number | null, ext: string): string {
  return [
    segment(row.studio_id, "unassigned-studio"),
    segment(row.story_id, "unassigned-story"),
    segment(row.scene_id ?? (sceneNumber != null ? `scene-${sceneNumber}` : null), "unassigned-scene"),
    `${segment(row.id ?? row.provider_task_id, "asset")}.${segment(ext, "bin")}`,
  ].join("/");
}

interface AssetRow {
  id: UUID;
  studio_id: string | null;
  story_id: string | null;
  scene_id: string | null;
  world_id: string | null;
  storage_path: string | null;
  provider_task_id: string | null;
  asset_type: string | null;
  provenance: Record<string, unknown> | null;
}

async function loadAssetByTask(
  db: NonNullable<ReturnType<typeof getServerSupabase>>,
  providerTaskId: string,
): Promise<AssetRow | null> {
  const { data } = await db
    .from("assets")
    .select(
      "id, studio_id, story_id, scene_id, world_id, storage_path, provider_task_id, asset_type, provenance",
    )
    .eq("provider_task_id", providerTaskId)
    .maybeSingle();
  return (data as AssetRow | null) ?? null;
}

/**
 * Copies a succeeded generation into the private `studio-assets` bucket.
 *
 * Idempotent in two ways: an asset that already has `storage_path` is simply
 * re-signed (no second download, no duplicate object), and the upload itself
 * uses a deterministic path with `upsert`, so a retry overwrites in place.
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
  if (!db) return notDurable(task, NO_DATABASE_NOTE);

  const providerTaskId = task.provenance.providerTaskId;
  if (!providerTaskId) {
    return notDurable(task, "This generation has no provider task id, so it cannot be matched to a Studio asset.");
  }

  const row = await loadAssetByTask(db, providerTaskId);
  if (!row) {
    // No asset row: durability would be a lie. Say so instead of faking it.
    return notDurable(
      task,
      "This generation was never recorded in Studio, so there is no asset row to store it against.",
    );
  }

  const storage = db.storage.from(STUDIO_ASSETS_BUCKET);

  // Already durable — re-sign, do not re-upload.
  if (row.storage_path) {
    const { data: signed } = await storage.createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
    return {
      ok: true,
      data: {
        storagePath: row.storage_path,
        durable: true,
        signedUrl: signed?.signedUrl ?? null,
        temporaryUrl: task.outputUrl,
        note: null,
      },
    };
  }

  let bytes: ArrayBuffer;
  let contentType: string;
  try {
    const res = await fetch(task.outputUrl);
    if (!res.ok) {
      return notDurable(
        task,
        `The provider preview could not be downloaded for storage (HTTP ${res.status}).`,
      );
    }
    contentType = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "application/octet-stream";
    bytes = await res.arrayBuffer();
  } catch {
    return notDurable(task, "The provider preview could not be downloaded for storage.");
  }

  if (bytes.byteLength === 0) {
    return notDurable(task, "The provider returned an empty file, so nothing was stored.");
  }

  const sceneNumber =
    typeof row.provenance?.["sceneNumber"] === "number"
      ? (row.provenance["sceneNumber"] as number)
      : null;
  const path = objectPath(row, sceneNumber, extensionFor(task.outputUrl, contentType));

  const { error: uploadError } = await storage.upload(path, bytes, {
    contentType: TYPE_EXT[contentType] ? contentType : "application/octet-stream",
    upsert: true,
  });
  if (uploadError) {
    return notDurable(
      task,
      `Studio storage rejected this file (${uploadError.message}). The preview link still works for now.`,
    );
  }

  // Only now is the asset genuinely durable: record the path and mark it ready.
  const { error: updateError } = await db
    .from("assets")
    .update({
      storage_path: path,
      status: "ready",
      // Provider URL is provenance/history only, never the durable source.
      url: task.outputUrl,
      provenance: {
        ...(row.provenance ?? {}),
        provider: "runway",
        providerTaskId,
        temporaryProviderUrl: task.outputUrl,
        contentType,
        byteSize: bytes.byteLength,
        storedAt: new Date().toISOString(),
      },
    })
    .eq("id", row.id);

  if (updateError) {
    return notDurable(
      task,
      `The file was stored but the asset record could not be updated (${updateError.message}).`,
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

/**
 * Durable preview contract: the only way the UI gets at a private asset.
 * Returns a short-lived signed URL plus its expiry — never credentials, never
 * a storage path the browser could reuse.
 */
export async function createAssetPreview(assetId: UUID): Promise<ServiceResult<AssetPreview>> {
  const db = getServerSupabase();
  if (!db) {
    return {
      ok: false,
      error: { code: "provider_not_configured", provider: "studio_storage", message: NO_DATABASE_NOTE },
    };
  }

  const { data } = await db
    .from("assets")
    .select("id, storage_path, asset_type")
    .eq("id", assetId)
    .maybeSingle();

  if (!data) {
    return {
      ok: false,
      error: { code: "invalid_input", provider: "studio_storage", message: "That asset is not in Studio." },
    };
  }
  const storagePath = data["storage_path"] as string | null;
  if (!storagePath) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        provider: "studio_storage",
        message: "This asset is still a provider preview — it has not been stored in Studio yet.",
      },
    };
  }

  const signed = await signStoredAsset(storagePath);
  if (!signed) {
    return {
      ok: false,
      error: {
        code: "provider_error",
        provider: "studio_storage",
        message: "Studio storage could not issue a preview link for this asset.",
      },
    };
  }

  return {
    ok: true,
    data: {
      assetId,
      url: signed,
      expiresInSeconds: SIGNED_URL_TTL_SECONDS,
      expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
      assetType: (data["asset_type"] as string | null) ?? "image",
    },
  };
}

/* ---------------- review queue & library reads (server-only) ---------------- */

export interface StudioAssetSummary {
  assetId: UUID;
  assetType: string;
  status: string;
  isCanon: boolean;
  storyTitle: string | null;
  sceneNumber: number | null;
  worldName: string | null;
  createdAt: string | null;
  /** Short-lived signed URL from the private bucket. */
  previewUrl: string | null;
}

type AssetJoinRow = Record<string, unknown> & {
  id: string;
  asset_type: string | null;
  status: string | null;
  is_canon: boolean | null;
  storage_path: string | null;
  created_at: string | null;
  provenance: Record<string, unknown> | null;
  scenes?: { scene_number: number | null } | null;
  stories?: { title: string | null } | null;
  worlds?: { name: string | null } | null;
};

async function summarise(rows: AssetJoinRow[]): Promise<StudioAssetSummary[]> {
  return Promise.all(
    rows.map(async (row) => ({
      assetId: row.id as UUID,
      assetType: row.asset_type ?? "image",
      status: row.status ?? "ready",
      isCanon: Boolean(row.is_canon),
      storyTitle: row.stories?.title ?? null,
      sceneNumber:
        row.scenes?.scene_number ??
        (typeof row.provenance?.["sceneNumber"] === "number"
          ? (row.provenance["sceneNumber"] as number)
          : null),
      worldName: row.worlds?.name ?? null,
      createdAt: row.created_at,
      previewUrl: row.storage_path ? await signStoredAsset(row.storage_path) : null,
    })),
  );
}

const SELECT =
  "id, asset_type, status, is_canon, storage_path, created_at, provenance, scenes(scene_number), stories(title), worlds(name)";

/** Durable assets that are stored in Studio and still waiting on a human. */
export async function listAssetsAwaitingReview(): Promise<ServiceResult<StudioAssetSummary[]>> {
  const db = getServerSupabase();
  if (!db) {
    return {
      ok: false,
      error: { code: "provider_not_configured", provider: "studio_storage", message: NO_DATABASE_NOTE },
    };
  }
  const { data, error } = await db
    .from("assets")
    .select(SELECT)
    .not("storage_path", "is", null)
    .eq("status", "ready")
    .eq("is_canon", false)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) {
    return { ok: false, error: { code: "provider_error", provider: "studio_storage", message: error.message } };
  }
  return { ok: true, data: await summarise((data ?? []) as unknown as AssetJoinRow[]) };
}

/** Approved, canon assets — the seam the Library reads from. */
export async function listCanonAssets(): Promise<ServiceResult<StudioAssetSummary[]>> {
  const db = getServerSupabase();
  if (!db) {
    return {
      ok: false,
      error: { code: "provider_not_configured", provider: "studio_storage", message: NO_DATABASE_NOTE },
    };
  }
  const { data, error } = await db
    .from("assets")
    .select(SELECT)
    .not("storage_path", "is", null)
    .eq("is_canon", true)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) {
    return { ok: false, error: { code: "provider_error", provider: "studio_storage", message: error.message } };
  }
  return { ok: true, data: await summarise((data ?? []) as unknown as AssetJoinRow[]) };
}
