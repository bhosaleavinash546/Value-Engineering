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

-- certificates: nobody can list them. Anyone can check ONE certificate by its ID, or read the total, through the
-- two functions below. A signed-in learner can only save their own certificate, with a passing score
-- (VE Academy "VH-" ≥ 80%, VAVE for Leaders "VL-" ≥ 70%), a real name, and one certificate per course.
drop policy if exists "public cert read"   on public.certificates;
drop policy if exists "own cert read"      on public.certificates;
drop policy if exists "own cert insert"    on public.certificates;
drop policy if exists "own cert update"    on public.certificates;
create policy "own cert read" on public.certificates for select using (auth.uid() = user_id);

create or replace function public.cert_is_valid(cert_id text, name text, pct int)
returns boolean language sql immutable as $$
  select length(trim(coalesce(name, ''))) between 2 and 60
     and ((cert_id ~ '^VH-[A-Z0-9]{4,16}$' and pct between 80 and 100)
       or (cert_id ~ '^VL-[A-Z0-9]{4,16}$' and pct between 70 and 100));
$$;

create policy "own cert insert" on public.certificates for insert with check (
  auth.uid() = user_id
  and public.cert_is_valid(id, full_name, score)
  and not exists (select 1 from public.certificates c
                  where c.user_id = auth.uid() and left(c.id, 3) = left(certificates.id, 3))
);
create policy "own cert update" on public.certificates for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.cert_is_valid(id, full_name, score));

create or replace function public.verify_certificate(cert_id text)
returns table (id text, full_name text, score int, issued_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, c.full_name, c.score, c.issued_at from public.certificates c where c.id = cert_id;
$$;
create or replace function public.certificate_count()
returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from public.certificates;
$$;
grant execute on function public.verify_certificate(text) to anon, authenticated;
grant execute on function public.certificate_count()      to anon, authenticated;

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

-- ── Module feedback ("Was this module helpful?") ─────────────
-- Anonymous: no user id, name or email is stored. Anyone may ADD a row;
-- nobody can read rows through the website — view them in the Supabase
-- dashboard (Table Editor → module_feedback).
create table if not exists public.module_feedback (
  id         bigint generated always as identity primary key,
  module     text        not null check (module ~ '^(m([1-9]|1[0-3])|l[0-6])$'),
  helpful    boolean     not null,
  comment    text        check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now()
);
alter table public.module_feedback enable row level security;
drop policy if exists "anyone can send feedback" on public.module_feedback;
create policy "anyone can send feedback" on public.module_feedback
  for insert to anon, authenticated with check (true);
grant insert on public.module_feedback to anon, authenticated;

-- ── Short courses (VAVE for Leaders) ─────────────────────────
-- One row per learner per course, so a short course never overwrites Academy progress.
create table if not exists public.course_progress (
  user_id    uuid not null references auth.users(id) on delete cascade,
  course     text not null check (course ~ '^[a-z0-9-]{2,30}$'),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now(),
  primary key (user_id, course)
);
alter table public.course_progress enable row level security;
drop policy if exists "own course progress" on public.course_progress;
create policy "own course progress" on public.course_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on public.course_progress to authenticated;

-- Feedback may also come from the leaders course modules (l0–l6).
alter table public.module_feedback drop constraint if exists module_feedback_module_check;
alter table public.module_feedback add constraint module_feedback_module_check
  check (module ~ '^(m([1-9]|1[0-3])|l[0-6])$');

-- ── Owner dashboard (admin.html) ─────────────────────────────
-- Extra profile details, recorded when a learner visits the Academy (at most once a day):
-- the browser's time zone and language (to estimate the country; no IP address is used),
-- phone or computer, the website that first sent them here, and when they were last seen.
alter table public.profiles
  add column if not exists timezone     text,
  add column if not exists language     text,
  add column if not exists device       text,
  add column if not exists source       text,
  add column if not exists last_seen_at timestamptz;

-- Who may open the dashboard. No policies = nobody can read this table through the website.
-- To add another admin:  insert into public.admins (email) values ('someone@example.com');
create table if not exists public.admins (email text primary key);
alter table public.admins enable row level security;
insert into public.admins (email) values ('bhosale.avinash546@gmail.com') on conflict do nothing;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from public.admins a join auth.users u on lower(u.email) = lower(a.email)
    where u.id = auth.uid() and u.email_confirmed_at is not null);
$$;

-- Everything the dashboard shows, in one call. Refuses anyone who isn't an admin.
create or replace function public.admin_dashboard()
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then
    raise exception 'Only the site owner can open the dashboard' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'generated_at', now(),
    'users', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'name', coalesce(nullif(p.full_name, ''), u.raw_user_meta_data->>'full_name'),
        'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at,
        'confirmed', u.email_confirmed_at is not null,
        'timezone', p.timezone, 'language', p.language, 'device', p.device,
        'source', p.source, 'last_seen_at', p.last_seen_at,
        'progress', pr.data, 'progress_at', pr.updated_at,
        'courses', (select jsonb_object_agg(cp.course, cp.data || jsonb_build_object('updated_at', cp.updated_at))
                    from public.course_progress cp where cp.user_id = u.id)
      ) order by u.created_at desc)
      from auth.users u
      left join public.profiles p on p.id = u.id
      left join public.progress pr on pr.user_id = u.id), '[]'::jsonb),
    'certificates', coalesce((select jsonb_agg(to_jsonb(c) order by c.issued_at desc) from public.certificates c), '[]'::jsonb),
    'feedback', coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at desc) from public.module_feedback f), '[]'::jsonb)
  );
end; $$;

revoke all on function public.is_admin()        from public, anon;
revoke all on function public.admin_dashboard() from public, anon;
grant execute on function public.is_admin()        to authenticated;
grant execute on function public.admin_dashboard() to authenticated;

-- Done. Your VAVEhub project is ready.
