-- Trust Tai Studio — canonical V1 schema
--
-- This file mirrors the schema ALREADY APPLIED to the external Studio Supabase
-- project (ref: fglbkmsitstesmdoujwj). It is written to be idempotent so it can
-- be re-run safely for documentation / environment bootstrapping:
--   psql "$STUDIO_DATABASE_URL" -f db/migrations/0001_studio_v1.sql
--
-- NOTE: this repository's `supabase/` directory is reserved by the platform
-- migration tooling, so Studio's own migrations live here in `db/migrations/`.
--
-- Architecture: Truth -> Story -> Scenes -> Assets -> Formats -> Channels
-- Ownership:    Organization -> Studio -> Active World -> Story -> Outputs/Scenes -> Assets
--
-- RLS is enabled on every table with NO policies.
-- TODO(suite-auth): once shared Trust Tai Suite identity and organization
-- membership are connected, add policies scoped to organization membership
-- (e.g. USING (public.is_org_member(auth.uid(), organization_id))) plus the
-- matching GRANTs. Until then these tables are unreachable by design.
--
-- Storage: two PRIVATE buckets exist alongside this schema —
--   world-files    (world bibles, references, uploads)
--   studio-assets  (durable copies of generated assets; see assets.storage_path)
-- Provider output URLs (e.g. Runway) are TEMPORARY. An asset is only durable
-- once its bytes are copied into `studio-assets` and `storage_path` is set.

create extension if not exists "pgcrypto";

-- ---------- studios ----------
create table if not exists public.studios (
  id uuid primary key default gen_random_uuid(),
  -- TODO(suite-auth): becomes a FK/uuid to the shared Suite organizations table.
  organization_id text,
  name text not null,
  slug text unique,
  active_world_id uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- worlds ----------
create table if not exists public.worlds (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null,
  subtitle text,
  canon_version text not null default 'Canon v1.0',
  status text not null default 'active',
  bible_text text,
  bible jsonb,
  compiled_canon jsonb,
  thumbnail_url text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.studios drop constraint if exists studios_active_world_id_fkey;
alter table public.studios
  add constraint studios_active_world_id_fkey
  foreign key (active_world_id) references public.worlds(id) on delete set null;

-- ---------- stories ----------
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid references public.studios(id) on delete cascade,
  world_id uuid references public.worlds(id) on delete cascade,
  title text not null,
  -- allowed: draft | in_production | ready_for_approval | approved | archived
  status text not null default 'draft',
  source_truth text,
  deeper_truth text,
  human_truth text,
  premise text,
  why_it_matters text,
  recommended_angle text,
  creative_treatment text,
  director_plan jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- story_sources ----------
create table if not exists public.story_sources (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  source_type text not null,
  content text,
  source_url text,
  -- Which Suite room a signal came from, and the record it points at.
  source_room text,
  source_record_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ---------- story_outputs ----------
create table if not exists public.story_outputs (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  format text not null,
  -- allowed: draft | generating | approved | published
  status text not null default 'draft',
  title text,
  body text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- scenes ----------
-- Full director contract: one row per planned scene.
create table if not exists public.scenes (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  scene_number int not null default 1,
  narrative_purpose text,
  emotion text,
  character_refs jsonb,
  setting text,
  camera_framing text,
  camera_movement text,
  lighting text,
  wardrobe text,
  props jsonb,
  composition text,
  visual_metaphor text,
  dialogue text,
  narration text,
  transition_in text,
  transition_out text,
  motion_direction text,
  duration_seconds numeric,
  required_asset_type text,
  continuity_notes text,
  director_notes text,
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- assets ----------
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid references public.studios(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  scene_id uuid references public.scenes(id) on delete cascade,
  world_id uuid references public.worlds(id) on delete cascade,
  asset_type text not null,
  role text,
  status text not null default 'queued',
  -- Provider URL: TEMPORARY. Never treat as durable.
  url text,
  -- Path inside the private `studio-assets` bucket. Set only after the bytes
  -- have been copied over; durability/approval depends on this.
  storage_path text,
  provider text,
  provider_task_id text,
  prompt text,
  generation_settings jsonb,
  provenance jsonb,
  is_canon boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- ---------- approvals ----------
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid references public.studios(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  output_id uuid references public.story_outputs(id) on delete cascade,
  asset_id uuid references public.assets(id) on delete cascade,
  scene_id uuid references public.scenes(id) on delete cascade,
  status text not null default 'pending',
  -- TODO(suite-auth): reviewer_id -> shared Suite user id.
  reviewer_id uuid,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- creative_feedback ----------
-- Corrections become durable memory: feedback can point at a world, story,
-- scene, or asset so Studio AI learns the house rules over time.
create table if not exists public.creative_feedback (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid references public.studios(id) on delete cascade,
  world_id uuid references public.worlds(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  scene_id uuid references public.scenes(id) on delete cascade,
  asset_id uuid references public.assets(id) on delete cascade,
  feedback text not null,
  classification text,
  disposition text,
  extracted_rule text,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- ---------- indexes ----------
create index if not exists worlds_studio_id_idx on public.worlds(studio_id);
create index if not exists stories_world_id_idx on public.stories(world_id);
create index if not exists stories_studio_id_idx on public.stories(studio_id);
create index if not exists story_sources_story_id_idx on public.story_sources(story_id);
create index if not exists story_outputs_story_id_idx on public.story_outputs(story_id);
create index if not exists scenes_story_id_idx on public.scenes(story_id);
create index if not exists assets_scene_id_idx on public.assets(scene_id);
create index if not exists assets_story_id_idx on public.assets(story_id);
create index if not exists approvals_story_id_idx on public.approvals(story_id);
create index if not exists creative_feedback_world_id_idx on public.creative_feedback(world_id);
create index if not exists creative_feedback_story_id_idx on public.creative_feedback(story_id);

-- ---------- RLS (enabled, intentionally no policies yet) ----------
alter table public.studios enable row level security;
alter table public.worlds enable row level security;
alter table public.stories enable row level security;
alter table public.story_sources enable row level security;
alter table public.story_outputs enable row level security;
alter table public.scenes enable row level security;
alter table public.assets enable row level security;
alter table public.approvals enable row level security;
alter table public.creative_feedback enable row level security;
