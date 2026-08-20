/**
 * Scheduled entry point for the background Runway task sweep.
 *
 * Called by pg_cron (or any scheduler) on a cadence:
 *
 *   POST https://<studio-host>/api/public/production-sweep
 *   x-studio-cron-secret: <STUDIO_CRON_SECRET>
 *
 * `/api/public/*` bypasses site auth, so the shared secret is verified inside
 * the handler before any work runs. The response is a small run summary and
 * never contains provider credentials, prompts, or user content.
 */

import { createFileRoute } from "@tanstack/react-router";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function runSweep(request: Request): Promise<Response> {
  // Read secrets inside the handler: env is injected per request.
  const secret = process.env["STUDIO_CRON_SECRET"];
  if (!secret) {
    return Response.json(
      { ok: false, error: "The sweep is not configured on this server (STUDIO_CRON_SECRET)." },
      { status: 503 },
    );
  }
  const presented = request.headers.get("x-studio-cron-secret") ?? "";
  if (!timingSafeEqual(presented, secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { sweepOpenTasks } = await import("@/lib/studio/polling.server");
  const result = await sweepOpenTasks();
  return Response.json({ ok: true, result });
}

export const Route = createFileRoute("/api/public/production-sweep")({
  server: {
    handlers: {
      POST: async ({ request }) => runSweep(request),
      // GET is allowed for schedulers that can only issue plain gets; the
      // shared secret is still required.
      GET: async ({ request }) => runSweep(request),
    },
  },
});
