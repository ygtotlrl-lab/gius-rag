-- migrations/000_schema.sql — גיוס לבית חב"ד רמת אביב ג׳ (gius-rag): הטבלאות gr_ בפרויקט Supabase של הלקוח (bwlsogunthyqwklzkrrd, הארגון shmulik5779)

-- ── משותף לפרויקט ──

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.sh_auth_log (
  id bigint generated always as identity,
  created_at timestamp with time zone not null default now(),
  app text not null,
  login text not null,
  reason text not null,
  constraint sh_auth_log_pkey PRIMARY KEY (id)
);

create table if not exists public.sh_backup (
  id bigint generated always as identity,
  created_at timestamp with time zone default now(),
  key text,
  value text,
  constraint sh_backup_pkey PRIMARY KEY (id)
);

create table if not exists public.sh_history (
  id bigint generated always as identity,
  changed_at timestamp with time zone not null default now(),
  table_name text not null,
  row_key text,
  op text not null,
  actor text,
  old_row jsonb,
  new_row jsonb,
  constraint sh_history_pkey PRIMARY KEY (id),
  constraint sh_history_op_check CHECK ((op = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);

create table if not exists public.sh_keys (
  key text not null,
  value jsonb not null,
  created_at timestamp with time zone not null default now(),
  constraint sh_keys_pkey PRIMARY KEY (key)
);

create table if not exists public.sh_logins (
  app text not null,
  user_key text not null,
  device text not null,
  devname text,
  login text,
  first_at timestamp with time zone not null default now(),
  last_at timestamp with time zone,
  constraint sh_logins_pkey PRIMARY KEY (app, user_key, device)
);

create table if not exists public.sh_push (
  id bigint generated always as identity,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  app text not null,
  device text not null,
  user_key text not null,
  kind text not null,
  token text not null,
  constraint sh_push_pkey PRIMARY KEY (id),
  constraint sh_push_app_device_key UNIQUE (app, device),
  constraint sh_push_kind_check CHECK ((kind = ANY (ARRAY['fcm'::text, 'web'::text])))
);

create table if not exists public.sh_sync_log (
  id bigint generated always as identity,
  created_at timestamp with time zone default now(),
  device_id text,
  user_name text,
  action text,
  key text,
  record_count integer,
  details jsonb,
  constraint sh_sync_log_pkey PRIMARY KEY (id)
);

create index if not exists sh_backup_key_created_idx ON public.sh_backup USING btree (key, created_at DESC);
create index if not exists sh_history_table_key_idx ON public.sh_history USING btree (table_name, row_key, changed_at DESC);

CREATE OR REPLACE FUNCTION public.bk_fn_def(p_name text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select pg_get_functiondef(p.oid)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = p_name
     and p_name in ('bk_retention_keys', 'bk_retention_sweep')
   limit 1;
$function$;
revoke all on function public.bk_fn_def(p_name text) from public, anon, authenticated, service_role;
grant execute on function public.bk_fn_def(p_name text) to anon, authenticated, service_role;

-- מפתח שאינו ברשימה אינו מתפנה לעולם · והרשימה אחת לשני הפרויקטים — הבלוק זהה בית-לבית, ומפתח של הפרויקט השני אינו קיים כאן
-- כל מקור נכתב בשכבה — ANCHOR: או DIFF: לפני המפתח
CREATE OR REPLACE FUNCTION public.bk_retention_keys()
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(array_agg(distinct b.key), '{}'::text[])
    from (select distinct key from public.sh_backup) b
   where b.key like 'ANCHOR:%' or b.key like 'DIFF:%'
$function$;
revoke all on function public.bk_retention_keys() from public, anon, authenticated, service_role;
grant execute on function public.bk_retention_keys() to service_role;

CREATE OR REPLACE FUNCTION public.bk_retention_sweep(p_days integer DEFAULT 30)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_keys text[] := public.bk_retention_keys(); v_age integer := 0; v_cap integer := 0;
begin
  if p_days is null or p_days < 7 then raise exception 'bk_retention_sweep: חלון קצר מ-7 ימים — מסרב לרוץ'; end if;
  if v_keys is null or cardinality(v_keys) = 0 then return 0; end if;
  delete from public.sh_backup where key = any (v_keys) and created_at < now() - make_interval(days => p_days);
  get diagnostics v_age = row_count;
  with ranked as (select id, key, row_number() over (partition by key order by created_at desc, id desc) as rn from public.sh_backup where key = any (v_keys))
  delete from public.sh_backup b using ranked r where b.id = r.id
     and r.rn > case when r.key like 'ANCHOR:%' then 4 when r.key like 'DIFF:%' then 30 end;
  get diagnostics v_cap = row_count;
  if (v_age + v_cap) > 0 then
    insert into public.sh_sync_log (device_id, user_name, action, key, record_count, details)
    values ('pg_cron', null, 'retention', null, v_age + v_cap, jsonb_build_object('days', p_days, 'keys', cardinality(v_keys), 'aged', v_age, 'capped', v_cap));
  end if;
  return v_age + v_cap;
end $function$;
revoke all on function public.bk_retention_sweep(p_days integer) from public, anon, authenticated, service_role;
grant execute on function public.bk_retention_sweep(p_days integer) to service_role;

CREATE OR REPLACE FUNCTION public.sh_history_attach()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r record; k text; v integer := 0;
begin
  for r in
    select c.relname from pg_class c
     where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
       and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'updated_at' and not a.attisdropped)
       and c.relname not like 'sh\_%'
  loop
    k := case when exists (select 1 from pg_attribute a where a.attrelid = (quote_ident(r.relname))::regclass and a.attname = 'client_id' and not a.attisdropped)
              and not exists (select 1 from pg_constraint p where p.conrelid = (quote_ident(r.relname))::regclass and p.contype = 'p'
                              and pg_get_constraintdef(p.oid) not like '%client_id%')
              then 'client_id' else 'key' end;
    execute format('drop trigger if exists %I on public.%I', r.relname || '_history', r.relname);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.sh_history_log(%L)', r.relname || '_history', r.relname, k);
    v := v + 1;
  end loop;
  return v;
end $function$;
revoke all on function public.sh_history_attach() from public, anon, authenticated, service_role;
grant execute on function public.sh_history_attach() to service_role;

CREATE OR REPLACE FUNCTION public.sh_history_attach_missing()
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case when exists (
    select 1 from pg_class c
     where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname not like 'sh\_%'
       and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'updated_at' and not a.attisdropped)
       and not exists (select 1 from pg_trigger t where t.tgrelid = c.oid and t.tgname = c.relname || '_history'))
  then public.sh_history_attach() else 0 end
$function$;
revoke all on function public.sh_history_attach_missing() from public, anon, authenticated, service_role;
grant execute on function public.sh_history_attach_missing() to service_role;

CREATE OR REPLACE FUNCTION public.sh_history_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  o jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end;
  n jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end;
begin
  if tg_op = 'UPDATE' and o = n then return null; end if;
  insert into public.sh_history (table_name, row_key, op, actor, old_row, new_row)
  values (tg_table_name, coalesce(n, o) ->> coalesce(tg_argv[0], 'client_id'), tg_op,
          coalesce(nullif(auth.jwt() ->> 'email', ''), current_user), o, n);
  return null;
end $function$;
revoke all on function public.sh_history_log() from public, anon, authenticated, service_role;
grant execute on function public.sh_history_log() to service_role;

CREATE OR REPLACE FUNCTION public.sh_is_user()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare f record; ok boolean;
begin
  for f in select p.proname from pg_proc p
           where p.pronamespace = 'public'::regnamespace and p.pronargs = 0
             and p.proname like '%\_is\_user' and p.proname <> 'sh_is_user'
           order by p.proname loop
    execute format('select public.%I()', f.proname) into ok;
    if ok then return true; end if;
  end loop;
  return false;
end $function$;
revoke all on function public.sh_is_user() from public, anon, authenticated, service_role;
grant execute on function public.sh_is_user() to authenticated, service_role;

-- גריעת המצבות — הגריעה היחידה במסד, בסף של TOMB_TTL_MS; רשימת הטבלאות נקראת מהמסד בכל ריצה ואינה מוקלדת
CREATE OR REPLACE FUNCTION public.tomb_retention_sweep(p_days integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_tbl text;
  v_n   integer;
  v_all integer := 0;
  v_per jsonb := '{}'::jsonb;
begin
  if p_days is null or p_days < 90 then
    raise exception 'tomb_retention_sweep: סף קצר מ-90 ימים — מסרב לרוץ';
  end if;
  for v_tbl in
    select c.table_name
      from information_schema.columns c
      join information_schema.tables t
        on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
     where c.table_schema = 'public' and c.column_name in ('deleted', 'deleted_at')
     group by c.table_name
    having count(*) = 2
     order by c.table_name
  loop
    execute format('delete from public.%I where deleted and deleted_at < now() - make_interval(days => $1)', v_tbl)
      using p_days;
    get diagnostics v_n = row_count;
    if v_n > 0 then v_per := v_per || jsonb_build_object(v_tbl, v_n); end if;
    v_all := v_all + v_n;
  end loop;

  if v_all > 0 then
    insert into public.sh_sync_log (device_id, user_name, action, key, record_count, details)
    values ('pg_cron', null, 'tomb_retention', null, v_all, jsonb_build_object('days', p_days, 'tables', v_per));
  end if;

  return v_all;
end;
$function$;
revoke all on function public.tomb_retention_sweep(p_days integer) from public, anon, authenticated, service_role;
grant execute on function public.tomb_retention_sweep(p_days integer) to service_role;

-- revoke לפני grant — GRANT מוסיף ואינו מחליף, וטבלה חדשה ב-Supabase נולדת עם DELETE ו-TRUNCATE ל-anon.
revoke all on table public.sh_auth_log from anon, authenticated;
grant all on table public.sh_auth_log to service_role;
revoke all on sequence public.sh_auth_log_id_seq from anon, authenticated;
grant usage, select, update on sequence public.sh_auth_log_id_seq to anon, authenticated, service_role;
revoke all on table public.sh_backup from anon, authenticated;
grant select, insert on table public.sh_backup to anon, authenticated;
grant all on table public.sh_backup to service_role;
revoke all on sequence public.sh_backup_id_seq from anon, authenticated;
grant usage, select, update on sequence public.sh_backup_id_seq to anon, authenticated, service_role;
revoke all on table public.sh_history from anon, authenticated;
grant all on table public.sh_history to service_role;
revoke all on sequence public.sh_history_id_seq from anon, authenticated;
grant usage, select, update on sequence public.sh_history_id_seq to anon, authenticated, service_role;
revoke all on table public.sh_keys from anon, authenticated;
grant all on table public.sh_keys to service_role;
revoke all on table public.sh_logins from anon, authenticated;
grant select, insert, update on table public.sh_logins to anon, authenticated;
grant all on table public.sh_logins to service_role;
revoke all on table public.sh_push from anon, authenticated;
grant all on table public.sh_push to service_role;
revoke all on sequence public.sh_push_id_seq from anon, authenticated;
grant usage, select, update on sequence public.sh_push_id_seq to anon, authenticated, service_role;
revoke all on table public.sh_sync_log from anon, authenticated;
grant select, insert on table public.sh_sync_log to anon, authenticated;
grant all on table public.sh_sync_log to service_role;
revoke all on sequence public.sh_sync_log_id_seq from anon, authenticated;
grant usage, select, update on sequence public.sh_sync_log_id_seq to anon, authenticated, service_role;

alter table public.sh_auth_log enable row level security;
alter table public.sh_backup enable row level security;
drop policy if exists sh_backup_insert on public.sh_backup;
create policy sh_backup_insert on public.sh_backup as permissive for insert to authenticated with check (( SELECT sh_is_user() AS sh_is_user));
drop policy if exists sh_backup_select on public.sh_backup;
create policy sh_backup_select on public.sh_backup as permissive for select to authenticated using (( SELECT sh_is_user() AS sh_is_user));
alter table public.sh_history enable row level security;
alter table public.sh_keys enable row level security;
alter table public.sh_logins enable row level security;
alter table public.sh_push enable row level security;
alter table public.sh_sync_log enable row level security;
drop policy if exists sh_sync_log_insert on public.sh_sync_log;
create policy sh_sync_log_insert on public.sh_sync_log as permissive for insert to authenticated with check (( SELECT sh_is_user() AS sh_is_user));
drop policy if exists sh_sync_log_select on public.sh_sync_log;
create policy sh_sync_log_select on public.sh_sync_log as permissive for select to authenticated using (( SELECT sh_is_user() AS sh_is_user));

-- cron.schedule בשם קיים מעדכן את המשימה ואינו מוסיף שנייה
select cron.schedule('bk_retention_daily', '0 3 * * *', 'select public.bk_retention_sweep(30);');
select cron.schedule('sh_sync_log_retention', '20 3 * * *', 'delete from public.sh_sync_log where created_at < now() - interval ''30 days'';');
select cron.schedule('cron_run_log_retention', '25 3 * * *', 'delete from cron.job_run_details where start_time < now() - interval ''30 days'' or jobid not in (select jobid from cron.job);');
select cron.schedule('tomb_retention_daily', '30 3 * * *', 'select public.tomb_retention_sweep(90);');
select cron.schedule('sh_history_attach', '40 3 * * *', 'select public.sh_history_attach_missing();');
select cron.schedule('sh_history_retention', '45 3 * * *', 'delete from public.sh_history where changed_at < now() - interval ''7 years'';');

-- ── גיוס · בית חב״ד רמת אביב ג׳ ──

-- נגזרות במבנה מטבלאות g_ של גיוס (like … including all), בלי הלוואות, רשומות ותקציב אירוע; ובנוסף gr_journal ו-gr_users.
-- sh_backup ו-sh_sync_log — המשותפות לפרויקט, בקובץ הסכימה של גיוס.
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
      url := 'https://bwlsogunthyqwklzkrrd.supabase.co/functions/v1/sh-gate',
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
grant execute on function public.gr_txns_notify() to service_role;

-- revoke לפני grant — GRANT מוסיף ואינו מחליף, וטבלה חדשה ב-Supabase נולדת עם DELETE ו-TRUNCATE ל-anon.
revoke all on table public.gr_donors from anon, authenticated;
grant select, insert, update on table public.gr_donors to anon, authenticated;
grant all on table public.gr_donors to service_role;
revoke all on table public.gr_journal from anon, authenticated;
grant select, insert, update on table public.gr_journal to anon, authenticated;
grant all on table public.gr_journal to service_role;
revoke all on table public.gr_lookups from anon, authenticated;
grant select, insert, update on table public.gr_lookups to anon, authenticated;
grant all on table public.gr_lookups to service_role;
revoke all on table public.gr_notes from anon, authenticated;
grant select, insert, update on table public.gr_notes to anon, authenticated;
grant all on table public.gr_notes to service_role;
revoke all on table public.gr_plan_items from anon, authenticated;
grant select, insert, update on table public.gr_plan_items to anon, authenticated;
grant all on table public.gr_plan_items to service_role;
revoke all on table public.gr_pledges from anon, authenticated;
grant select, insert, update on table public.gr_pledges to anon, authenticated;
grant all on table public.gr_pledges to service_role;
revoke all on table public.gr_settings from anon, authenticated;
grant select, insert, update on table public.gr_settings to anon, authenticated;
grant all on table public.gr_settings to service_role;
revoke all on table public.gr_targets from anon, authenticated;
grant select, insert, update on table public.gr_targets to anon, authenticated;
grant all on table public.gr_targets to service_role;
revoke all on table public.gr_tasks from anon, authenticated;
grant select, insert, update on table public.gr_tasks to anon, authenticated;
grant all on table public.gr_tasks to service_role;
revoke all on table public.gr_txns from anon, authenticated;
grant select, insert, update on table public.gr_txns to anon, authenticated;
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

drop trigger if exists gr_donors_history on public.gr_donors;
create trigger gr_donors_history AFTER INSERT OR DELETE OR UPDATE ON public.gr_donors FOR EACH ROW EXECUTE FUNCTION sh_history_log('client_id');
drop trigger if exists gr_journal_history on public.gr_journal;
create trigger gr_journal_history AFTER INSERT OR DELETE OR UPDATE ON public.gr_journal FOR EACH ROW EXECUTE FUNCTION sh_history_log('client_id');
drop trigger if exists gr_lookups_history on public.gr_lookups;
create trigger gr_lookups_history AFTER INSERT OR DELETE OR UPDATE ON public.gr_lookups FOR EACH ROW EXECUTE FUNCTION sh_history_log('client_id');
drop trigger if exists gr_notes_history on public.gr_notes;
create trigger gr_notes_history AFTER INSERT OR DELETE OR UPDATE ON public.gr_notes FOR EACH ROW EXECUTE FUNCTION sh_history_log('client_id');
drop trigger if exists gr_plan_items_history on public.gr_plan_items;
create trigger gr_plan_items_history AFTER INSERT OR DELETE OR UPDATE ON public.gr_plan_items FOR EACH ROW EXECUTE FUNCTION sh_history_log('client_id');
drop trigger if exists gr_pledges_history on public.gr_pledges;
create trigger gr_pledges_history AFTER INSERT OR DELETE OR UPDATE ON public.gr_pledges FOR EACH ROW EXECUTE FUNCTION sh_history_log('client_id');
drop trigger if exists gr_settings_history on public.gr_settings;
create trigger gr_settings_history AFTER INSERT OR DELETE OR UPDATE ON public.gr_settings FOR EACH ROW EXECUTE FUNCTION sh_history_log('key');
drop trigger if exists gr_targets_history on public.gr_targets;
create trigger gr_targets_history AFTER INSERT OR DELETE OR UPDATE ON public.gr_targets FOR EACH ROW EXECUTE FUNCTION sh_history_log('client_id');
drop trigger if exists gr_tasks_history on public.gr_tasks;
create trigger gr_tasks_history AFTER INSERT OR DELETE OR UPDATE ON public.gr_tasks FOR EACH ROW EXECUTE FUNCTION sh_history_log('client_id');
drop trigger if exists gr_txns_history on public.gr_txns;
create trigger gr_txns_history AFTER INSERT OR DELETE OR UPDATE ON public.gr_txns FOR EACH ROW EXECUTE FUNCTION sh_history_log('client_id');
drop trigger if exists gr_txns_notify on public.gr_txns;
create trigger gr_txns_notify AFTER INSERT ON public.gr_txns FOR EACH ROW EXECUTE FUNCTION gr_txns_notify();
drop trigger if exists gr_users_history on public.gr_users;
create trigger gr_users_history AFTER INSERT OR DELETE OR UPDATE ON public.gr_users FOR EACH ROW EXECUTE FUNCTION sh_history_log('client_id');

-- cron.schedule בשם קיים מעדכן את המשימה ואינו מוסיף שנייה
select cron.schedule('gr-dates', '0,30 * * * *', 'select net.http_post(url:=''https://bwlsogunthyqwklzkrrd.supabase.co/functions/v1/sh-gate'', headers:=''{"Content-Type":"application/json"}''::jsonb, body:=jsonb_build_object(''action'',''hook'',''app'',''gius-rag'',''kind'',''dates'',''hook'',(select value #>> ''{}'' from public.sh_keys where key=''hook'')), timeout_milliseconds:=20000)');
