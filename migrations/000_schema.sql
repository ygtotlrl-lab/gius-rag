-- migrations/000_schema.sql — גיוס לבית חב"ד רמת אביב ג׳ (gius-rag): הטבלאות gr_ בפרויקט של גיוס
-- נגזרות במבנה מטבלאות g_ של גיוס (like … including all), בלי הלוואות, רשומות ותקציב אירוע; ובנוסף gr_journal ו-gr_users.
-- sh_backup ו-sh_sync_log — המשותפות לפרויקט, בקובץ הסכימה של גיוס.
create table public.gr_donors      (like public.g_donors      including all);
create table public.gr_pledges     (like public.g_pledges     including all);
create table public.gr_txns        (like public.g_txns        including all);
create table public.gr_plan_items  (like public.g_plan_items  including all);
create table public.gr_tasks       (like public.g_tasks       including all);
create table public.gr_lookups     (like public.g_lookups     including all);
create table public.gr_settings    (like public.g_settings    including all);
create table public.gr_targets     (like public.g_targets     including all);
create table public.gr_shtar_people(like public.g_shtar_people including all);
create table public.gr_shtar_calls (like public.g_shtar_calls including all);
create table public.gr_shtar_locks (like public.g_shtar_locks including all);
alter table public.gr_pledges  add constraint gr_pledges_donor_fk foreign key (donor_client_id) references public.gr_donors(client_id) on delete restrict;
alter table public.gr_txns     add constraint gr_txns_donor_fk  foreign key (donor_client_id) references public.gr_donors(client_id) on delete restrict;
alter table public.gr_txns     add constraint gr_txns_pledge_fk foreign key (pledge_client_id) references public.gr_pledges(client_id) on delete restrict;
alter table public.gr_plan_items add constraint gr_plan_items_donor_fk foreign key (donor_client_id) references public.gr_donors(client_id) on delete restrict;
alter table public.gr_shtar_people add constraint gr_shtar_people_donor_fk foreign key (donor_client_id) references public.gr_donors(client_id) on delete restrict;
alter table public.gr_shtar_calls  add constraint gr_shtar_calls_person_fk foreign key (person_client_id) references public.gr_shtar_people(client_id) on delete restrict;
alter table public.gr_shtar_locks  add constraint gr_shtar_locks_person_fk foreign key (person_client_id) references public.gr_shtar_people(client_id) on delete restrict;
-- התכנית והדשבורד — לפי קטגוריה (רשימת הסעיפים)
alter table public.gr_plan_items add column section text;
-- יומן העבודה — רשומה לכל יום ולכל קטגוריה (ו«משימות כלליות»)
create table public.gr_journal (
  client_id text primary key,
  jday date not null,
  section text not null,
  body text not null default '',
  deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by text,
  created_at timestamptz not null default now(),
  updated_at bigint not null
);
create unique index gr_journal_day_section on public.gr_journal (jday, section) where not deleted;
-- המשתמשים — הכניסה עם Google
create table public.gr_users (like public.k_users including all);
create or replace function public.gr_is_user() returns boolean language sql stable security definer set search_path to 'public'
as $f$ select exists (select 1 from public.gr_users u where u.login = lower(auth.jwt() ->> 'email') and u.active) $f$;
-- הרשאות: רק משתמש מהרשימה, מחובר — המסד פתוח למי שנכנס ולא לכל מחזיק במפתח
do $$ declare t text; begin
  foreach t in array array['gr_donors','gr_pledges','gr_txns','gr_plan_items','gr_tasks','gr_lookups','gr_settings','gr_targets','gr_shtar_people','gr_shtar_calls','gr_shtar_locks','gr_journal'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.gr_is_user()) with check (public.gr_is_user())', t || '_users', t);
  end loop;
end $$;
alter table public.gr_users enable row level security;
create policy gr_users_select on public.gr_users for select to authenticated using (public.gr_is_user());
-- המשתמשים נזרעים במסד ולא כאן — הריפו ציבורי, וכתובות המייל אינן נכתבות בו.
-- היעד החודשי והקטגוריות
insert into public.gr_settings (key, value, updated_at) values
  ('target_default','10000',(extract(epoch from now())*1000)::bigint),
  ('target_year','120000',(extract(epoch from now())*1000)::bigint);
insert into public.gr_lookups (client_id, kind, label, sort, updated_at)
  select 'section:' || x.l, 'section', x.l, x.n, (extract(epoch from now())*1000)::bigint
  from unnest(array['גבירים','הו״ק','הקדשת התוועדויות שבת','עליות לתורה','מגביות','דינר/קמפיין','מרכז החסד','תקציבים ועירייה']) with ordinality as x(l, n);
insert into public.gr_lookups (client_id, kind, label, sort, updated_at)
  select 'method:' || x.l, 'method', x.l, x.n, (extract(epoch from now())*1000)::bigint
  from unnest(array['העברה בנקאית','צ׳ק','ביט ופייבוקס','מזומן','אשראי','הו״ק']) with ordinality as x(l, n);
-- ההרשאות — revoke ואז grant: רק משתמש מחובר (RLS: gr_is_user), בלי delete — המחיקה רכה
do $$ declare t text; begin
  foreach t in array array['gr_donors','gr_pledges','gr_txns','gr_plan_items','gr_tasks','gr_lookups','gr_settings','gr_targets','gr_shtar_people','gr_shtar_calls','gr_shtar_locks','gr_journal'] loop
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
  execute 'revoke all on public.gr_users from anon, authenticated';
  execute 'grant select on public.gr_users to authenticated';
  execute 'grant all on public.gr_users to service_role';
end $$;
revoke execute on function public.gr_is_user() from public, anon;
grant execute on function public.gr_is_user() to authenticated;
