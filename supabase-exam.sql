-- ═══════════════════════════════════════════════════════════════
-- VAVEhub · exams marked on the server (VE Academy exam, VAVE for Leaders quiz)
-- Run once in Supabase → SQL Editor, after supabase-setup.sql. Safe to run again.
--
-- The question banks themselves are NOT in this public repository. They are loaded
-- separately (exam-questions.sql, kept private) into public.exam_questions, which no
-- visitor can read. The page asks start_exam() for a paper (questions without answers),
-- sends the chosen options to submit_exam(), and asks issue_certificate() for the
-- certificate after a pass. The browser can no longer create certificates itself.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.exam_questions (
  id          serial primary key,
  course      text not null check (course in ('academy', 'leaders')),
  module      text not null,                 -- m1…m13 or l0…l6
  kind        text not null default 'recall', -- recall | apply | calc
  pool        text,                           -- 'case' = case-study extra
  q           text not null,
  options     jsonb not null,                 -- array of option strings
  answer      int  not null,                  -- index of the right option in "options"
  explanation text not null default '',
  active      boolean not null default true
);
alter table public.exam_questions enable row level security;   -- no policies: nobody reads it directly
revoke all on public.exam_questions from anon, authenticated;

create table if not exists public.exam_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  course       text not null,
  qids         int[] not null,
  perms        jsonb not null,                -- option order shown for each question
  started_at   timestamptz not null default now(),
  submitted_at timestamptz,
  score        int,
  passed       boolean,
  by_module    jsonb
);
alter table public.exam_attempts enable row level security;
drop policy if exists "own attempts read" on public.exam_attempts;
create policy "own attempts read" on public.exam_attempts for select using (auth.uid() = user_id);
revoke insert, update, delete on public.exam_attempts from anon, authenticated;
create index if not exists exam_attempts_user on public.exam_attempts (user_id, course, submitted_at desc);
-- the option each learner chose for each question (index into exam_questions.options), so badly
-- worded questions show up in the owner's "Hardest questions" table
alter table public.exam_attempts add column if not exists answers int[];
-- the marked result, so a paper sent twice (a lost reply, a double click) gets the same answer back
alter table public.exam_attempts add column if not exists result jsonb;

-- certificates are now issued only by issue_certificate() below
drop policy if exists "own cert insert" on public.certificates;
drop policy if exists "own cert update" on public.certificates;
revoke insert, update, delete on public.certificates from anon, authenticated;

create or replace function public.exam_pass_mark(p_course text)
returns int language sql immutable as $$ select case when p_course = 'leaders' then 70 else 80 end $$;

-- ── start: pick a paper and return it without the answers ──
create or replace function public.start_exam(p_course text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  last_fail timestamptz;
  picked int[];
  per_module int;
  extras int;
  perms jsonb;
  aid uuid;
  paper jsonb;
begin
  if uid is null then raise exception 'Please sign in first' using errcode = '28000'; end if;
  if p_course not in ('academy', 'leaders') then raise exception 'Unknown course'; end if;

  -- the Academy exam opens only once all 13 modules are marked complete in the learner's saved progress
  if p_course = 'academy' and (
       select count(distinct d) from progress p, jsonb_array_elements_text(coalesce(p.data -> 'done', '[]'::jsonb)) d
        where p.user_id = uid and d ~ '^m([1-9]|1[0-3])$') < 13 then
    return jsonb_build_object('need_modules', true);
  end if;


  -- one hour's wait after a failed attempt
  select max(submitted_at) into last_fail from exam_attempts
   where user_id = uid and course = p_course and passed = false;
  if last_fail is not null and last_fail > now() - interval '1 hour' then
    return jsonb_build_object('wait_until', last_fail + interval '1 hour');
  end if;

  -- Academy: 2 per module + 4 scenario, calculation or case-study extras (30).
  -- Leaders: 1 per module + 5 more (12).
  per_module := case when p_course = 'academy' then 2 else 1 end;
  extras     := case when p_course = 'academy' then 4 else 5 end;
  picked := array(
    select id from (
      select id, row_number() over (partition by module order by random()) rn
        from exam_questions where course = p_course and active
    ) t where rn <= per_module);
  picked := picked || array(
    select id from exam_questions
     where course = p_course and active and id <> all(picked)
       and (p_course = 'leaders' or kind in ('apply', 'calc') or pool = 'case')
     order by random() limit extras);
  if coalesce(array_length(picked, 1), 0) = 0 then raise exception 'The question bank is empty'; end if;
  picked := array(select x from unnest(picked) x order by random());

  select jsonb_agg((select jsonb_agg(i order by random())
                      from generate_series(0, jsonb_array_length(q.options) - 1) i) order by u.ord)
    into perms
    from unnest(picked) with ordinality u(qid, ord) join exam_questions q on q.id = u.qid;

  insert into exam_attempts (user_id, course, qids, perms) values (uid, p_course, picked, perms)
  returning id into aid;

  select jsonb_agg(jsonb_build_object(
           'module', q.module, 'q', q.q,
           'options', (select jsonb_agg(q.options -> (p.value::text::int) order by p.ord)
                         from jsonb_array_elements(perms -> (u.ord::int - 1)) with ordinality p(value, ord)))
         order by u.ord)
    into paper
    from unnest(picked) with ordinality u(qid, ord) join exam_questions q on q.id = u.qid;

  return jsonb_build_object('attempt', aid, 'questions', paper, 'pass', exam_pass_mark(p_course));
end $$;

-- ── submit: mark the paper on the server ──
-- p_answers[i] is the position (0-based) of the option the learner chose for question i, as shown.
create or replace function public.submit_exam(p_attempt uuid, p_answers int[])
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  a exam_attempts%rowtype;
  n int; right_n int; pct int; ok boolean;
  mods jsonb; review jsonb; res jsonb;
begin
  select * into a from exam_attempts where id = p_attempt and user_id = uid for update;
  if not found then raise exception 'Attempt not found'; end if;
  if a.submitted_at is not null then
    if a.result is not null then return a.result; end if;   -- sent twice: the first marking stands
    raise exception 'This attempt has already been marked';
  end if;
  -- only the newest paper counts, and only for three hours (so nobody can keep several papers open
  -- and submit whichever they have researched)
  if exists (select 1 from exam_attempts x where x.user_id = uid and x.course = a.course and x.started_at > a.started_at) then
    raise exception 'This paper is not the latest one. Start the exam again.';
  end if;
  if a.started_at < now() - interval '3 hours' then raise exception 'This paper has expired. Start the exam again.'; end if;

  create temporary table if not exists _marks (ord int, module text, q text, opts jsonb, chosen int, answer int, expl text) on commit drop;
  delete from _marks;
  insert into _marks
  select u.ord, q.module, q.q, q.options,
         case when p_answers[u.ord] is null then null
              else (a.perms -> (u.ord::int - 1) ->> p_answers[u.ord])::int end,
         q.answer, q.explanation
    from unnest(a.qids) with ordinality u(qid, ord) join exam_questions q on q.id = u.qid;

  select count(*), count(*) filter (where chosen = answer) into n, right_n from _marks;
  pct := round(100.0 * right_n / greatest(n, 1));
  ok  := pct >= exam_pass_mark(a.course);

  select jsonb_object_agg(module, jsonb_build_array(r, t)) into mods
    from (select module, count(*) filter (where chosen = answer) r, count(*) t from _marks group by module) s;

  if ok then   -- after a pass: what you missed, with the explanation
    select coalesce(jsonb_agg(jsonb_build_object('q', q, 'yours', coalesce(opts ->> chosen, ''),
                                                 'right', opts ->> answer, 'why', expl) order by ord), '[]'::jsonb)
      into review from _marks where chosen is distinct from answer;
  end if;

  res := jsonb_build_object('score', pct, 'right', right_n, 'total', n, 'passed', ok,
                            'pass', exam_pass_mark(a.course), 'by_module', mods, 'review', review,
                            'wait_until', case when ok then null else now() + interval '1 hour' end);

  update exam_attempts set submitted_at = now(), score = pct, passed = ok, by_module = mods,
         answers = array(select chosen from _marks order by ord), result = res
   where id = a.id;

  return res;
end $$;

-- ── certificate: only after a passed attempt; one per learner per course ──
create or replace function public.issue_certificate(p_attempt uuid, p_name text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  a exam_attempts%rowtype;
  nm text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
  prefix text;
  c certificates%rowtype;
begin
  select * into a from exam_attempts where id = p_attempt and user_id = uid and passed;
  if not found then raise exception 'No passed attempt found'; end if;
  if length(nm) < 2 or length(nm) > 60 then raise exception 'Please enter your name (2 to 60 characters)'; end if;
  prefix := case when a.course = 'leaders' then 'VL-' else 'VH-' end;

  select * into c from certificates where user_id = uid and left(id, 3) = prefix order by issued_at limit 1;
  if found then
    update certificates set full_name = nm, score = greatest(score, a.score) where id = c.id
    returning * into c;
  else
    insert into certificates (id, user_id, full_name, score)
    values (prefix || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)), uid, nm, a.score)
    returning * into c;
  end if;
  return jsonb_build_object('id', c.id, 'name', c.full_name, 'score', c.score, 'date', to_char(c.issued_at, 'YYYY-MM-DD'));
end $$;

-- ── owner dashboard: how each question performs (admins only) ──
create or replace function public.admin_question_stats()
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(s) order by s.pct_right, s.attempts desc)
      from (
        select q.id, q.course, q.module, q.q, count(*) as attempts,
               round(100.0 * count(*) filter (where x.chosen = q.answer) / count(*)) as pct_right,
               (select q.options ->> w.chosen from (
                  select x2.chosen, count(*) n
                    from exam_attempts a2, unnest(a2.qids, a2.answers) x2(qid, chosen)
                   where x2.qid = q.id and x2.chosen is distinct from q.answer and x2.chosen is not null
                   group by x2.chosen order by n desc limit 1) w) as common_wrong
          from exam_attempts a, unnest(a.qids, a.answers) x(qid, chosen)
          join exam_questions q on q.id = x.qid
         where a.submitted_at is not null and a.answers is not null
         group by q.id
      ) s), '[]'::jsonb);
end $$;
revoke all on function public.admin_question_stats() from public, anon;
grant execute on function public.admin_question_stats() to authenticated;

revoke all on function public.start_exam(text)               from public;
revoke all on function public.submit_exam(uuid, int[])        from public;
revoke all on function public.issue_certificate(uuid, text)   from public;
grant execute on function public.start_exam(text)             to authenticated;
grant execute on function public.submit_exam(uuid, int[])     to authenticated;
grant execute on function public.issue_certificate(uuid, text) to authenticated;
