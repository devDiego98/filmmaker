-- FILMMAKER schema
-- Paste this whole file into the Supabase SQL Editor (your project → SQL Editor → New query) and run it.
-- Safe to re-run: every statement is guarded with "if not exists" / "or replace" / "drop ... if exists" first.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles: mirrors auth.users(id, email) so the app can show teammates'
-- emails without client-side access to the auth schema. Populated by a
-- trigger on signup; backfilled here for accounts that predate the trigger.
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null
);

insert into profiles (id, email)
select id, email from auth.users
on conflict (id) do update set email = excluded.email;

create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- projects (one row per project a user creates; everything else hangs off this)
-- ---------------------------------------------------------------------------
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  current_shoot_day integer not null default 0,
  total_shoot_days integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- project_members: real membership (replaces the old free-text team_members
-- contact list). An invite is a row keyed by email with user_id null; it's
-- "claimed" (user_id filled in) the moment someone with that email logs in
-- — see claim_project_invites() below, called from the client right after auth.
-- ---------------------------------------------------------------------------
drop table if exists team_members cascade;

create table if not exists project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  email text not null,
  user_id uuid references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'director', 'casting_director', 'crew')),
  created_at timestamptz not null default now()
);

create unique index if not exists project_members_project_email_idx
  on project_members (project_id, lower(email));

-- ---------------------------------------------------------------------------
-- Helper functions. security definer so they read projects/project_members
-- with elevated privilege — lets RLS policies call them without recursing
-- into the RLS of the tables they inspect (the standard Supabase pattern).
-- ---------------------------------------------------------------------------
create or replace function has_project_access(p_project_id uuid) returns boolean as $$
  select exists (
    select 1 from projects where id = p_project_id and owner_id = auth.uid()
  ) or exists (
    select 1 from project_members where project_id = p_project_id and user_id = auth.uid()
  );
$$ language sql security definer stable set search_path = public;

create or replace function project_role(p_project_id uuid) returns text as $$
  select case
    when exists (select 1 from projects where id = p_project_id and owner_id = auth.uid())
      then 'admin'
    else (
      select role from project_members
      where project_id = p_project_id and user_id = auth.uid()
      limit 1
    )
  end;
$$ language sql security definer stable set search_path = public;

-- Called from the client right after sign-in / on session load. Links any
-- pending (user_id is null) invite rows matching the caller's email.
create or replace function claim_project_invites() returns void as $$
  update project_members
  set user_id = auth.uid()
  where user_id is null
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$ language sql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- projects RLS
-- ---------------------------------------------------------------------------
alter table projects enable row level security;

drop policy if exists "projects_owner_all" on projects;
drop policy if exists "projects_select" on projects;
drop policy if exists "projects_insert" on projects;
drop policy if exists "projects_update" on projects;
drop policy if exists "projects_delete" on projects;

create policy "projects_select" on projects
  for select using (has_project_access(id));
create policy "projects_insert" on projects
  for insert with check (owner_id = auth.uid());
create policy "projects_update" on projects
  for update using (owner_id = auth.uid() or project_role(id) = 'admin');
create policy "projects_delete" on projects
  for delete using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- profiles RLS: readable only for people who share a project with you.
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;

drop policy if exists "profiles_shared_project_read" on profiles;
create policy "profiles_shared_project_read" on profiles
  for select using (
    id = auth.uid()
    or id in (select owner_id from projects where has_project_access(id))
    or id in (
      select user_id from project_members pm
      where pm.user_id is not null and has_project_access(pm.project_id)
    )
  );

-- ---------------------------------------------------------------------------
-- project_members RLS: anyone with project access can see the roster;
-- only the owner or an "admin"-role member can add/edit/remove people.
-- ---------------------------------------------------------------------------
alter table project_members enable row level security;

drop policy if exists "project_members_select" on project_members;
drop policy if exists "project_members_manage" on project_members;

create policy "project_members_select" on project_members
  for select using (has_project_access(project_id));
create policy "project_members_manage" on project_members
  for all
  using (project_role(project_id) = 'admin')
  with check (project_role(project_id) = 'admin');

-- ---------------------------------------------------------------------------
-- Domain tables. Array-typed fields (character_ids, props, photos, ...) map
-- directly from the TS domain types in src/types/index.ts — no join tables.
-- ---------------------------------------------------------------------------

create table if not exists characters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  name text not null
);

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  name text not null,
  address text,
  status text not null check (status in ('negotiating', 'confirmed', 'permit_pending')),
  photos text[] not null default '{}',
  notes text
);

create table if not exists scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  number text not null,
  heading text not null,
  synopsis text,
  color text not null check (color in ('white', 'blue', 'pink', 'yellow')),
  location_id uuid references locations (id) on delete set null,
  character_ids uuid[] not null default '{}',
  props text[] not null default '{}',
  wardrobe text[] not null default '{}',
  effects text[] not null default '{}',
  vehicles text[] not null default '{}',
  extras text[] not null default '{}',
  estimated_minutes integer
);

create table if not exists actors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  name text not null,
  photo_url text,
  self_tape_url text,
  contact text,
  agent text,
  character_id uuid references characters (id) on delete set null,
  status text not null check (status in ('searching', 'auditioned', 'callback', 'confirmed')),
  notes text
);

create table if not exists shoot_days (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  date date not null,
  scene_ids uuid[] not null default '{}',
  location_id uuid references locations (id) on delete set null
);

create table if not exists budget_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  department text not null check (department in ('arte', 'vestuario', 'camara', 'sonido', 'produccion', 'otros')),
  description text not null,
  budgeted numeric not null default 0,
  actual numeric not null default 0
);

create table if not exists call_sheets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  shoot_day_id uuid references shoot_days (id) on delete set null,
  date date not null,
  call_time text not null,
  weather text,
  notes text
);

create table if not exists continuity_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  scene_id uuid references scenes (id) on delete set null,
  take_number integer not null default 1,
  duration text,
  notes text,
  is_circle_take boolean not null default false,
  photos text[] not null default '{}'
);

create table if not exists post_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  title text not null,
  status text not null check (status in ('todo', 'in_progress', 'done'))
);

create table if not exists cut_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  label text not null,
  date date not null,
  notes text
);

create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  label text not null,
  done boolean not null default false
);

-- ---------------------------------------------------------------------------
-- RLS: role-aware per table, per the read/write matrix documented in
-- CLAUDE.md. `admin` always includes the project owner (see project_role()).
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  read_roles text[];
  write_roles text[];
  matrix jsonb := '{
    "scenes":              {"read": ["admin","director","crew"],                     "write": ["admin","director"]},
    "characters":          {"read": ["admin","director","casting_director","crew"],  "write": ["admin","director"]},
    "locations":           {"read": ["admin","director","crew"],                     "write": ["admin","director"]},
    "actors":              {"read": ["admin","director","casting_director","crew"],  "write": ["admin","casting_director"]},
    "shoot_days":          {"read": ["admin","director","crew"],                     "write": ["admin","director"]},
    "budget_items":        {"read": ["admin","director"],                            "write": ["admin"]},
    "call_sheets":         {"read": ["admin","director","crew"],                     "write": ["admin","director"]},
    "continuity_entries":  {"read": ["admin","director"],                            "write": ["admin","director"]},
    "post_tasks":          {"read": ["admin","director"],                            "write": ["admin"]},
    "cut_versions":        {"read": ["admin","director"],                            "write": ["admin"]},
    "checklist_items":     {"read": ["admin","director"],                            "write": ["admin"]}
  }'::jsonb;
begin
  for t in select jsonb_object_keys(matrix) loop
    read_roles := array(select jsonb_array_elements_text(matrix -> t -> 'read'));
    write_roles := array(select jsonb_array_elements_text(matrix -> t -> 'write'));

    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "%1$s_project_owner_all" on %1$I', t);
    execute format('drop policy if exists "%1$s_select" on %1$I', t);
    execute format('drop policy if exists "%1$s_insert" on %1$I', t);
    execute format('drop policy if exists "%1$s_update" on %1$I', t);
    execute format('drop policy if exists "%1$s_delete" on %1$I', t);

    execute format(
      'create policy "%1$s_select" on %1$I for select using (project_role(project_id) = any(%2$L::text[]))',
      t, read_roles
    );
    execute format(
      'create policy "%1$s_insert" on %1$I for insert with check (project_role(project_id) = any(%2$L::text[]))',
      t, write_roles
    );
    execute format(
      'create policy "%1$s_update" on %1$I for update using (project_role(project_id) = any(%2$L::text[])) with check (project_role(project_id) = any(%2$L::text[]))',
      t, write_roles
    );
    execute format(
      'create policy "%1$s_delete" on %1$I for delete using (project_role(project_id) = any(%2$L::text[]))',
      t, write_roles
    );

    execute format('create index if not exists %1$s_project_id_idx on %1$I (project_id)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage: a single "media" bucket for location/actor/continuity photos and
-- self-tapes. Public read (so <img>/<video> tags can load files directly by
-- URL); write/delete allowed for anyone with project access (not narrowed
-- to the per-table write roles above — a stray uploaded file isn't a
-- meaningful security boundary the way the structured tables are). Files
-- are expected to be uploaded under a "<project_id>/..." path.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
  for select
  using (bucket_id = 'media');

drop policy if exists "media_owner_write" on storage.objects;
drop policy if exists "media_member_write" on storage.objects;
create policy "media_member_write" on storage.objects
  for insert
  with check (
    bucket_id = 'media'
    and has_project_access((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "media_owner_delete" on storage.objects;
drop policy if exists "media_member_delete" on storage.objects;
create policy "media_member_delete" on storage.objects
  for delete
  using (
    bucket_id = 'media'
    and has_project_access((storage.foldername(name))[1]::uuid)
  );
