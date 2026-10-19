-- =====================================================================
-- ENGLISH BASE — MEVCUT SUPABASE PROJESI ICIN TEK DOSYADA KURULUM
-- Supabase Dashboard > SQL Editor > New query > hepsini yapistir > Run
-- Idempotenttir: tekrar calistirmak güvenlidir.
-- Bu dosya = supabase-kurulum.sql + panel guncellemesi + uygulama duzeltmeleri
-- (ozel kurulum SQL'iniz hazir oldugunda onu once calistirin, sonra bunu;
--  ya da sadece bunu calistirin — temel tabloları da olusturur.)
-- =====================================================================

-- ---------- A) TEMEL TABLOLAR ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text not null default '',
  role text not null default 'student' check (role in ('admin','teacher','student')),
  class_id uuid,
  level int not null default 1,
  active boolean not null default true,
  must_change_password boolean not null default false,
  perms jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  grade text,
  created_at timestamptz not null default now()
);

create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),
  en text not null,
  tr text not null,
  level int not null default 1,
  example_en text, example_tr text, image_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  level int not null default 1,
  sort_order int not null default 0,
  data jsonb not null default '{}',   -- icon/desc/exp/level metadata
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.subtopics (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  data jsonb not null default '{}'    -- {"exp":"anlatim","imgs":[...]}
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.topics(id) on delete cascade,
  subtopic_id uuid references public.subtopics(id) on delete cascade,
  kind text not null default 'mc',    -- mc|gap|list|match|tr
  data jsonb not null default '{}',   -- {q,o:[],c,sh} / {q,a} / {items:[[]]}
  created_at timestamptz not null default now()
);

create table if not exists public.topic_access (
  student_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  granted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (student_id, topic_id)
);

create table if not exists public.homework (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  due_date date,
  topic_id uuid references public.topics(id) on delete set null,
  hw_type text not null default 'write',        -- write|ex|test
  pass int,                                      -- gecme notu
  questions jsonb not null default '[]',         -- test odevi sorulari
  data jsonb not null default '{}',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.homework_targets (
  homework_id uuid not null references public.homework(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  primary key (homework_id, student_id)
);

create table if not exists public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.homework(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  content text, score int, feedback text, status text default 'submitted',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.topic_complete (
  student_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (student_id, topic_id)
);
create table if not exists public.topic_pass (
  student_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  last_score int, attempts int not null default 0, best_score int,
  passed_at timestamptz,
  primary key (student_id, topic_id)
);
create table if not exists public.subtopic_done (
  student_id uuid not null references public.profiles(id) on delete cascade,
  subtopic_id uuid not null references public.subtopics(id) on delete cascade,
  done_at timestamptz not null default now(),
  primary key (student_id, subtopic_id)
);
create table if not exists public.words_learned (
  student_id uuid not null references public.profiles(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  learned_at timestamptz not null default now(),
  primary key (student_id, word_id)
);
create table if not exists public.daily_words (
  student_id uuid not null references public.profiles(id) on delete cascade,
  day date not null, count int not null default 0,
  primary key (student_id, day)
);
create table if not exists public.test_attempts (
  student_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  attempts int not null default 0, best int, last int,
  updated_at timestamptz not null default now(),
  primary key (student_id, topic_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  title text not null, body text,
  audience text not null default 'all',   -- all|class|student
  class_id uuid, student_ids uuid[],
  send_at timestamptz, sent boolean not null default false, sent_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create table if not exists public.message_targets (
  message_id uuid not null references public.messages(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  primary key (message_id, student_id)
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text, body text, message_id uuid references public.messages(id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  day int, start_time time, end_time time, topic_id uuid references public.topics(id),
  created_at timestamptz not null default now()
);
create table if not exists public.lesson_students (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  primary key (lesson_id, student_id)
);
create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references public.lessons(id) on delete cascade,
  date date not null, present uuid[], absent uuid[],
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create table if not exists public.attendance_records (
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('present','absent','late')),
  primary key (session_id, student_id)
);

-- ---------- B) PANEL TABLOLARI ----------
create table if not exists public.teacher_classes (
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  primary key (teacher_id, class_id)
);
create table if not exists public.app_settings (
  key text primary key, value jsonb not null default 'null',
  updated_at timestamptz not null default now(), updated_by uuid
);
create table if not exists public.audit_log (
  id bigserial primary key, at timestamptz not null default now(),
  actor uuid, actor_name text, action text not null,
  table_name text not null, row_id text, detail jsonb
);
create index if not exists idx_audit_at on public.audit_log(at desc);
create index if not exists idx_audit_actor on public.audit_log(actor, at desc);

-- profiles.class_id FK'si classes varsa bagla (ilk calistirmada tablo sirasi icin)
do $$ begin
  alter table public.profiles add constraint profiles_class_fk
    foreign key (class_id) references public.classes(id) on delete set null;
exception when duplicate_table then null; when duplicate_object then null; when foreign_key_violation then null; when undefined_table then null;
end $$;

-- ---------- C) YETKI FONKSIYONLARI ----------
-- Eski surumlerde imzasi degismis olabilecek fonksiyonlar policy bagimliliklari
-- kaldirilarak once temizlenir. (Aksi halde "cannot change return type of
-- existing function" / "other objects depend on it" hatalari alinir.)
do $$
declare f text; pol record;
begin
  -- 1) Fonksiyonlara bagli RLS policy'lerini gecici kaldir
  for pol in select schemaname, tablename, policyname from pg_policies
             where schemaname='public' and (
               coalesce(qual,'') like '%is_staff%' or coalesce(qual,'') like '%is_admin%'
                or coalesce(qual,'') like '%has_perm%' or coalesce(qual,'') like '%my_class_ids%'
                or coalesce(with_check,'') like '%is_staff%' or coalesce(with_check,'') like '%is_admin%'
                or coalesce(with_check,'') like '%has_perm%' or coalesce(with_check,'') like '%my_class_ids%')
  loop
    begin execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    exception when others then null; end;
  end loop;
  -- 2) Tetikleyici bagimliliklarini kaldir (panel SQL'i tekrar calistirinca yenilerini kurar)
  begin drop trigger if exists protect_profile on public.profiles; exception when others then null; end;
  for pol in select tgname::text as n, tgrelid::regclass::text as tab from pg_trigger
             where not tgisinternal and tgrelid::regclass::text like 'public.%'
               and tgname like 'audit_%'
  loop
    begin execute format('drop trigger if exists %I on %s', pol.n, pol.tab);
    exception when others then null; end;
  end loop;
  begin drop function if exists public.log_change(); exception when others then null; end;
  begin drop function if exists public.protect_profile(); exception when others then null; end;
  -- 3) Simdi guvenle dusur + yeniden olusturulabilir
  foreach f in array array['public.is_staff()','public.is_admin()','public.has_perm(text)',
                           'public.my_class_ids()','public.deliver_due_messages()']
  loop
    begin execute 'drop function if exists ' || f; exception when others then null; end;
  end loop;
end $$;

-- Panel SQL'iyle ayni tipte mesaj tablolari (mevcut proje farkli tipteyse donustur).
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='messages' and column_name='audience'
               and data_type <> 'text') then
    alter table public.messages alter column audience type text using audience::text;
  end if;
exception when undefined_table or wrong_object_type then null; end $$;
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='messages' and column_name='student_ids'
               and data_type <> 'ARRAY') then
    execute 'alter table public.messages drop column student_ids';
  end if;
exception when undefined_column or wrong_object_type then null; end $$;
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='messages' and column_name='class_id'
               and udt_name not in ('uuid')) then
    execute 'alter table public.messages drop column class_id';
  end if;
exception when undefined_column or wrong_object_type then null; end $$;
alter table public.messages add column if not exists sent_at timestamptz;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
    where id = auth.uid() and active and role in ('admin','teacher'))
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
    where id = auth.uid() and active and role = 'admin')
$$;
-- perms->>'x' null/garbage gelirse hata yerine false (RLS patlamasini onler)
create or replace function public.has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
    where id = auth.uid() and active
      and (role = 'admin' or (role = 'teacher' and lower(coalesce(perms->>p,'')) = 'true')))
$$;
create or replace function public.my_class_ids() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(class_id) filter (where class_id is not null), '{}')
  from public.teacher_classes where teacher_id = auth.uid()
$$;

-- Planli bildirim dagitimi
create or replace function public.deliver_due_messages() returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; r record; s uuid;
begin
  for r in select id from public.messages
           where sent is not true and send_at <= now() loop
    for s in select unnest(
               coalesce(m.student_ids, '{}')
               || case when m.audience='all' then (select array_agg(id) from public.profiles where role='student' and active)
                       when m.audience='class' then (select array_agg(id) from public.profiles where role='student' and active and class_id=m.class_id)
                       else '{}' end)
             from public.messages m where m.id = r.id loop
      insert into public.notifications (student_id, title, body, message_id)
      select s, m.title, m.body, m.id from public.messages m where m.id = r.id
        and not exists (select 1 from public.notifications x
          where x.message_id = r.id and x.student_id = s);
      n := n + 1;
    end loop;
    update public.messages set sent = true where id = r.id;
  end loop;
  return n;
end $$;

-- ---------- D) RLS ----------
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.words enable row level security;
alter table public.topics enable row level security;
alter table public.subtopics enable row level security;
alter table public.questions enable row level security;
alter table public.topic_access enable row level security;
alter table public.homework enable row level security;
alter table public.homework_targets enable row level security;
alter table public.homework_submissions enable row level security;
alter table public.topic_complete enable row level security;
alter table public.topic_pass enable row level security;
alter table public.subtopic_done enable row level security;
alter table public.words_learned enable row level security;
alter table public.daily_words enable row level security;
alter table public.test_attempts enable row level security;
alter table public.messages enable row level security;
alter table public.message_targets enable row level security;
alter table public.notifications enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_students enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.teacher_classes enable row level security;
alter table public.app_settings enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists self_or_staff on public.profiles;
create policy self_or_staff on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
drop policy if exists staff_write_profiles on public.profiles;
create policy staff_write_profiles on public.profiles for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ogrenci kendi seviyesinin kelime/konusunu okur; ogretmen/yonetici her seyi
drop policy if exists read_words on public.words;
create policy read_words on public.words for select to authenticated
  using (public.is_staff() or level <= coalesce((select level from public.profiles where id=auth.uid()),1));
drop policy if exists staff_write_words on public.words;
create policy staff_write_words on public.words for all to authenticated
  using (public.has_perm('words.manage')) with check (public.has_perm('words.manage'));

drop policy if exists read_topics on public.topics;
create policy read_topics on public.topics for select to authenticated
  using (public.is_staff()
    or exists (select 1 from public.topic_access a where a.topic_id=topics.id and a.student_id=auth.uid())
    or level <= coalesce((select level from public.profiles where id=auth.uid()),1));
drop policy if exists staff_write_topics on public.topics;
create policy staff_write_topics on public.topics for all to authenticated
  using (public.has_perm('topics.manage')) with check (public.has_perm('topics.manage'));

drop policy if exists read_subs_q on public.subtopics;
create policy read_subs_q on public.subtopics for select to authenticated using (public.is_staff() or exists (select 1 from public.topics t where t.id=subtopics.topic_id));
drop policy if exists staff_write_subs_q on public.subtopics;
create policy staff_write_subs_q on public.subtopics for all to authenticated
  using (public.has_perm('topics.manage')) with check (public.has_perm('topics.manage'));
drop policy if exists read_subs_q2 on public.questions;
create policy read_subs_q2 on public.questions for select to authenticated using (public.is_staff() or true);
drop policy if exists staff_write_subs_q2 on public.questions;
create policy staff_write_subs_q2 on public.questions for all to authenticated
  using (public.has_perm('topics.manage')) with check (public.has_perm('topics.manage'));

drop policy if exists read_hw on public.homework;
create policy read_hw on public.homework for select to authenticated
  using (public.is_staff()
    or exists (select 1 from public.homework_targets t where t.homework_id=homework.id and t.student_id=auth.uid()));
drop policy if exists staff_write_hw on public.homework;
create policy staff_write_hw on public.homework for all to authenticated
  using (public.has_perm('homework.manage')) with check (public.has_perm('homework.manage'));

drop policy if exists read_ht on public.homework_targets;
create policy read_ht on public.homework_targets for select to authenticated
  using (public.is_staff() or student_id = auth.uid());
drop policy if exists staff_write_ht on public.homework_targets;
create policy staff_write_ht on public.homework_targets for all to authenticated
  using (public.has_perm('homework.manage')) with check (public.has_perm('homework.manage'));

drop policy if exists own_ta on public.topic_access;
create policy own_ta on public.topic_access for select to authenticated using (student_id=auth.uid() or public.is_staff());
drop policy if exists staff_ta on public.topic_access;
create policy staff_ta on public.topic_access for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ogrenci ilerlemesi: kendi satirlarini yazar/okur, ogretmen hepsini okur
do $$
declare t text;
begin
  foreach t in array array['homework_submissions','topic_complete','topic_pass','subtopic_done',
                           'words_learned','daily_words','test_attempts']
  loop
    execute format('drop policy if exists own_%1$s on public.%1$I', t);
    execute format('create policy own_%1$s on public.%1$I for all to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid())', t);
    execute format('drop policy if exists staff_read_%1$s on public.%1$I', t);
    execute format('create policy staff_read_%1$s on public.%1$I for select to authenticated using (public.is_staff())', t);
  end loop;
end $$;

drop policy if exists own_notif on public.notifications;
create policy own_notif on public.notifications for all to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
drop policy if exists staff_read_notif on public.notifications;
create policy staff_read_notif on public.notifications for select to authenticated using (public.is_staff());

drop policy if exists staff_msg on public.messages;
create policy staff_msg on public.messages for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists staff_msg_t on public.message_targets;
create policy staff_msg_t on public.message_targets for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists read_classes on public.classes;
create policy read_classes on public.classes for select to authenticated using (true);
drop policy if exists staff_classes on public.classes;
create policy staff_classes on public.classes for all to authenticated using (public.is_staff()) with check (public.is_staff());

do $$
declare t text;
begin
  foreach t in array array['lessons','lesson_students','attendance_sessions','attendance_records','teacher_classes']
  loop
    execute format('drop policy if exists staff_%1$s on public.%1$I', t);
    execute format('create policy staff_%1$s on public.%1$I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
end $$;

drop policy if exists settings_read on public.app_settings;
create policy settings_read on public.app_settings for select to anon, authenticated using (true);
drop policy if exists settings_admin on public.app_settings;
create policy settings_admin on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_audit on public.audit_log;
create policy admin_audit on public.audit_log for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- E) INDEKSLER ----------
create index if not exists ix_topic_access_student on public.topic_access(student_id);
create index if not exists ix_topic_access_topic   on public.topic_access(topic_id);
create index if not exists ix_hw_targets_hw on public.homework_targets(homework_id);
create index if not exists ix_notifications_student on public.notifications(student_id, created_at desc);
create unique index if not exists ux_hwsub on public.homework_submissions(homework_id, student_id);
create index if not exists ix_words_level on public.words(level);
create index if not exists ix_topics_level_sort on public.topics(level, sort_order);

-- ---------- F) REALTIME YAYINI (idempotent) ----------
do $$
declare t text;
begin
  -- Publication yoksa olustur (Supabase managed'de zaten vardir, local/self-host'ta olmayabilir)
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['topics','subtopics','questions','homework','homework_targets',
                           'topic_access','notifications']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------- G) BASLANGIC AYARLARI ----------
insert into public.app_settings (key, value) values
  ('theme_color', '"#4f46e5"'),
  ('app_logo', 'null'),
  ('daily_word_min', '8'),
  ('daily_word_max', '15')
on conflict (key) do nothing;

-- pg_cron aciksa mesaj dagitimini zamanla (kapaliysa yorumda birak):
-- select cron.schedule('deliver-messages','* * * * *','select public.deliver_due_messages()');
-- select cron.schedule('audit-log-retention','0 4 1 * *','delete from public.audit_log where at < now() - interval ''180 days''');

-- ============ BOLUM H: SIFRE SIRLAMA YARDIM TALEPLERI (help_requests) ============
-- Panele girisi unutan ogretmen/yoneticinin "giris ekranindan" biraktigi talep.
create table if not exists public.help_requests(
  id uuid primary key default gen_random_uuid(),
  email text not null,
  note text,
  status text not null default 'open',   -- open | resolved
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id)
);
alter table public.help_requests enable row level security;

-- Herkes (oturumsuz dahil) yeni talep acabilir; goruntuleme/silme yalniz admin.
drop policy if exists hr_insert on public.help_requests;
create policy hr_insert on public.help_requests for insert to anon, authenticated with check (true);
drop policy if exists hr_select_admin on public.help_requests;
create policy hr_select_admin on public.help_requests for select to authenticated using (public.is_admin());
drop policy if exists hr_update_admin on public.help_requests;
create policy hr_update_admin on public.help_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Guvenli RPC: e-posta kullanicilarin varligini sizdirmadan talebi kaydeder +
-- varsa ilgili profile'e must_change_password bayragi koyar (admin listesinde one cikar).
create or replace function public.request_password_reset(p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_email is null or position('@' in p_email) = 0 then return; end if;
  insert into help_requests(email) values (lower(trim(p_email)));
  select id into v_id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_id is not null then
    update profiles set must_change_password = true where id = v_id;
  end if;
end $$;
revoke all on function public.request_password_reset(text) from public;
grant execute on function public.request_password_reset(text) to anon, authenticated;

-- Panel yardimcilari icin cozme fonksiyonu (audit'e de yazilir)
create or replace function public.resolve_help_request(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'yetki yok'; end if;
  update help_requests set status='resolved', resolved_at=now(), resolved_by=auth.uid() where id=p_id;
  insert into audit_log(action,table_name,row_id,detail)
    values ('FUNC:resolve_help','help_requests',p_id,jsonb_build_object('by',auth.uid()));
end $$;
revoke all on function public.resolve_help_request(uuid) from public;
grant execute on function public.resolve_help_request(uuid) to authenticated;
