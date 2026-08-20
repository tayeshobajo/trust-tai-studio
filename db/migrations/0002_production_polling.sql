-- Trust Tai Studio — background production polling.
--
-- The browser is no longer the only thing watching a Runway task. A scheduled
-- sweep (pg_cron -> POST /api/public/production-sweep) polls every asset that
-- is still queued/generating, stores finished output in `studio-assets`, and
-- rolls scene + story statuses forward even when nobody has the app open.
--
-- This table is the sweep's control row: a single-flight lease so two runs
-- never overlap, plus a paused state so a credit/permission failure halts the
-- job instead of hammering the provider.

create table if not exists public.production_job_locks (
  job_name text primary key,
  -- Single-flight: a run may only start when now() > leased_until.
  leased_until timestamptz,
  -- Circuit breaker. While paused, the sweep processes at most one probe item.
  paused boolean not null default false,
  paused_reason text,
  last_run_at timestamptz,
  last_result jsonb,
  updated_at timestamptz not null default now()
);

-- Server-side only: the sweep runs with the service role. No anon/authenticated
-- access — nothing in the browser reads or writes the job control row.
grant all on public.production_job_locks to service_role;

alter table public.production_job_locks enable row level security;

insert into public.production_job_locks (job_name)
values ('runway_task_sweep')
on conflict (job_name) do nothing;

-- Helps the sweep find unfinished work quickly.
create index if not exists assets_open_tasks_idx
  on public.assets(status)
  where provider_task_id is not null;
