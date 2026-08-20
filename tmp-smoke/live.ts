import { getServerSupabase } from "../src/lib/studio/db.server";
import { resolveStudioContext } from "../src/lib/studio/studio-config.server";
import { recordGenerationStart } from "../src/lib/studio/production.server";
import { persistGenerationOutput, createAssetPreview, listAssetsAwaitingReview } from "../src/lib/studio/assets.server";

const log = (...a: unknown[]) => console.log(...a);

const db = getServerSupabase();
log("1. server supabase client:", db ? "OK" : "NULL");
if (!db) process.exit(1);

const ctx = await resolveStudioContext(true);
log("2. studio context:", JSON.stringify(ctx));

// check existing successful provider tasks
const { data: existing } = await db.from("assets").select("id, provider_task_id, status, storage_path").order("created_at",{ascending:false}).limit(5);
log("2b. existing assets:", JSON.stringify(existing));

const taskId = `smoke-${Date.now()}`;
const task: any = {
  id: taskId,
  status: "succeeded",
  outputUrl: "https://placehold.co/64x36.png",
  provider: "runway",
  provenance: { providerTaskId: taskId, storyId: null, sceneId: null, worldId: ctx.worldId, prompt: "smoke test", model: "smoke" },
  createdAt: new Date().toISOString(),
};

const tracked = await recordGenerationStart({ task, sceneNumber: 999, assetType: "image" });
log("3. recordGenerationStart:", JSON.stringify({persisted:tracked.persisted, assetId:tracked.assetId, note:tracked.persistenceNote}));

const durable = await persistGenerationOutput(task);
log("4. persistGenerationOutput:", JSON.stringify(durable));

if (tracked.assetId) {
  const preview = await createAssetPreview(tracked.assetId as any);
  log("5. createAssetPreview:", preview.ok ? `OK expires ${(preview as any).data.expiresAt}` : JSON.stringify(preview.error));
}

const queue = await listAssetsAwaitingReview();
log("6. review queue:", queue.ok ? `${(queue as any).data.length} items; contains smoke: ${(queue as any).data.some((a:any)=>a.id===tracked.assetId)}` : JSON.stringify(queue.error));

// cleanup
if (tracked.assetId) {
  if ((durable as any).data?.storagePath) await db.storage.from("studio-assets").remove([(durable as any).data.storagePath]);
  await db.from("assets").delete().eq("id", tracked.assetId);
  log("7. cleanup: done");
}
