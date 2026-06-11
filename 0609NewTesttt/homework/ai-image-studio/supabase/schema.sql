-- ============================================================================
--  AI Image Studio — Supabase schema
--  Run this in the Supabase SQL Editor (Dashboard → SQL → New query → Run).
--  Auth users live in the built-in `auth.users` table; we only add app data.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. generations table — one row per image generation request
-- ----------------------------------------------------------------------------
create table if not exists public.generations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  prompt          text not null,
  negative_prompt text,
  style           text not null default 'realistic',
  aspect_ratio    text not null default '1:1',
  model           text not null default 'fal-ai/flux/dev',
  fal_request_id  text,
  fal_status_url   text,         -- returned by fal at submit; used for polling
  fal_response_url text,         -- returned by fal at submit; used to fetch result
  image_path      text,          -- path inside the storage bucket
  image_url       text,          -- public URL of the stored image
  status          text not null default 'pending'
                    check (status in ('pending','processing','completed','failed')),
  error           text,
  created_at      timestamptz not null default now()
);

create index if not exists generations_user_created_idx
  on public.generations (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 2. Row Level Security — each user only sees / mutates their own rows
-- ----------------------------------------------------------------------------
alter table public.generations enable row level security;

drop policy if exists "own rows: select" on public.generations;
create policy "own rows: select" on public.generations
  for select using (auth.uid() = user_id);

drop policy if exists "own rows: insert" on public.generations;
create policy "own rows: insert" on public.generations
  for insert with check (auth.uid() = user_id);

drop policy if exists "own rows: update" on public.generations;
create policy "own rows: update" on public.generations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows: delete" on public.generations;
create policy "own rows: delete" on public.generations
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. Storage bucket for the rendered images
--    Public read (so <img> can load without signing), writes locked to owner.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('generations', 'generations', true)
on conflict (id) do nothing;

-- Images are stored under "<user_id>/<generation_id>.<ext>".
-- The first path segment must equal the requester's uid for writes.

drop policy if exists "gen images: public read" on storage.objects;
create policy "gen images: public read" on storage.objects
  for select using (bucket_id = 'generations');

drop policy if exists "gen images: owner insert" on storage.objects;
create policy "gen images: owner insert" on storage.objects
  for insert with check (
    bucket_id = 'generations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "gen images: owner update" on storage.objects;
create policy "gen images: owner update" on storage.objects
  for update using (
    bucket_id = 'generations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "gen images: owner delete" on storage.objects;
create policy "gen images: owner delete" on storage.objects
  for delete using (
    bucket_id = 'generations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
