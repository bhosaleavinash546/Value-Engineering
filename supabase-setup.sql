-- ════════════════════════════════════════════════════════════
--  VAVEhub — Supabase database setup
--  Run this ONCE in your Supabase project:
--  Dashboard → SQL Editor → New query → paste all → Run.
--  Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
-- ════════════════════════════════════════════════════════════

-- 1) PROFILES — one row per user, created on sign-up
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  created_at  timestamptz default now()
);

-- 2) PROGRESS — the learner's course/exam state (mirrors localStorage)
create table if not exists public.progress (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz default now()
);

-- 3) CERTIFICATES — issued credentials, publicly verifiable by ID
create table if not exists public.certificates (
  id          text primary key,               -- e.g. VH-XXXXXX
  user_id     uuid references auth.users(id) on delete set null,
  full_name   text not null,
  score       int  not null,
  issued_at   timestamptz default now()
);

-- ── Row Level Security ──────────────────────────────────────
alter table public.profiles     enable row level security;
alter table public.progress     enable row level security;
alter table public.certificates enable row level security;

-- profiles: each user reads/writes only their own row
drop policy if exists "own profile read"  on public.profiles;
drop policy if exists "own profile write" on public.profiles;
create policy "own profile read"  on public.profiles for select using (auth.uid() = id);
create policy "own profile write" on public.profiles for all    using (auth.uid() = id) with check (auth.uid() = id);

-- progress: each user reads/writes only their own row
drop policy if exists "own progress read"  on public.progress;
drop policy if exists "own progress write" on public.progress;
create policy "own progress read"  on public.progress for select using (auth.uid() = user_id);
create policy "own progress write" on public.progress for all    using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- certificates: a user inserts their own; ANYONE may read by ID (public verification)
drop policy if exists "public cert read"   on public.certificates;
drop policy if exists "own cert insert"    on public.certificates;
create policy "public cert read" on public.certificates for select using (true);
create policy "own cert insert"  on public.certificates for insert with check (auth.uid() = user_id);

-- ── Auto-create a profile row when a user signs up ──────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Done. Your VAVEhub project is ready.
