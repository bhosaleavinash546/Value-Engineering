-- ════════════════════════════════════════════════════════════════
-- VAVEhub — welcome tour counts (run once in Supabase → SQL Editor)
--
-- The welcome tour (welcome.js) sends a few anonymous events: the question
-- was shown or skipped, which path was chosen, how far the tour got, and
-- which "first 10 minutes" items were ticked. Each comes with a random
-- number made in the visitor's browser, so a visitor is counted once.
-- No name, email, account or IP address is stored.
--
-- The dashboard reads the totals through welcome_stats(), for the site
-- owner only. Safe to run more than once.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.welcome_events (
  id          bigint generated always as identity primary key,
  visitor     text not null check (char_length(visitor) between 4 and 16),
  event       text not null check (char_length(event) between 2 and 32),
  path        text check (path is null or path in ('student', 'pro', 'leader', 'explore')),
  page        text check (page is null or char_length(page) <= 80),
  created_at  timestamptz not null default now()
);
create index if not exists welcome_events_created on public.welcome_events (created_at);

-- No policies: the table can't be read or written directly from the website.
alter table public.welcome_events enable row level security;

-- Anyone may add an event, but only in the shape the tour sends,
-- and at most 60 a day from one visitor.
create or replace function public.log_welcome(p_visitor text, p_event text, p_path text default null, p_page text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_visitor !~ '^[a-z0-9]{4,16}$' then return; end if;
  if p_event !~ '^(shown|skip|close|path|step[1-9]|finish|finish_stay|signin_tour|checklist_done|checklist_hidden|item:[a-z0-9]{2,12})$' then return; end if;
  if p_path is not null and p_path not in ('student', 'pro', 'leader', 'explore') then p_path := null; end if;
  if (select count(*) from welcome_events where visitor = p_visitor and created_at > now() - interval '1 day') >= 60 then return; end if;
  insert into welcome_events (visitor, event, path, page) values (p_visitor, p_event, p_path, left(p_page, 80));
end;
$$;
revoke all on function public.log_welcome(text, text, text, text) from public;
grant execute on function public.log_welcome(text, text, text, text) to anon, authenticated;

-- Totals for the dashboard: for each event and path, how many visitors and
-- how many events, over the last p_days days (null = all time).
create or replace function public.welcome_stats(p_days int default null)
returns table (event text, path text, visitors bigint, events bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
    select w.event, w.path, count(distinct w.visitor), count(*)
    from welcome_events w
    where p_days is null or w.created_at > now() - make_interval(days => p_days)
    group by w.event, w.path;
end;
$$;
revoke all on function public.welcome_stats(int) from public;
grant execute on function public.welcome_stats(int) to authenticated;
