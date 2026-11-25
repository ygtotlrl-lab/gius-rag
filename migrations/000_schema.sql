-- migrations/000_schema.sql — גיוס לבית חב"ד רמת אביב ג׳ (gius-rag): הטבלאות gr_ בפרויקט של גיוס

-- נגזרות במבנה מטבלאות g_ של גיוס (like … including all), בלי הלוואות, רשומות ותקציב אירוע; ובנוסף gr_journal ו-gr_users.
-- sh_backup ו-sh_sync_log — המשותפות לפרויקט, בקובץ הסכימה של גיוס.

-- ── גיוס · בית חב״ד רמת אביב ג׳ ──

-- נגזרות במבנה מטבלאות g_ של גיוס (like … including all), בלי הלוואות, רשומות ותקציב אירוע; ובנוסף gr_journal ו-gr_users.
-- sh_backup ו-sh_sync_log — המשותפות לפרויקט, בקובץ הסכימה של גיוס.
create table if not exists public.gr_donors (
  client_id text not null,
  name text not null,
  phone text,
  notes text,
  deleted boolean not null default false,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at bigint not null,
  deleted_by text,
  role text,
  birth_date date,
  affiliations text[] not null default '{}'::text[],
  ambassador text,
  starred boolean not null default false,
  is_general boolean not null default false,
  dates jsonb not null default '[]'::jsonb,
  constraint gr_donors_pkey PRIMARY KEY (client_id)
);

create table if not exists public.gr_journal (
  client_id text not null,
  jday date not null,
  section text not null,
  body text not null default ''::text,
  deleted boolean not null default false,
  deleted_at timestamp with time zone,
  deleted_by text,
  created_at timestamp with time zone not null default now(),
  updated_at bigint not null,
  constraint gr_journal_pkey PRIMARY KEY (client_id)
);

create table if not exists public.gr_lookups (
  client_id text not null,
  kind text not null,
  label text not null,
  sort integer default 0,
  created_at timestamp with time zone default now(),
  updated_at bigint not null,
  deleted boolean default false,
  deleted_at timestamp with time zone,
  deleted_by text,
  constraint gr_lookups_pkey PRIMARY KEY (client_id)
);

create table if not exists public.gr_notes (
  client_id text not null,
  title text not null default ''::text,
  color text,
  body text not null default ''::text,
  sort integer not null default 0,
  deleted boolean not null default false,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at bigint not null,
  deleted_by text,
  constraint gr_notes_pkey PRIMARY KEY (client_id)
);

create table if not exists public.gr_plan_items (
  client_id text not null,
  donor_client_id text not null,
  plan_month text not null,
  kind text not null default 'גבייה'::text,
  expected numeric(14,2),
  ambassador text,
  care_date date,
  note text,
  irrelevant boolean not null default false,
  sort integer not null default 0,
  deleted boolean not null default false,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at bigint not null,
  deleted_by text,
  section text,
  constraint gr_plan_items_pkey PRIMARY KEY (client_id),
  constraint gr_plan_items_donor_fk FOREIGN KEY (donor_client_id) REFERENCES gr_donors(client_id) ON DELETE RESTRICT,
  constraint g_plan_items_kind_check CHECK ((kind = ANY (ARRAY['גבייה'::text, 'התרמה'::text]))),
  constraint g_plan_items_plan_month_check CHECK ((plan_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'::text))
);

create table if not exists public.gr_pledges (
  client_id text not null,
  donor_client_id text not null,
  amount numeric(14,2) not null default 0,
  note text,
  deleted boolean not null default false,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at bigint not null,
  deleted_by text,
  section text,
  pledge_type text,
  detail text,
  ambassador text,
  constraint gr_pledges_pkey PRIMARY KEY (client_id),
  constraint gr_pledges_donor_fk FOREIGN KEY (donor_client_id) REFERENCES gr_donors(client_id) ON DELETE RESTRICT
);

create table if not exists public.gr_settings (
  key text not null,
  value text,
  updated_at bigint not null,
  client_id text,
  deleted boolean not null default false,
  deleted_at timestamp with time zone,
  deleted_by text,
  constraint gr_settings_pkey PRIMARY KEY (key),
  constraint g_settings_value_json CHECK (((value IS NULL) OR ((value)::jsonb IS NOT NULL)))
);

create table if not exists public.gr_shtar_people (
  client_id text not null,
  donor_client_id text,
  name text,
  phone text not null,
  db_name text,
  wa_groups text,
  sources text,
  tried text,
  past text,
  note text,
  deleted boolean not null default false,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at bigint not null,
  deleted_by text,
  constraint gr_shtar_people_pkey PRIMARY KEY (client_id),
  constraint gr_shtar_people_donor_fk FOREIGN KEY (donor_client_id) REFERENCES gr_donors(client_id) ON DELETE RESTRICT
);

create table if not exists public.gr_shtar_calls (
  client_id text not null,
  person_client_id text not null,
  call_at timestamp with time zone not null,
  ambassador text not null,
  status text not null,
  amount numeric(14,2),
  method text,
  callback_at timestamp with time zone,
  note text,
  handled boolean not null default false,
  deleted boolean not null default false,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at bigint not null,
  deleted_by text,
  constraint gr_shtar_calls_pkey PRIMARY KEY (client_id),
  constraint gr_shtar_calls_person_fk FOREIGN KEY (person_client_id) REFERENCES gr_shtar_people(client_id) ON DELETE RESTRICT,
  constraint g_shtar_calls_status_check CHECK ((status = ANY (ARRAY['na'::text, 'wrong'::text, 'yes'::text, 'pl'::text, 'int'::text, 'cb'::text, 'no'::text, 'rmv'::text])))
);

create table if not exists public.gr_shtar_locks (
  client_id text not null,
  person_client_id text not null,
  device text,
  ambassador text,
  deleted boolean not null default false,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at bigint not null,
  deleted_by text,
  constraint gr_shtar_locks_pkey PRIMARY KEY (client_id),
  constraint gr_shtar_locks_person_client_id_key UNIQUE (person_client_id),
  constraint gr_shtar_locks_person_fk FOREIGN KEY (person_client_id) REFERENCES gr_shtar_people(client_id) ON DELETE RESTRICT
);

create table if not exists public.gr_targets (
  client_id text not null,
  target_month text not null,
  amount numeric(14,2) not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at bigint not null,
  deleted boolean not null default false,
  deleted_at timestamp with time zone,
  deleted_by text,
  constraint gr_targets_pkey PRIMARY KEY (client_id),
  constraint gr_targets_month_key UNIQUE (target_month),
  constraint g_targets_target_month_check CHECK ((target_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'::text))
);

create table if not exists public.gr_tasks (
  client_id text not null,
  title text not null,
  stage text not null default 'בעבודה'::text,
  assignee text,
  domain text,
  due_date date,
  deleted boolean not null default false,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at bigint not null,
  deleted_by text,
  note text,
  sort integer not null default 0,
  starred boolean not null default false,
  subtasks jsonb not null default '[]'::jsonb,
  constraint gr_tasks_pkey PRIMARY KEY (client_id),
  constraint g_tasks_stage_check CHECK ((stage = ANY (ARRAY['בהרצה'::text, 'הושלם'::text, 'לא רלוונטי'::text]))),
  constraint gr_tasks_stage_check CHECK ((stage = ANY (ARRAY['בעבודה'::text, 'הושלם'::text, 'לא רלוונטי'::text])))
);

create table if not exists public.gr_txns (
  client_id text not null,
  donor_client_id text not null,
  pledge_client_id text not null,
  amount numeric(14,2) not null default 0,
  txn_date date,
  cleared boolean not null default false,
  note text,
  deleted boolean not null default false,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at bigint not null,
  deleted_by text,
  method text,
  txn_month text,
  installments integer,
  not_initiated boolean not null default false,
  first_installment numeric(14,2),
  constraint gr_txns_pkey PRIMARY KEY (client_id),
  constraint gr_txns_donor_fk FOREIGN KEY (donor_client_id) REFERENCES gr_donors(client_id) ON DELETE RESTRICT,
  constraint gr_txns_pledge_fk FOREIGN KEY (pledge_client_id) REFERENCES gr_pledges(client_id) ON DELETE RESTRICT,
  constraint g_txns_first_installment_check CHECK (((first_installment IS NULL) OR ((installments IS NOT NULL) AND (first_installment > (0)::numeric) AND (first_installment <= amount)))),
  constraint g_txns_installments_check CHECK (((installments IS NULL) OR (installments >= 2))),
  constraint g_txns_txn_month_check CHECK (((txn_month IS NULL) OR (txn_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'::text)))
);

create table if not exists public.gr_users (
  client_id text not null,
  login text not null,
  full_name text not null,
  role text not null,
  active boolean not null default true,
  notify boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at bigint not null,
  constraint gr_users_pkey PRIMARY KEY (client_id),
  constraint gr_users_login_key UNIQUE (login),
  constraint k_users_login_check CHECK ((login = lower(login))),
  constraint k_users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'manager'::text, 'junior'::text])))
);

create index if not exists gr_donors_deleted_name_idx ON public.gr_donors USING btree (deleted, name);
create unique index if not exists gr_journal_day_section ON public.gr_journal USING btree (jday, section) WHERE (NOT deleted);
create index if not exists gr_lookups_kind_sort_idx ON public.gr_lookups USING btree (kind, sort);
create index if not exists gr_plan_items_deleted_plan_month_idx ON public.gr_plan_items USING btree (deleted, plan_month);
create index if not exists gr_plan_items_donor_client_id_idx ON public.gr_plan_items USING btree (donor_client_id);
create index if not exists gr_pledges_deleted_donor_client_id_idx ON public.gr_pledges USING btree (deleted, donor_client_id);
create index if not exists gr_pledges_donor_client_id_idx ON public.gr_pledges USING btree (donor_client_id);
create index if not exists gr_shtar_people_phone_idx ON public.gr_shtar_people USING btree (phone);
create index if not exists gr_shtar_calls_person_client_id_idx ON public.gr_shtar_calls USING btree (person_client_id);
create index if not exists gr_tasks_deleted_stage_idx ON public.gr_tasks USING btree (deleted, stage);
create index if not exists gr_txns_deleted_txn_month_idx ON public.gr_txns USING btree (deleted, txn_month);
create index if not exists gr_txns_donor_client_id_idx ON public.gr_txns USING btree (donor_client_id);
create index if not exists gr_txns_pledge_client_id_idx ON public.gr_txns USING btree (pledge_client_id);

CREATE OR REPLACE FUNCTION public.gr_is_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select exists (select 1 from public.gr_users u where u.login = lower(auth.jwt() ->> 'email') and u.active) $function$;
revoke all on function public.gr_is_user() from public, anon, authenticated, service_role;
grant execute on function public.gr_is_user() to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.gr_txns_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if coalesce(new.deleted, false) = false then
    perform net.http_post(
      url := 'https://zrftjkghhjhqzopvdzou.supabase.co/functions/v1/sh-gate',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('action', 'hook', 'app', 'gius-rag', 'kind', 'txn',
        'hook', (select value #>> '{}' from public.sh_keys where key = 'hook'),
        'title', 'תרומה נרשמה',
        'body', '₪' || to_char(coalesce(new.amount, 0), 'FM999,999,990') ||
          coalesce(' · ' || nullif((select d.name from public.gr_donors d where d.client_id = coalesce(new.donor_client_id,
            (select p.donor_client_id from public.gr_pledges p where p.client_id = new.pledge_client_id))), ''), '') ||
          coalesce(' · ' || nullif((select p.section from public.gr_pledges p where p.client_id = new.pledge_client_id), ''), '')),
      timeout_milliseconds := 20000);
  end if;
  return new;
end $function$;
revoke all on function public.gr_txns_notify() from public, anon, authenticated, service_role;
grant execute on function public.gr_txns_notify() to public, anon, authenticated, service_role;

-- revoke לפני grant — GRANT מוסיף ואינו מחליף, וטבלה חדשה ב-Supabase נולדת עם DELETE ו-TRUNCATE ל-anon.
revoke all on table public.gr_donors from anon, authenticated;
grant select, insert, update on table public.gr_donors to authenticated;
grant all on table public.gr_donors to service_role;
revoke all on table public.gr_journal from anon, authenticated;
grant select, insert, update on table public.gr_journal to authenticated;
grant all on table public.gr_journal to service_role;
revoke all on table public.gr_lookups from anon, authenticated;
grant select, insert, update on table public.gr_lookups to authenticated;
grant all on table public.gr_lookups to service_role;
revoke all on table public.gr_notes from anon, authenticated;
grant select, insert, update on table public.gr_notes to anon, authenticated;
grant all on table public.gr_notes to service_role;
revoke all on table public.gr_plan_items from anon, authenticated;
grant select, insert, update on table public.gr_plan_items to authenticated;
grant all on table public.gr_plan_items to service_role;
revoke all on table public.gr_pledges from anon, authenticated;
grant select, insert, update on table public.gr_pledges to authenticated;
grant all on table public.gr_pledges to service_role;
revoke all on table public.gr_settings from anon, authenticated;
grant select, insert, update on table public.gr_settings to authenticated;
grant all on table public.gr_settings to service_role;
revoke all on table public.gr_shtar_people from anon, authenticated;
grant select, insert, update on table public.gr_shtar_people to authenticated;
grant all on table public.gr_shtar_people to service_role;
revoke all on table public.gr_shtar_calls from anon, authenticated;
grant select, insert, update on table public.gr_shtar_calls to authenticated;
grant all on table public.gr_shtar_calls to service_role;
revoke all on table public.gr_shtar_locks from anon, authenticated;
grant select, insert, update on table public.gr_shtar_locks to authenticated;
grant all on table public.gr_shtar_locks to service_role;
revoke all on table public.gr_targets from anon, authenticated;
grant select, insert, update on table public.gr_targets to authenticated;
grant all on table public.gr_targets to service_role;
revoke all on table public.gr_tasks from anon, authenticated;
grant select, insert, update on table public.gr_tasks to authenticated;
grant all on table public.gr_tasks to service_role;
revoke all on table public.gr_txns from anon, authenticated;
grant select, insert, update on table public.gr_txns to authenticated;
grant all on table public.gr_txns to service_role;
revoke all on table public.gr_users from anon, authenticated;
grant select on table public.gr_users to authenticated;
grant all on table public.gr_users to service_role;

alter table public.gr_donors enable row level security;
drop policy if exists gr_donors_users on public.gr_donors;
create policy gr_donors_users on public.gr_donors as permissive for all to authenticated using (gr_is_user()) with check (gr_is_user());
alter table public.gr_journal enable row level security;
drop policy if exists gr_journal_users on public.gr_journal;
create policy gr_journal_users on public.gr_journal as permissive for all to authenticated using (gr_is_user()) with check (gr_is_user());
alter table public.gr_lookups enable row level security;
drop policy if exists gr_lookups_users on public.gr_lookups;
create policy gr_lookups_users on public.gr_lookups as permissive for all to authenticated using (gr_is_user()) with check (gr_is_user());
alter table public.gr_notes enable row level security;
drop policy if exists gr_notes_users on public.gr_notes;
create policy gr_notes_users on public.gr_notes as permissive for all to authenticated using (gr_is_user()) with check (gr_is_user());
alter table public.gr_plan_items enable row level security;
drop policy if exists gr_plan_items_users on public.gr_plan_items;
create policy gr_plan_items_users on public.gr_plan_items as permissive for all to authenticated using (gr_is_user()) with check (gr_is_user());
alter table public.gr_pledges enable row level security;
drop policy if exists gr_pledges_users on public.gr_pledges;
create policy gr_pledges_users on public.gr_pledges as permissive for all to authenticated using (gr_is_user()) with check (gr_is_user());
alter table public.gr_settings enable row level security;
drop policy if exists gr_settings_users on public.gr_settings;
create policy gr_settings_users on public.gr_settings as permissive for all to authenticated using (gr_is_user()) with check (gr_is_user());
alter table public.gr_shtar_people enable row level security;
drop policy if exists gr_shtar_people_users on public.gr_shtar_people;
create policy gr_shtar_people_users on public.gr_shtar_people as permissive for all to authenticated using (gr_is_user()) with check (gr_is_user());
alter table public.gr_shtar_calls enable row level security;
drop policy if exists gr_shtar_calls_users on public.gr_shtar_calls;
create policy gr_shtar_calls_users on public.gr_shtar_calls as permissive for all to authenticated using (gr_is_user()) with check (gr_is_user());
alter table public.gr_shtar_locks enable row level security;
drop policy if exists gr_shtar_locks_users on public.gr_shtar_locks;
create policy gr_shtar_locks_users on public.gr_shtar_locks as permissive for all to authenticated using (gr_is_user()) with check (gr_is_user());
alter table public.gr_targets enable row level security;
drop policy if exists gr_targets_users on public.gr_targets;
create policy gr_targets_users on public.gr_targets as permissive for all to authenticated using (gr_is_user()) with check (gr_is_user());
alter table public.gr_tasks enable row level security;
drop policy if exists gr_tasks_users on public.gr_tasks;
create policy gr_tasks_users on public.gr_tasks as permissive for all to authenticated using (gr_is_user()) with check (gr_is_user());
alter table public.gr_txns enable row level security;
drop policy if exists gr_txns_users on public.gr_txns;
create policy gr_txns_users on public.gr_txns as permissive for all to authenticated using (gr_is_user()) with check (gr_is_user());
alter table public.gr_users enable row level security;
drop policy if exists gr_users_select on public.gr_users;
create policy gr_users_select on public.gr_users as permissive for select to authenticated using (gr_is_user());

drop trigger if exists gr_txns_notify on public.gr_txns;
create trigger gr_txns_notify AFTER INSERT ON public.gr_txns FOR EACH ROW EXECUTE FUNCTION gr_txns_notify();

-- cron.schedule בשם קיים מעדכן את המשימה ואינו מוסיף שנייה
-- cron.schedule בשם קיים מעדכן את המשימה ואינו מוסיף שנייה
select cron.schedule('gr-dates', '0,30 * * * *', 'select net.http_post(url:=''https://zrftjkghhjhqzopvdzou.supabase.co/functions/v1/sh-gate'', headers:=''{"Content-Type":"application/json"}''::jsonb, body:=jsonb_build_object(''action'',''hook'',''app'',''gius-rag'',''kind'',''dates'',''hook'',(select value #>> ''{}'' from public.sh_keys where key=''hook'')), timeout_milliseconds:=20000)');
