-- Trust Tai Studio — V1 schema
--
-- NOTE: this repository's `supabase/` directory is reserved by the platform
-- migration tooling, so Studio's own migrations live here in `db/migrations/`.
-- Apply against the Studio Supabase project (ref: fglbkmsitstesmdoujwj) with:
--   psql "$STUDIO_DATABASE_URL" -f db/migrations/0001_studio_v1.sql
--
-- Architecture: Truth -> Story -> Scenes -> Assets -> Formats -> Channels
-- Ownership:    Organization -> Studio -> Active World -> Story -> Outputs/Scenes -> Assets
--
-- Intentionally lean. RLS is enabled on every table with NO policies yet:
-- TODO(suite-auth): once shared Trust Tai Suite identity and organization
-- membership are connected, add policies scoped to organization membership
-- (e.g. USING (public.is_org_member(auth.uid(), organization_id))) plus the
-- matching GRANTs. Until then these tables are unreachable by design.

create extension if not exists "pgcrypto";

-- ---------- enums ----------
do $$ begin
  create type public.story_status as enum ('drafting', 'in_production', 'ready_for_approval', 'live');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.output_format as enum ('linkedin_post', 'newsletter', 'blog_article', 'visual_story', 'cinematic_film');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.source_kind as enum ('text', 'voice_note', 'upload', 'suite_signal', 'link');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.approval_decision as enum ('pending', 'approved', 'changes_requested');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.feedback_target as enum ('world', 'story', 'scene', 'asset');
exception when duplicate_object then null; end $$;

-- ---------- studios ----------
create table if not exists public.studios (
  id uuid primary key default gen_random_uuid(),
  -- TODO(suite-auth): FK to the shared Suite organizations table once available.
  organization_id uuid,
  name text not null,
  active_world_id uuid,
  created_at timestamptz not null default now()
);

-- ---------- worlds ----------
create table if not exists public.worlds (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null,
  subtitle text,
  canon_version text not null default 'Canon v1.0',
  bible jsonb,
  created_at timestamptz not null default now()
);

alter table public.studios drop constraint if exists studios_active_world_id_fkey;
alter table public.studios
  add constraint studios_active_world_id_fkey
  foreign key (active_world_id) references public.worlds(id) on delete set null;

-- ---------- stories ----------
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  title text not null,
  source_truth text,
  deeper_truth text,
  premise text,
  why_it_matters text,
  recommended_angle text,
  status public.story_status not null default 'drafting',
  created_at timestamptz not null default now()
);

-- ---------- story_sources ----------
create table if not exists public.story_sources (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  kind public.source_kind not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- ---------- story_outputs ----------
create table if not exists public.story_outputs (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  format public.output_format not null,
  status public.story_status not null default 'drafting',
  body text,
  created_at timestamptz not null default now()
);

-- ---------- scenes ----------
create table if not exists public.scenes (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  position int not null default 1,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

-- ---------- assets ----------
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid references public.scenes(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  kind text not null check (kind in ('image', 'video', 'audio')),
  url text,
  -- Production engine that produced it (e.g. 'runway'); called server-side only.
  engine text,
  created_at timestamptz not null default now()
);

-- ---------- approvals ----------
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references public.stories(id) on delete cascade,
  story_output_id uuid references public.story_outputs(id) on delete cascade,
  scene_id uuid references public.scenes(id) on delete cascade,
  decision public.approval_decision not null default 'pending',
  note text,
  -- TODO(suite-auth): decided_by uuid -> shared Suite user id.
  created_at timestamptz not null default now()
);

-- ---------- creative_feedback ----------
-- Corrections become durable memory: feedback can point at a world, story,
-- scene, or asset so Studio AI learns the house rules over time.
create table if not exists public.creative_feedback (
  id uuid primary key default gen_random_uuid(),
  target_type public.feedback_target not null,
  target_id uuid not null,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists stories_world_id_idx on public.stories(world_id);
create index if not exists story_sources_story_id_idx on public.story_sources(story_id);
create index if not exists story_outputs_story_id_idx on public.story_outputs(story_id);
create index if not exists scenes_story_id_idx on public.scenes(story_id);
create index if not exists assets_scene_id_idx on public.assets(scene_id);
create index if not exists creative_feedback_target_idx on public.creative_feedback(target_type, target_id);

-- ---------- RLS ----------
alter table public.studios enable row level security;
alter table public.worlds enable row level security;
alter table public.stories enable row level security;
alter table public.story_sources enable row level security;
alter table public.story_outputs enable row level security;
alter table public.scenes enable row level security;
alter table public.assets enable row level security;
alter table public.approvals enable row level security;
alter table public.creative_feedback enable row level security;
