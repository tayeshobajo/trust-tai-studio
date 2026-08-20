/**
 * Background Runway task sweep — server-only.
 *
 * The browser is no longer the only thing watching a render. A scheduler
 * (pg_cron -> POST /api/public/production-sweep) calls this on a cadence; it
 * finds every asset row still queued/generating, asks the provider for the
 * task status, stores finished bytes in `studio-assets`, and rolls the scene +
 * story statuses forward. Navigating away no longer strands a render.
 *
 * Safety rails (all required for a scheduled AI/provider job):
 *   1. Bounded work per run  — BATCH_SIZE tasks, never "everything".
 *   2. Single-flight lease   — `production_job_locks.leased_until`.
 *   3. Idempotent progress   — reconciliation is keyed on provider_task_id.
 *   4. Circuit breaker       — 401/403/402 pause the job, repeated 429s park it.
 *   5. Paused guard          — a paused job processes at most one probe item.
 */

import type { ServiceErrorCode } from "./ai-types";
import { getServerSupabase, NO_DATABASE_NOTE } from "./db.server";

const JOB_NAME = "runway_task_sweep";
const BATCH_SIZE = 8;
const LEASE_SECONDS = 120;

export interface SweepResult {
  ran: boolean;
  reason?: string;
  paused?: boolean;
  pausedReason?: string | null;
  checked: number;
  settled: number;
  stored: number;
  failed: number;
  probe?: boolean;
}

const skipped = (reason: string): SweepResult => ({
  ran: false,
  reason,
  checked: 0,
  settled: 0,
  stored: 0,
  failed: 0,
});

/** A credential/permission failure is terminal for the whole job; repeated 429s only park this run. */
const isHaltCode = (code: ServiceErrorCode): boolean => code === "provider_not_configured";

export async function sweepOpenTasks(): Promise<SweepResult> {
  const db = getServerSupabase();
  if (!db) return skipped(NO_DATABASE_NOTE);

  const now = new Date();
  const nowIso = now.toISOString();

  // --- control row: paused state + single-flight lease -----------------------
  const { data: lock } = await db
    .from("production_job_locks")
    .select("job_name, leased_until, paused, paused_reason")
    .eq("job_name", JOB_NAME)
    .maybeSingle();

  if (!lock) {
    await db.from("production_job_locks").insert({ job_name: JOB_NAME }).select("job_name");
  }

  const leasedUntil = lock?.["leased_until"] ? new Date(String(lock["leased_until"])) : null;
  if (leasedUntil && leasedUntil > now) {
    return skipped("Another sweep is already running.");
  }

  const paused = Boolean(lock?.["paused"]);
  const pausedReason = (lock?.["paused_reason"] as string | null) ?? null;
  // While paused we still allow ONE probe item per run, so an out-of-band fix
  // (credentials restored, credits topped up) is detected without an operator.
  const limit = paused ? 1 : BATCH_SIZE;

  const { error: leaseError } = await db
    .from("production_job_locks")
    .update({
      leased_until: new Date(now.getTime() + LEASE_SECONDS * 1000).toISOString(),
      last_run_at: nowIso,
      updated_at: nowIso,
    })
    .eq("job_name", JOB_NAME);
  if (leaseError) return skipped(`Could not take the sweep lease: ${leaseError.message}`);

  const result: SweepResult = {
    ran: true,
    checked: 0,
    settled: 0,
    stored: 0,
    failed: 0,
    paused,
    pausedReason,
    ...(paused ? { probe: true } : {}),
  };

  try {
    const { data: openAssets } = await db
      .from("assets")
      .select("id, provider_task_id, status")
      .in("status", ["queued", "generating"])
      .not("provider_task_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(limit);

    const rows = openAssets ?? [];
    if (rows.length === 0) {
      // Nothing to do: never kick further work on the idle path.
      await finish(db, result, { clearPause: false });
      return result;
    }

    const { productionEngine } = await import("./runway.server");
    const { persistGenerationOutput } = await import("./assets.server");
    const { recordGenerationProgress } = await import("./production.server");

    let rateLimited = 0;

    for (const row of rows) {
      const taskId = String(row["provider_task_id"]);
      result.checked += 1;

      const status = await productionEngine.checkStatus(taskId);
      if (!status.ok) {
        if (isHaltCode(status.error.code)) {
          await pause(db, `${status.error.code}: ${status.error.message}`);
          result.paused = true;
          result.pausedReason = status.error.message;
          break;
        }
        if (status.error.code === "rate_limited") {
          rateLimited += 1;
          // Transient: stop this run, the next scheduled run retries normally.
          if (rateLimited >= 2) break;
        }
        continue;
      }

      // A denied probe spends nothing; a successful one clears the pause.
      if (paused) {
        await clearPause(db);
        result.paused = false;
        result.pausedReason = null;
      }

      let storagePath: string | null = null;
      let durableUrl: string | null = null;
      let durabilityNote: string | null = null;

      if (status.data.status === "succeeded") {
        const durable = await persistGenerationOutput(status.data);
        if (durable.ok) {
          storagePath = durable.data.storagePath;
          durableUrl = durable.data.signedUrl;
          durabilityNote = durable.data.note;
          result.stored += 1;
        } else {
          durabilityNote = durable.error.message;
        }
      }

      if (status.data.status === "succeeded" || status.data.status === "failed") {
        result.settled += 1;
        if (status.data.status === "failed") result.failed += 1;
      }

      // Idempotent: keyed on provider_task_id, so re-running is harmless.
      await recordGenerationProgress(status.data, durableUrl, storagePath, durabilityNote);
    }

    await finish(db, result, { clearPause: false });
    return result;
  } catch (error) {
    result.reason = error instanceof Error ? error.message : "Sweep failed.";
    await finish(db, result, { clearPause: false });
    return result;
  }
}

type Db = NonNullable<ReturnType<typeof getServerSupabase>>;

/** Release the lease and record what the run did. */
async function finish(db: Db, result: SweepResult, opts: { clearPause: boolean }) {
  await db
    .from("production_job_locks")
    .update({
      leased_until: null,
      last_result: result as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
      ...(opts.clearPause ? { paused: false, paused_reason: null } : {}),
    })
    .eq("job_name", JOB_NAME);
}

async function pause(db: Db, reason: string) {
  await db
    .from("production_job_locks")
    .update({ paused: true, paused_reason: reason, updated_at: new Date().toISOString() })
    .eq("job_name", JOB_NAME);
}

async function clearPause(db: Db) {
  await db
    .from("production_job_locks")
    .update({ paused: false, paused_reason: null, updated_at: new Date().toISOString() })
    .eq("job_name", JOB_NAME);
}
