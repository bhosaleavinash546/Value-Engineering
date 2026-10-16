-- ════════════════════════════════════════════════════════════════
-- VAVEhub — verified learner quotes (run once in Supabase → SQL Editor)
--
-- After passing, a learner may leave one or two sentences about the course,
-- with their name and (optionally) their role, and a tick to say it may be
-- shown. Nothing appears on the site until the site owner approves it in the
-- dashboard. Each quote shown links to the learner's own certificate, so a
-- visitor can check it's real.
--
-- Safe to run more than once.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.testimonials (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  course        text not null check (course in ('academy', 'leaders')),
  cert_id       text not null references public.certificates(id) on delete cascade,
  quote         text not null check (char_length(quote) between 15 and 400),
  display_name  text not null check (char_length(display_name) between 2 and 80),
  role          text check (role is null or char_length(role) <= 80),
  consent       boolean not null check (consent),
  approved      boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (user_id, course)
);

-- No policies: the table can't be read or written directly from the website.
-- Everything goes through the functions below.
alter table public.testimonials enable row level security;

-- A learner sends (or replaces, until it's approved) their quote. Only for a
-- certificate that belongs to them, and only with the consent tick.
create or replace function public.submit_testimonial(p_course text, p_cert text, p_quote text, p_name text, p_role text, p_consent boolean)
returns text language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Please sign in first' using errcode = '42501'; end if;
  if not coalesce(p_consent, false) then raise exception 'Please tick the box to agree to the quote being shown'; end if;
  if not exists (select 1 from public.certificates c where c.id = p_cert and c.user_id = uid) then
    raise exception 'That certificate is not on your account' using errcode = '42501';
  end if;
  insert into public.testimonials (user_id, course, cert_id, quote, display_name, role, consent)
  values (uid, p_course, p_cert, btrim(p_quote), btrim(p_name), nullif(btrim(coalesce(p_role, '')), ''), true)
  on conflict (user_id, course) do update
    set quote = excluded.quote, display_name = excluded.display_name, role = excluded.role,
        cert_id = excluded.cert_id, created_at = now()
    where public.testimonials.approved = false;   -- an approved quote isn't changed silently
  return 'ok';
end; $$;

-- What the course pages show: approved quotes only, without account details.
create or replace function public.approved_testimonials(p_course text)
returns table (quote text, display_name text, role text, cert_id text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select t.quote, t.display_name, t.role, t.cert_id, t.created_at
  from public.testimonials t
  where t.approved and t.course = p_course
  order by t.created_at desc
  limit 12;
$$;

-- The dashboard: every quote, and approve / hide / delete. Site owner only.
create or replace function public.admin_testimonials()
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'Only the site owner can do this' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(t) - 'user_id' order by t.created_at desc) from public.testimonials t), '[]'::jsonb);
end; $$;

create or replace function public.admin_set_testimonial(p_id uuid, p_approved boolean, p_delete boolean default false)
returns text language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'Only the site owner can do this' using errcode = '42501'; end if;
  if p_delete then delete from public.testimonials where id = p_id;
  else update public.testimonials set approved = p_approved where id = p_id; end if;
  return 'ok';
end; $$;

revoke all on function public.submit_testimonial(text, text, text, text, text, boolean) from public, anon;
revoke all on function public.admin_testimonials()                                from public, anon;
revoke all on function public.admin_set_testimonial(uuid, boolean, boolean)       from public, anon;
grant execute on function public.submit_testimonial(text, text, text, text, text, boolean) to authenticated;
grant execute on function public.approved_testimonials(text)                      to anon, authenticated;
grant execute on function public.admin_testimonials()                             to authenticated;
grant execute on function public.admin_set_testimonial(uuid, boolean, boolean)    to authenticated;

-- Done. Quotes learners send will wait in your dashboard ("Learner quotes") for approval.
