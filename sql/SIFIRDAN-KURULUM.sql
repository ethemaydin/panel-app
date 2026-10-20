-- =====================================================================
-- ENGLISH BASE — TAM KURULUM SQL (v3)  tek dosya, tek calistirma
-- =====================================================================
-- NEREDE CALISTIRILIR:
--   Supabase Dashboard > SQL Editor > New query > bu dosyanin TAMAMINI
--   yapistir > Run.  (Projen: gnagqrqhzlqixafihiqo)
--
-- ONCEKILER:
--   * Extension'lar: pgcrypto (varsayilan acik), pg_cron (opsiyonel)
--   * Auth > Providers > Email: "Confirm email" KAPALI onerilir.
--   * Storage bucket 'content' bu dosya tarafindan otomatik olusturulur.
--
-- IDEMPOTENTTIR: tekrar calistirmak guvenlidir; tablo ve VERI silinmez.
-- Bu dosyadaki TUM policy'ler ve audit/protect tetikleyicileri her calistirmada
-- yeniden kurulur (kendi eklediginiz ozel policy'ler public tablolarinda silinir).
--
-- v3 DUZELTME (42804 "COALESCE types text and integer cannot be matched"):
--   Eski kurulumlardan kalan text tipli level/sort_order/pass kolonlari ve
--   integer tipli boolean kolonlari once int/boolean'a cevrilir (A2), policy'lerde
--   ise tipten bagimsiz to_int()/my_level() kullanilir. Kurulumdan sonra
--   `select * from public.system_check();` ile durumu gorebilirsiniz.
--
-- OZELLIK ANAHTARLARI (app_settings tablosu, key/value):
--   strict_submissions    true   ogrenci feedback/reviewed_at/'reviewed' yazamaz
--   strict_progress       true   ogrenci erisimi olmayan konuya ilerleme yazamaz
--   strict_notifications  true   ogrenci bildirimde yalniz 'read' alanini degistirir
--   archive_deleted       true   silinen konu/kelime/odev/soru deleted_items'a arsivlenir
--   notify_homework       false  odev atandiginda otomatik bildirim
--   auto_profile          false  auth.users'a kayit eklenince otomatik 'student' profili
--   validate_questions    false  soru JSON'u kind'a gore dogrulanir
--   reset_rate_limit_per_hour 3, reset_rate_limit_global 200
--   Kapatmak icin: update public.app_settings set value='false' where key='...';
-- =====================================================================

-- ---------- A1) ESKI POLICY / TETIKLEYICI TEMIZLIGI ----------
-- Policy'ler kolon tipini degistirmeyi engeller; hepsi D bolumunde yeniden kurulur.
do $$
declare pol record;
begin
  for pol in select schemaname, tablename, policyname from pg_policies
             where schemaname = 'public' and tablename = any (array[
               'profiles','classes','words','topics','subtopics','questions','topic_access',
               'homework','homework_targets','homework_submissions','topic_complete','topic_pass',
               'subtopic_done','words_learned','daily_words','test_attempts','messages',
               'message_targets','notifications','lessons','lesson_students','attendance_sessions',
               'attendance_records','teacher_classes','app_settings','audit_log','help_requests',
               'deleted_items','schema_migrations'])
  loop
    begin execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    exception when others then null; end;
  end loop;

  for pol in select t.tgname::text as n, c.relname::text as tab
             from pg_trigger t
             join pg_class c on c.oid = t.tgrelid
             join pg_namespace ns on ns.oid = c.relnamespace
             where not t.tgisinternal and ns.nspname = 'public'
               and (t.tgname like 'audit\_%' or t.tgname = 'protect_profile' or t.tgname like 'trg\_%')
  loop
    begin execute format('drop trigger if exists %I on public.%I', pol.n, pol.tab);
    exception when others then null; end;
  end loop;

  begin drop function if exists public.log_change(); exception when others then null; end;
  begin drop function if exists public.protect_profile(); exception when others then null; end;
end $$;

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
  data jsonb not null default '{}',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.subtopics (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  data jsonb not null default '{}'
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.topics(id) on delete cascade,
  subtopic_id uuid references public.subtopics(id) on delete cascade,
  kind text not null default 'mc',    -- mc|gap|list|match|tr
  data jsonb not null default '{}',
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
  pass int,
  questions jsonb not null default '[]',
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

-- messages: hedef kitle audience ('all' | 'class:<uuid>' | 'student:<uuid>') + message_targets
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  title text not null, body text,
  audience text not null default 'all',
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
-- Silinen kayitlarin arsivi (geri alinabilir)
create table if not exists public.deleted_items (
  id bigserial primary key,
  table_name text not null,
  row_id text,
  data jsonb not null,
  deleted_by uuid,
  deleted_at timestamptz not null default now()
);
-- Kurulum surum kaydi
create table if not exists public.schema_migrations (
  version text primary key,
  note text,
  applied_at timestamptz not null default now()
);

-- ---------- A2) LEGACY TIP ONARIMI ----------
-- profiles.class_id integer/text ise uuid'ye cevir.
do $$ declare c record;
begin
  if to_regclass('public.profiles') is null then return; end if;
  select column_name, udt_name into c
    from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='class_id';
  if c.column_name is not null and c.udt_name <> 'uuid' then
    begin
      execute 'alter table public.profiles drop constraint if exists profiles_class_fk';
      execute $x$alter table public.profiles alter column class_id type uuid
        using case when class_id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                   then class_id::text::uuid else null end$x$;
    exception when others then null; end;
  end if;
end $$;

-- Eski surumlerden kalmis tablolarda EKSIK KOLONLARI tamamla (42703 "column ... does not exist").
-- "create table if not exists" mevcut tabloya kolon eklemez; policy/fonksiyonlar bu kolonlara bagimli.
-- Her kolon bagimsiz eklenir; FK eklenemezse (tip uyumsuzlugu vb.) FK'siz eklenir.
-- NOT NULL + varsayilansiz kolonlar mevcut satirlari bozmamak icin NULL'a izinli eklenir.
do $$
declare a text[]; i int; t text;
begin
  a := array[
    -- profiles
    ['profiles','email','text',''],
    ['profiles','role','text not null default ''student''',''],
    ['profiles','class_id','uuid',''],
    ['profiles','created_at','timestamptz not null default now()',''],
    -- classes
    ['classes','grade','text',''],
    ['classes','created_at','timestamptz not null default now()',''],
    -- words
    ['words','en','text',''],
    ['words','tr','text',''],
    ['words','level','int not null default 1',''],
    ['words','example_en','text',''],
    ['words','example_tr','text',''],
    ['words','image_url','text',''],
    ['words','created_by','uuid','references public.profiles(id)'],
    ['words','created_at','timestamptz not null default now()',''],
    -- topics
    ['topics','title','text',''],
    ['topics','description','text',''],
    ['topics','level','int not null default 1',''],
    ['topics','sort_order','int not null default 0',''],
    ['topics','data','jsonb not null default ''{}''::jsonb',''],
    ['topics','created_by','uuid','references public.profiles(id)'],
    ['topics','created_at','timestamptz not null default now()',''],
    -- subtopics
    ['subtopics','topic_id','uuid','references public.topics(id) on delete cascade'],
    ['subtopics','title','text',''],
    ['subtopics','sort_order','int not null default 0',''],
    ['subtopics','data','jsonb not null default ''{}''::jsonb',''],
    -- questions
    ['questions','topic_id','uuid','references public.topics(id) on delete cascade'],
    ['questions','subtopic_id','uuid','references public.subtopics(id) on delete cascade'],
    ['questions','kind','text not null default ''mc''',''],
    ['questions','data','jsonb not null default ''{}''::jsonb',''],
    ['questions','created_at','timestamptz not null default now()',''],
    -- topic_access
    ['topic_access','student_id','uuid','references public.profiles(id) on delete cascade'],
    ['topic_access','topic_id','uuid','references public.topics(id) on delete cascade'],
    ['topic_access','granted_by','uuid','references public.profiles(id)'],
    ['topic_access','created_at','timestamptz not null default now()',''],
    -- homework
    ['homework','title','text',''],
    ['homework','body','text',''],
    ['homework','due_date','date',''],
    ['homework','topic_id','uuid','references public.topics(id) on delete set null'],
    ['homework','hw_type','text not null default ''write''',''],
    ['homework','pass','int',''],
    ['homework','questions','jsonb not null default ''[]''::jsonb',''],
    ['homework','data','jsonb not null default ''{}''::jsonb',''],
    ['homework','created_by','uuid','references public.profiles(id)'],
    ['homework','created_at','timestamptz not null default now()',''],
    -- homework_targets
    ['homework_targets','homework_id','uuid','references public.homework(id) on delete cascade'],
    ['homework_targets','student_id','uuid','references public.profiles(id) on delete cascade'],
    -- homework_submissions
    ['homework_submissions','homework_id','uuid','references public.homework(id) on delete cascade'],
    ['homework_submissions','student_id','uuid','references public.profiles(id) on delete cascade'],
    ['homework_submissions','content','text',''],
    ['homework_submissions','score','int',''],
    ['homework_submissions','feedback','text',''],
    ['homework_submissions','status','text default ''submitted''',''],
    ['homework_submissions','submitted_at','timestamptz not null default now()',''],
    ['homework_submissions','reviewed_at','timestamptz',''],
    -- ilerleme tablolari
    ['topic_complete','student_id','uuid','references public.profiles(id) on delete cascade'],
    ['topic_complete','topic_id','uuid','references public.topics(id) on delete cascade'],
    ['topic_complete','completed_at','timestamptz not null default now()',''],
    ['topic_pass','student_id','uuid','references public.profiles(id) on delete cascade'],
    ['topic_pass','topic_id','uuid','references public.topics(id) on delete cascade'],
    ['topic_pass','last_score','int',''],
    ['topic_pass','attempts','int not null default 0',''],
    ['topic_pass','best_score','int',''],
    ['topic_pass','passed_at','timestamptz',''],
    ['subtopic_done','student_id','uuid','references public.profiles(id) on delete cascade'],
    ['subtopic_done','subtopic_id','uuid','references public.subtopics(id) on delete cascade'],
    ['subtopic_done','done_at','timestamptz not null default now()',''],
    ['words_learned','student_id','uuid','references public.profiles(id) on delete cascade'],
    ['words_learned','word_id','uuid','references public.words(id) on delete cascade'],
    ['words_learned','learned_at','timestamptz not null default now()',''],
    ['daily_words','student_id','uuid','references public.profiles(id) on delete cascade'],
    ['daily_words','day','date',''],
    ['daily_words','count','int not null default 0',''],
    ['test_attempts','student_id','uuid','references public.profiles(id) on delete cascade'],
    ['test_attempts','topic_id','uuid','references public.topics(id) on delete cascade'],
    ['test_attempts','attempts','int not null default 0',''],
    ['test_attempts','best','int',''],
    ['test_attempts','last','int',''],
    ['test_attempts','updated_at','timestamptz not null default now()',''],
    -- messages yan tablolari
    ['message_targets','message_id','uuid','references public.messages(id) on delete cascade'],
    ['message_targets','student_id','uuid','references public.profiles(id) on delete cascade'],
    ['notifications','student_id','uuid','references public.profiles(id) on delete cascade'],
    ['notifications','title','text',''],
    ['notifications','body','text',''],
    ['notifications','message_id','uuid','references public.messages(id) on delete set null'],
    ['notifications','read','boolean not null default false',''],
    ['notifications','created_at','timestamptz not null default now()',''],
    -- ders / yoklama
    ['lessons','class_id','uuid','references public.classes(id) on delete cascade'],
    ['lessons','teacher_id','uuid','references public.profiles(id) on delete set null'],
    ['lessons','day','int',''],
    ['lessons','start_time','time',''],
    ['lessons','end_time','time',''],
    ['lessons','topic_id','uuid','references public.topics(id)'],
    ['lessons','created_at','timestamptz not null default now()',''],
    ['lesson_students','lesson_id','uuid','references public.lessons(id) on delete cascade'],
    ['lesson_students','student_id','uuid','references public.profiles(id) on delete cascade'],
    ['attendance_sessions','lesson_id','uuid','references public.lessons(id) on delete cascade'],
    ['attendance_sessions','date','date',''],
    ['attendance_sessions','present','uuid[]',''],
    ['attendance_sessions','absent','uuid[]',''],
    ['attendance_sessions','created_by','uuid','references public.profiles(id)'],
    ['attendance_sessions','created_at','timestamptz not null default now()',''],
    ['attendance_records','session_id','uuid','references public.attendance_sessions(id) on delete cascade'],
    ['attendance_records','student_id','uuid','references public.profiles(id) on delete cascade'],
    ['attendance_records','status','text',''],
    -- panel tablolari
    ['teacher_classes','teacher_id','uuid','references public.profiles(id) on delete cascade'],
    ['teacher_classes','class_id','uuid','references public.classes(id) on delete cascade'],
    ['app_settings','value','jsonb not null default ''null''::jsonb',''],
    ['app_settings','updated_at','timestamptz not null default now()',''],
    ['app_settings','updated_by','uuid',''],
    ['audit_log','at','timestamptz not null default now()',''],
    ['audit_log','actor','uuid',''],
    ['audit_log','actor_name','text',''],
    ['audit_log','action','text',''],
    ['audit_log','table_name','text',''],
    ['audit_log','row_id','text',''],
    ['audit_log','detail','jsonb',''],
    -- help_requests (eskiden varsa; yoksa H bolumu olusturur)
    ['help_requests','email','text',''],
    ['help_requests','note','text',''],
    ['help_requests','status','text not null default ''open''',''],
    ['help_requests','created_at','timestamptz not null default now()',''],
    ['help_requests','resolved_at','timestamptz',''],
    ['help_requests','resolved_by','uuid','references public.profiles(id)']
  ];
  for i in 1..array_length(a, 1) loop
    t := a[i][1];
    if to_regclass('public.' || t) is null then continue; end if;
    begin
      execute format('alter table public.%I add column if not exists %I %s %s', t, a[i][2], a[i][3], a[i][4]);
    exception when others then
      begin
        execute format('alter table public.%I add column if not exists %I %s', t, a[i][2], a[i][3]);
        raise notice 'FK atlandi %.% : %', t, a[i][2], sqlerrm;
      exception when others then
        raise notice 'kolon eklenemedi %.% : %', t, a[i][2], sqlerrm;
      end;
    end;
  end loop;
end $$;

-- Tamsayi olmasi gereken kolonlar text vb. ise integer'a cevir (42804'un asil nedeni)
do $$
declare r record; dt text;
begin
  for r in select * from (values
      ('profiles','level','1'::text),
      ('words','level','1'),
      ('topics','level','1'),
      ('topics','sort_order','0'),
      ('homework','pass',null)
    ) as v(t, c, d)
  loop
    select data_type into dt from information_schema.columns
     where table_schema='public' and table_name = r.t and column_name = r.c;
    if dt is not null and dt not in ('integer','smallint','bigint') then
      begin
        execute format('alter table public.%I alter column %I drop default', r.t, r.c);
        execute format('alter table public.%I alter column %I type integer using nullif(regexp_replace(%I::text, ''[^0-9]'', '''', ''g''), '''')::integer', r.t, r.c, r.c);
        if r.d is not null then
          execute format('update public.%I set %I = %s where %I is null', r.t, r.c, r.d, r.c);
          execute format('alter table public.%I alter column %I set default %s', r.t, r.c, r.d);
          execute format('alter table public.%I alter column %I set not null', r.t, r.c);
        end if;
      exception when others then
        raise notice 'tip duzeltme atlandi %.%: %', r.t, r.c, sqlerrm;
      end;
    end if;
  end loop;
end $$;

-- Boolean olmasi gereken kolonlar integer/text vb. ise boolean'a cevir
do $$
declare r record; dt text;
begin
  for r in select * from (values
      ('profiles','active','true'::text),
      ('profiles','must_change_password','false'),
      ('messages','sent','false'),
      ('notifications','read','false')
    ) as v(t, c, d)
  loop
    select data_type into dt from information_schema.columns
     where table_schema='public' and table_name = r.t and column_name = r.c;
    if dt is not null and dt <> 'boolean' then
      begin
        execute format('alter table public.%I alter column %I drop default', r.t, r.c);
        execute format('alter table public.%I alter column %I type boolean using case when %I is null then %s else lower(%I::text) in (''1'',''t'',''true'',''yes'',''y'') end', r.t, r.c, r.c, r.d, r.c);
        execute format('alter table public.%I alter column %I set default %s', r.t, r.c, r.d);
        execute format('alter table public.%I alter column %I set not null', r.t, r.c);
      exception when others then
        raise notice 'boolean duzeltme atlandi %.%: %', r.t, r.c, sqlerrm;
      end;
    end if;
  end loop;
end $$;

-- Eski surumlerden kalmis eksik profile kolonlarini tamamla
alter table public.profiles add column if not exists active boolean not null default true;
alter table public.profiles add column if not exists perms jsonb not null default '{}';
alter table public.profiles add column if not exists full_name text not null default '';
alter table public.profiles add column if not exists level int not null default 1;
alter table public.profiles add column if not exists must_change_password boolean not null default false;
alter table public.profiles alter column role set default 'student';
update public.profiles set active = true where active is null;
update public.profiles set perms = '{}'::jsonb where perms is null;

-- profiles.class_id FK'si (zaten varsa veya tip uyumsuzsa sessizce atlar)
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='profiles' and column_name='class_id' and udt_name='uuid')
     and exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='classes' and column_name='id' and udt_name='uuid') then
    alter table public.profiles add constraint profiles_class_fk
      foreign key (class_id) references public.classes(id) on delete set null;
  end if;
exception when others then null;
end $$;

-- auth.uid() stub: Supabase'de zaten vardir; yalnizca eksikse (yerel test) olusturulur.
do $stub$ begin
  if to_regnamespace('auth') is null then create schema auth; end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                 where n.nspname='auth' and p.proname='uid') then
    execute $ddl$create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$$ddl$;
  end if;
end $stub$;

-- ---------- C0) ESKI deliver_due_messages + BOZUK messages KOLONLARI ----------
do $$ declare f record;
begin
  for f in select p.oid::regprocedure::text as sig
           from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and p.proname='deliver_due_messages' loop
    begin execute 'drop function if exists ' || f.sig; exception when others then null; end;
  end loop;
end $$;

do $$ declare c record;
begin
  if to_regclass('public.messages') is null then return; end if;
  for c in
    select column_name from information_schema.columns
    where table_schema='public' and table_name='messages'
      and ( (column_name = 'class_id'    and udt_name <> 'uuid')
         or (column_name = 'student_ids' and udt_name <> '_uuid') )
  loop
    begin execute format('alter table public.messages drop column if exists %I', c.column_name);
    exception when others then null; end;
  end loop;
  select column_name into c from information_schema.columns
   where table_schema='public' and table_name='messages'
     and column_name='audience' and data_type <> 'text';
  if c.column_name is not null then
    begin
      execute 'alter table public.messages alter column audience type text using audience::text';
    exception when others then
      begin execute 'alter table public.messages drop column if exists audience';
      exception when others then null; end;
    end;
  end if;
end $$;

alter table public.messages add column if not exists audience text not null default 'all';
alter table public.messages add column if not exists send_at timestamptz;
alter table public.messages add column if not exists sent boolean not null default false;
alter table public.messages add column if not exists sent_at timestamptz;
alter table public.messages add column if not exists created_by uuid references public.profiles(id);

-- ---------- C) FONKSIYONLAR ----------
do $$
declare f text;
begin
  foreach f in array array['public.is_staff()','public.is_admin()','public.has_perm(text)',
                           'public.my_class_ids()']
  loop
    begin execute 'drop function if exists ' || f; exception when others then null; end;
  end loop;
end $$;

-- Tipten bagimsiz tamsayi cevirici: 'A1' -> 1, '' -> 1, null -> 1, 3 -> 3
create or replace function public.to_int(v text) returns integer
language sql immutable as $$
  select coalesce(nullif(regexp_replace(coalesce(v, ''), '[^0-9]', '', 'g'), '')::integer, 1)
$$;

-- Ozellik anahtari okuyucu (app_settings)
create or replace function public.flag(k text, d boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select lower(s.value #>> '{}') in ('true','1','on','yes')
                     from public.app_settings s where s.key = k), d)
$$;

-- SQL Editor (postgres) oturumu mu?
create or replace function public.is_dba() returns boolean
language sql stable as $$ select session_user in ('postgres','supabase_admin') $$;

do $f1$ begin
  execute $ddl$create or replace function public.is_staff() returns boolean
    language sql stable security definer set search_path = public as $fn$
      select exists (select 1 from public.profiles
        where id = auth.uid() and active and role in ('admin','teacher'))$fn$$ddl$;
exception when others then raise notice 'is_staff atlandi: %', sqlerrm; end $f1$;

do $f2$ begin
  execute $ddl$create or replace function public.is_admin() returns boolean
    language sql stable security definer set search_path = public as $fn$
      select exists (select 1 from public.profiles
        where id = auth.uid() and active and role = 'admin')$fn$$ddl$;
exception when others then raise notice 'is_admin atlandi: %', sqlerrm; end $f2$;

do $f3$ begin
  execute $ddl$create or replace function public.has_perm(p text) returns boolean
    language sql stable security definer set search_path = public as $fn$
      select exists (select 1 from public.profiles
        where id = auth.uid() and active
          and (role = 'admin' or (role = 'teacher' and lower(coalesce(perms->>p,'')) = 'true')))$fn$$ddl$;
exception when others then raise notice 'has_perm atlandi: %', sqlerrm; end $f3$;

do $f4$ begin
  execute $ddl$create or replace function public.my_class_ids() returns uuid[]
    language sql stable security definer set search_path = public as $fn$
      select coalesce(array_agg(class_id) filter (where class_id is not null), '{}'::uuid[])
      from public.teacher_classes where teacher_id = auth.uid()$fn$$ddl$;
exception when others then raise notice 'my_class_ids atlandi: %', sqlerrm; end $f4$;

-- Kullanicinin seviyesi (profiles.level hangi tipte olursa olsun calisir)
create or replace function public.my_level() returns integer
language sql stable security definer set search_path = public as $$
  select coalesce((select public.to_int(p.level::text) from public.profiles p where p.id = auth.uid()), 1)
$$;

-- Planli bildirim dagitimi. audience: 'all' | 'class:<uuid>' | 'student:<uuid>'
create or replace function public.deliver_due_messages() returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; k int; r record; ids uuid[];
begin
  for r in select m.id, m.title, m.body, coalesce(m.audience::text, 'all') as aud_txt
           from public.messages m
           where m.sent is not true and m.send_at <= now()
           for update skip locked
  loop
    ids := '{}'::uuid[];
    if r.aud_txt = 'all' then
      select coalesce(array_agg(p.id), '{}'::uuid[]) into ids from public.profiles p
       where p.role = 'student' and p.active;
    elsif r.aud_txt like 'class:%' then
      begin
        select coalesce(array_agg(p.id), '{}'::uuid[]) into ids from public.profiles p
         where p.role = 'student' and p.active
           and p.class_id = split_part(r.aud_txt, ':', 2)::uuid;
      exception when invalid_text_representation then ids := '{}'::uuid[]; end;
    elsif r.aud_txt like 'student:%' then
      begin
        ids := array[split_part(r.aud_txt, ':', 2)::uuid];
      exception when invalid_text_representation then ids := '{}'::uuid[]; end;
    end if;

    ids := ids || coalesce((select array_agg(t.student_id) from public.message_targets t
                             where t.message_id = r.id), '{}'::uuid[]);

    insert into public.notifications (student_id, title, body, message_id)
    select distinct u.sid, r.title, r.body, r.id
      from unnest(ids) as u(sid)
     where exists (select 1 from public.profiles pr where pr.id = u.sid)
       and not exists (select 1 from public.notifications x
                        where x.message_id = r.id and x.student_id = u.sid);
    get diagnostics k = row_count;
    n := n + k;

    update public.messages set sent = true, sent_at = now() where id = r.id;
  end loop;
  return n;
end $$;
revoke all on function public.deliver_due_messages() from public, anon;
grant execute on function public.deliver_due_messages() to authenticated;

-- Profil koruma: ogretmen role/perms degistiremez, profil silemez/olusturamaz.
-- Service role / SECURITY DEFINER fonksiyonlari (current_user authenticated/anon degil) etkilenmez.
create or replace function public.protect_profile() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated','anon') or public.is_admin() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'INSERT' then raise exception 'yetki yok: profil olusturma'; end if;
  if tg_op = 'DELETE' then raise exception 'yetki yok: profil silme'; end if;
  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.perms is distinct from old.perms then
    raise exception 'yetki yok: role/perms degistirilemez';
  end if;
  if old.id = auth.uid() then
    if new.active is distinct from old.active then
      raise exception 'yetki yok: kendi hesabinizin durumunu degistiremezsiniz';
    end if;
  elsif old.role <> 'student' then
    raise exception 'yetki yok: yalnizca ogrenci profilleri duzenlenebilir';
  end if;
  return new;
end $$;

-- Denetim kaydi
create or replace function public.log_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  r := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.audit_log(actor, actor_name, action, table_name, row_id, detail)
  values (auth.uid(),
          (select full_name from public.profiles where id = auth.uid()),
          tg_op, tg_table_name, r->>'id', r);
  return null;
end $$;

-- updated_at otomatik guncelleme
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Silinen kaydi deleted_items'a arsivle (flag: archive_deleted)
create or replace function public.archive_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.flag('archive_deleted', true) then
    insert into public.deleted_items(table_name, row_id, data, deleted_by)
    values (tg_table_name, to_jsonb(old)->>'id', to_jsonb(old), auth.uid());
  end if;
  return old;
end $$;

-- Soru JSON dogrulama (flag: validate_questions, varsayilan KAPALI)
create or replace function public.validate_question() returns trigger
language plpgsql set search_path = public as $$
begin
  if not public.flag('validate_questions', false) then return new; end if;
  if new.topic_id is null and new.subtopic_id is null then
    raise exception 'soru bir konuya veya alt konuya bagli olmali';
  end if;
  if jsonb_typeof(new.data) is distinct from 'object' then
    raise exception 'questions.data bir JSON nesnesi olmali';
  end if;
  if new.kind = 'mc' then
    if coalesce(new.data->>'q','') = '' or jsonb_typeof(new.data->'o') is distinct from 'array'
       or (new.data->'c') is null then
      raise exception 'mc soru: q, o (dizi) ve c gerekli';
    end if;
  elsif new.kind = 'gap' then
    if coalesce(new.data->>'q','') = '' or (new.data->'a') is null then
      raise exception 'gap soru: q ve a gerekli';
    end if;
  elsif new.kind in ('list','match') then
    if jsonb_typeof(new.data->'items') is distinct from 'array' then
      raise exception '% soru: items (dizi) gerekli', new.kind;
    end if;
  end if;
  return new;
end $$;

-- Odev teslimi korumasi (flag: strict_submissions)
create or replace function public.guard_submission() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated','anon') or public.is_staff()
     or not public.flag('strict_submissions', true) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.feedback := null;
    new.reviewed_at := null;
    if new.status = 'reviewed' then new.status := 'submitted'; end if;
  else
    new.student_id := old.student_id;
    new.homework_id := old.homework_id;
    new.feedback := old.feedback;
    new.reviewed_at := old.reviewed_at;
    if new.status = 'reviewed' and old.status is distinct from 'reviewed' then
      new.status := old.status;
    end if;
  end if;
  return new;
end $$;

-- Ilerleme korumasi: erisimi olmayan konuya/kelimeye yazamaz (flag: strict_progress)
create or replace function public.guard_progress() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated','anon') or public.is_staff()
     or not public.flag('strict_progress', true) then
    return new;
  end if;
  if tg_table_name in ('topic_pass','topic_complete','test_attempts') then
    if not exists (select 1 from public.topics t where t.id = new.topic_id) then
      raise exception 'bu konuya erisiminiz yok';
    end if;
  elsif tg_table_name = 'subtopic_done' then
    if not exists (select 1 from public.subtopics s where s.id = new.subtopic_id) then
      raise exception 'bu alt konuya erisiminiz yok';
    end if;
  elsif tg_table_name = 'words_learned' then
    if not exists (select 1 from public.words w where w.id = new.word_id) then
      raise exception 'bu kelimeye erisiminiz yok';
    end if;
  end if;
  return new;
end $$;

-- Bildirimde ogrenci yalniz 'read' degistirebilir (flag: strict_notifications)
create or replace function public.guard_notification() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated','anon') or public.is_staff()
     or not public.flag('strict_notifications', true) then
    return new;
  end if;
  new.student_id := old.student_id;
  new.title := old.title;
  new.body := old.body;
  new.message_id := old.message_id;
  new.created_at := old.created_at;
  return new;
end $$;

-- Odev atandiginda otomatik bildirim (flag: notify_homework, varsayilan KAPALI)
create or replace function public.notify_homework() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.flag('notify_homework', false) then
    insert into public.notifications(student_id, title, body)
    select new.student_id, 'Yeni odev', h.title from public.homework h where h.id = new.homework_id;
  end if;
  return new;
end $$;

-- Yeni auth kullanicisi icin otomatik 'student' profili (flag: auto_profile, varsayilan KAPALI).
-- Rol HICBIR ZAMAN metadata'dan alinmaz. Hata olursa kullanici olusturmayi bozmaz.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.flag('auto_profile', false) then return new; end if;
  insert into public.profiles(id, email, full_name, role)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'full_name', ''), 'student')
  on conflict (id) do nothing;
  return new;
exception when others then
  return new;
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
alter table public.deleted_items enable row level security;
alter table public.schema_migrations enable row level security;

-- (select auth.uid()) / (select fonksiyon()) sarmalamasi: sorgu basina bir kez hesaplanir (performans)
create policy self_or_staff on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_staff()));
create policy staff_write_profiles on public.profiles for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
-- (role/perms/silme korumasi: protect_profile tetikleyicisi)

create policy read_words on public.words for select to authenticated
  using ((select public.is_staff())
      or public.to_int(words.level::text) <= (select public.my_level()));
create policy staff_write_words on public.words for all to authenticated
  using ((select public.has_perm('words.manage'))) with check ((select public.has_perm('words.manage')));

create policy read_topics on public.topics for select to authenticated
  using ((select public.is_staff())
      or exists (select 1 from public.topic_access a
                  where a.topic_id = topics.id and a.student_id = (select auth.uid()))
      or public.to_int(topics.level::text) <= (select public.my_level()));
create policy staff_write_topics on public.topics for all to authenticated
  using ((select public.has_perm('topics.manage'))) with check ((select public.has_perm('topics.manage')));

create policy read_subs_q on public.subtopics for select to authenticated
  using ((select public.is_staff()) or exists (select 1 from public.topics t where t.id = subtopics.topic_id));
create policy staff_write_subs_q on public.subtopics for all to authenticated
  using ((select public.has_perm('topics.manage'))) with check ((select public.has_perm('topics.manage')));

create policy read_subs_q2 on public.questions for select to authenticated
  using ((select public.is_staff())
      or exists (select 1 from public.topics t where t.id = questions.topic_id)
      or exists (select 1 from public.subtopics s where s.id = questions.subtopic_id));
create policy staff_write_subs_q2 on public.questions for all to authenticated
  using ((select public.has_perm('topics.manage'))) with check ((select public.has_perm('topics.manage')));

create policy read_hw on public.homework for select to authenticated
  using ((select public.is_staff())
      or exists (select 1 from public.homework_targets t
                  where t.homework_id = homework.id and t.student_id = (select auth.uid())));
create policy staff_write_hw on public.homework for all to authenticated
  using ((select public.has_perm('homework.manage'))) with check ((select public.has_perm('homework.manage')));

create policy read_ht on public.homework_targets for select to authenticated
  using ((select public.is_staff()) or student_id = (select auth.uid()));
create policy staff_write_ht on public.homework_targets for all to authenticated
  using ((select public.has_perm('homework.manage'))) with check ((select public.has_perm('homework.manage')));

create policy own_ta on public.topic_access for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_staff()));
create policy staff_ta on public.topic_access for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- ogrenci ilerlemesi: kendi satirlarini yazar/okur, ogretmen hepsini okur
do $$
declare t text;
begin
  foreach t in array array['homework_submissions','topic_complete','topic_pass','subtopic_done',
                           'words_learned','daily_words','test_attempts']
  loop
    execute format('drop policy if exists own_%1$s on public.%1$I', t);
    execute format('create policy own_%1$s on public.%1$I for all to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()))', t);
    execute format('drop policy if exists staff_read_%1$s on public.%1$I', t);
    execute format('create policy staff_read_%1$s on public.%1$I for select to authenticated using ((select public.is_staff()))', t);
  end loop;
end $$;

create policy staff_update_homework_submissions on public.homework_submissions
  for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy staff_delete_homework_submissions on public.homework_submissions
  for delete to authenticated using ((select public.is_staff()));

create policy own_notif on public.notifications for all to authenticated
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy staff_read_notif on public.notifications for select to authenticated
  using ((select public.is_staff()));

create policy staff_msg on public.messages for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy staff_msg_t on public.message_targets for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy read_classes on public.classes for select to authenticated using (true);
create policy staff_classes on public.classes for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

do $$
declare t text;
begin
  foreach t in array array['lessons','lesson_students','attendance_sessions','attendance_records']
  loop
    execute format('drop policy if exists staff_%1$s on public.%1$I', t);
    execute format('create policy staff_%1$s on public.%1$I for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()))', t);
  end loop;
end $$;

create policy read_teacher_classes on public.teacher_classes for select to authenticated
  using ((select public.is_staff()));
create policy admin_teacher_classes on public.teacher_classes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy settings_read on public.app_settings for select to anon, authenticated using (true);
create policy settings_admin on public.app_settings for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy admin_audit on public.audit_log for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_deleted_items on public.deleted_items for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_schema_migrations on public.schema_migrations for select to authenticated
  using ((select public.is_admin()));

-- ---------- D2) TETIKLEYICILER ----------
create trigger protect_profile before insert or update or delete on public.profiles
  for each row execute function public.protect_profile();

do $$
declare t text;
begin
  -- denetim
  foreach t in array array['profiles','classes','topics','homework','topic_access','teacher_classes']
  loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.log_change()', t);
  end loop;
  -- updated_at
  foreach t in array array['test_attempts','app_settings']
  loop
    execute format('drop trigger if exists trg_updated_at_%1$s on public.%1$I', t);
    execute format('create trigger trg_updated_at_%1$s before update on public.%1$I for each row execute function public.set_updated_at()', t);
  end loop;
  -- silme arsivi
  foreach t in array array['topics','subtopics','questions','words','homework']
  loop
    execute format('drop trigger if exists trg_archive_%1$s on public.%1$I', t);
    execute format('create trigger trg_archive_%1$s before delete on public.%1$I for each row execute function public.archive_row()', t);
  end loop;
  -- ilerleme korumasi
  foreach t in array array['topic_pass','topic_complete','test_attempts','subtopic_done','words_learned']
  loop
    execute format('drop trigger if exists trg_guard_progress_%1$s on public.%1$I', t);
    execute format('create trigger trg_guard_progress_%1$s before insert or update on public.%1$I for each row execute function public.guard_progress()', t);
  end loop;
end $$;

create trigger trg_guard_submission before insert or update on public.homework_submissions
  for each row execute function public.guard_submission();
create trigger trg_guard_notification before update on public.notifications
  for each row execute function public.guard_notification();
create trigger trg_validate_question before insert or update on public.questions
  for each row execute function public.validate_question();
create trigger trg_notify_homework after insert on public.homework_targets
  for each row execute function public.notify_homework();

-- auth.users tetikleyicisi (yetki yoksa sessizce atlanir)
do $$ begin
  if to_regclass('auth.users') is not null then
    begin
      execute 'drop trigger if exists trg_new_user on auth.users';
      execute 'create trigger trg_new_user after insert on auth.users for each row execute function public.handle_new_user()';
    exception when others then raise notice 'trg_new_user atlandi: %', sqlerrm; end;
  end if;
end $$;

-- ---------- E) INDEKSLER ve KISITLAR (her biri bagimsiz; biri patlarsa digerleri devam eder) ----------
do $$
declare a text[]; i int;
begin
  a := array[
    ['ix_topic_access_student','topic_access','student_id'],
    ['ix_topic_access_topic','topic_access','topic_id'],
    ['ix_hw_targets_hw','homework_targets','homework_id'],
    ['ix_hw_targets_student','homework_targets','student_id'],
    ['ix_notifications_student','notifications','student_id, created_at desc'],
    ['ix_notifications_message','notifications','message_id'],
    ['ux_hwsub','UNIQUE:homework_submissions','homework_id, student_id'],
    ['ix_hwsub_student','homework_submissions','student_id'],
    ['ix_words_level','words','level'],
    ['ix_topics_level_sort','topics','level, sort_order'],
    ['ix_subtopics_topic','subtopics','topic_id, sort_order'],
    ['ix_questions_topic','questions','topic_id'],
    ['ix_questions_subtopic','questions','subtopic_id'],
    ['ix_homework_topic','homework','topic_id'],
    ['ix_topic_complete_topic','topic_complete','topic_id'],
    ['ix_topic_pass_topic','topic_pass','topic_id'],
    ['ix_subtopic_done_sub','subtopic_done','subtopic_id'],
    ['ix_words_learned_word','words_learned','word_id'],
    ['ix_test_attempts_topic','test_attempts','topic_id'],
    ['ix_lessons_class','lessons','class_id'],
    ['ix_lessons_teacher','lessons','teacher_id'],
    ['ix_lesson_students_student','lesson_students','student_id'],
    ['ix_att_sessions_lesson','attendance_sessions','lesson_id, date'],
    ['ix_att_records_student','attendance_records','student_id'],
    ['ix_message_targets_student','message_targets','student_id'],
    ['ix_teacher_classes_class','teacher_classes','class_id'],
    ['ix_profiles_class','profiles','class_id'],
    ['ix_profiles_role','profiles','role'],
    ['ix_deleted_items_at','deleted_items','deleted_at desc']
  ];
  for i in 1..array_length(a, 1) loop
    begin
      if a[i][2] like 'UNIQUE:%' then
        execute format('create unique index if not exists %I on public.%I (%s)', a[i][1], substr(a[i][2], 8), a[i][3]);
      else
        execute format('create index if not exists %I on public.%I (%s)', a[i][1], a[i][2], a[i][3]);
      end if;
    exception when others then
      raise notice 'indeks % atlandi: %', a[i][1], sqlerrm;
    end;
  end loop;

  begin
    execute 'create index if not exists ix_messages_due on public.messages (send_at) where sent is not true';
  exception when others then raise notice 'ix_messages_due atlandi: %', sqlerrm; end;
end $$;

-- Veri butunlugu kisitlari (NOT VALID: mevcut satirlari taramaz, yeni yazimlari denetler)
do $$
declare a text[]; i int;
begin
  a := array[
    ['profiles','chk_profiles_level','level >= 0'],
    ['words','chk_words_level','level >= 0'],
    ['topics','chk_topics_level','level >= 0'],
    ['homework_submissions','chk_hwsub_score','score is null or score >= 0'],
    ['topic_pass','chk_tp_attempts','attempts >= 0'],
    ['test_attempts','chk_ta_attempts','attempts >= 0'],
    ['daily_words','chk_dw_count','"count" >= 0']
  ];
  for i in 1..array_length(a, 1) loop
    begin
      execute format('alter table public.%I add constraint %I check (%s) not valid', a[i][1], a[i][2], a[i][3]);
    exception
      when duplicate_object then null;
      when others then raise notice 'kisit % atlandi: %', a[i][2], sqlerrm;
    end;
  end loop;
end $$;

-- Cift kelime gorunumu (silmez; dedupe_words() ile birlestirilir)
do $$ begin
  execute $v$create or replace view public.words_duplicates with (security_invoker = true) as
    select lower(trim(w.en)) as en_key, lower(trim(w.tr)) as tr_key, w.level::text as level_key,
           count(*)::int as copies, array_agg(w.id order by w.created_at) as ids
      from public.words w
     group by 1, 2, 3
    having count(*) > 1$v$;
  execute 'revoke all on public.words_duplicates from anon';
exception when others then raise notice 'words_duplicates atlandi: %', sqlerrm; end $$;

-- ---------- F) REALTIME YAYINI (idempotent) ----------
do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['topics','subtopics','questions','homework','homework_targets',
                           'topic_access','notifications']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when others then raise notice 'realtime % atlandi: %', t, sqlerrm;
    end;
  end loop;
end $$;

-- ---------- G) BASLANGIC AYARLARI ve OZELLIK ANAHTARLARI ----------
insert into public.app_settings (key, value) values
  ('theme_color', '"#4f46e5"'),
  ('app_logo', 'null'),
  ('daily_word_min', '8'),
  ('daily_word_max', '15'),
  ('strict_submissions', 'true'),
  ('strict_progress', 'true'),
  ('strict_notifications', 'true'),
  ('archive_deleted', 'true'),
  ('notify_homework', 'false'),
  ('auto_profile', 'false'),
  ('validate_questions', 'false'),
  ('reset_rate_limit_per_hour', '3'),
  ('reset_rate_limit_global', '200')
on conflict (key) do nothing;

insert into public.schema_migrations (version, note)
values ('english-base-v3', 'COALESCE tip duzeltmesi, raporlar, arsiv, guvenlik tetikleyicileri')
on conflict (version) do nothing;

-- ============ BOLUM H: SIFRE SIFIRLAMA YARDIM TALEPLERI ============
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

create policy hr_insert on public.help_requests for insert to anon, authenticated
  with check (status = 'open' and resolved_at is null and resolved_by is null
              and char_length(email) between 3 and 254
              and (note is null or char_length(note) <= 500));
create policy hr_select_admin on public.help_requests for select to authenticated
  using ((select public.is_admin()));
create policy hr_update_admin on public.help_requests for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Hiz siniri: e-posta basina saatte N, genelde saatte M talep
create or replace function public.help_rate_ok(p_email text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare per_email int; glob int;
begin
  per_email := coalesce((select public.to_int(s.value #>> '{}') from public.app_settings s
                          where s.key = 'reset_rate_limit_per_hour'), 3);
  glob := coalesce((select public.to_int(s.value #>> '{}') from public.app_settings s
                     where s.key = 'reset_rate_limit_global'), 200);
  return (select count(*) from public.help_requests h
           where lower(h.email) = lower(trim(p_email)) and h.created_at > now() - interval '1 hour') < per_email
     and (select count(*) from public.help_requests h2
           where h2.created_at > now() - interval '1 hour') < glob;
end $$;

create or replace function public.help_rate_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated','anon') and not public.help_rate_ok(new.email) then
    raise exception 'cok fazla talep, lutfen daha sonra tekrar deneyin';
  end if;
  new.email := lower(trim(new.email));
  return new;
end $$;
drop trigger if exists trg_help_rate on public.help_requests;
create trigger trg_help_rate before insert on public.help_requests
  for each row execute function public.help_rate_guard();

create or replace function public.request_password_reset(p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_email is null or position('@' in p_email) = 0 or char_length(p_email) > 254 then return; end if;
  if not public.help_rate_ok(p_email) then return; end if;   -- sessizce yoksay (kullanici varligi sizmaz)
  insert into public.help_requests(email) values (lower(trim(p_email)));
  select id into v_id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_id is not null then
    update public.profiles set must_change_password = true where id = v_id;
  end if;
end $$;
revoke all on function public.request_password_reset(text) from public;
grant execute on function public.request_password_reset(text) to anon, authenticated;

create or replace function public.resolve_help_request(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'yetki yok'; end if;
  update public.help_requests
     set status='resolved', resolved_at=now(), resolved_by=auth.uid() where id=p_id;
  insert into public.audit_log(actor, action, table_name, row_id, detail)
    values (auth.uid(), 'FUNC:resolve_help','help_requests', p_id::text,
            jsonb_build_object('by', auth.uid()));
end $$;
revoke all on function public.resolve_help_request(uuid) from public;
grant execute on function public.resolve_help_request(uuid) to authenticated;

-- ---------- H2) TEST YARDIMCISI: admin_create_user ----------
drop function if exists public.admin_create_user(text, text, text, uuid);
create or replace function public.admin_create_user(
  p_email text, p_password text default null, p_role text default 'student', p_class_id uuid default null)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_admin() or public.is_dba()) then
    raise exception 'yetki yok';
  end if;
  if p_role not in ('admin','teacher','student') then
    return 'HATA: role admin/teacher/student olmali';
  end if;
  insert into public.audit_log(actor, action, table_name, detail)
    values (auth.uid(), 'SQL_TEST:create_user', 'auth.users',
            jsonb_build_object('email', p_email, 'role', p_role, 'class_id', p_class_id));
  return 'OK: admin_create_user calisti; test kaydi audit_log tablosuna yazildi. Gercek hesap acmak icin paneli veya Edge Function kullanin.';
end $$;
revoke all on function public.admin_create_user(text, text, text, uuid) from public, anon;
grant execute on function public.admin_create_user(text, text, text, uuid) to authenticated;

-- ============ BOLUM J: RAPORLAR, ISTATISTIKLER, TOPLU ISLEMLER ============

-- Ardisik gun serisi (bugun henuz kelime yoksa dunden sayar)
create or replace function public.word_streak(p_student uuid default null) returns int
language plpgsql stable security definer set search_path = public as $$
declare v uuid := coalesce(p_student, auth.uid()); cur date := current_date; n int := 0;
begin
  if v is null then return 0; end if;
  if v is distinct from auth.uid() and not (public.is_staff() or public.is_dba()) then
    raise exception 'yetki yok';
  end if;
  if not exists (select 1 from public.daily_words d where d.student_id = v and d.day = cur and d."count" > 0) then
    cur := cur - 1;
  end if;
  while exists (select 1 from public.daily_words d where d.student_id = v and d.day = cur and d."count" > 0) loop
    n := n + 1;
    cur := cur - 1;
  end loop;
  return n;
end $$;

-- Ogrenci ilerleme ozeti (ogrenci yalniz kendisini, staff herkesi gorur)
create or replace function public.student_progress_summary(p_student uuid default null)
returns table(student uuid, student_name text, topics_completed int, topics_passed int,
              words_learned_count int, homework_assigned int, homework_submitted int,
              avg_score numeric, streak int, last_activity timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare v uuid := coalesce(p_student, auth.uid());
begin
  if v is null then raise exception 'oturum yok'; end if;
  if v is distinct from auth.uid() and not (public.is_staff() or public.is_dba()) then
    raise exception 'yetki yok';
  end if;
  return query
  select p.id, p.full_name,
    (select count(*)::int from public.topic_complete x where x.student_id = p.id),
    (select count(*)::int from public.topic_pass x where x.student_id = p.id and x.passed_at is not null),
    (select count(*)::int from public.words_learned x where x.student_id = p.id),
    (select count(*)::int from public.homework_targets x where x.student_id = p.id),
    (select count(*)::int from public.homework_submissions x where x.student_id = p.id),
    (select round(avg(x.score)::numeric, 1) from public.homework_submissions x
      where x.student_id = p.id and x.score is not null),
    public.word_streak(p.id),
    greatest(
      (select max(x.completed_at) from public.topic_complete x where x.student_id = p.id),
      (select max(x.passed_at) from public.topic_pass x where x.student_id = p.id),
      (select max(x.learned_at) from public.words_learned x where x.student_id = p.id),
      (select max(x.done_at) from public.subtopic_done x where x.student_id = p.id),
      (select max(x.submitted_at) from public.homework_submissions x where x.student_id = p.id))
  from public.profiles p where p.id = v;
end $$;

-- Lider tablosu: ogrenci yalniz kendi sinifini gorur; staff p_class verir veya hepsi
create or replace function public.leaderboard(p_class uuid default null, p_limit int default 10)
returns table(pos int, student_name text, word_count int, topic_count int, points int, is_me boolean)
language plpgsql stable security definer set search_path = public as $$
declare v_class uuid; v_all boolean := false; v_me uuid := auth.uid();
begin
  if v_me is null and not public.is_dba() then raise exception 'oturum yok'; end if;
  if public.is_staff() or public.is_dba() then
    v_class := p_class;
    v_all := (p_class is null);
  else
    select pr.class_id into v_class from public.profiles pr where pr.id = v_me;
  end if;
  return query
  select (row_number() over (order by s.pts desc, s.nm))::int, s.nm, s.w, s.t, s.pts, (s.id = v_me)
  from (
    select b.id, b.nm, b.w, b.t, (b.w + 10 * b.t) as pts
    from (
      select p.id, p.full_name as nm,
        (select count(*)::int from public.words_learned x where x.student_id = p.id) as w,
        (select count(*)::int from public.topic_pass x where x.student_id = p.id and x.passed_at is not null) as t
      from public.profiles p
      where p.role = 'student' and p.active
        and (v_all or p.id = v_me or (v_class is not null and p.class_id = v_class))
    ) b
  ) s
  order by s.pts desc, s.nm
  limit greatest(coalesce(p_limit, 10), 1);
end $$;

-- Sinif raporu (staff)
create or replace function public.class_report(p_class uuid)
returns table(student uuid, student_name text, word_count int, topics_passed int,
              hw_assigned int, hw_submitted int, hw_completion_pct numeric,
              avg_score numeric, absences int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_staff() or public.is_dba()) then raise exception 'yetki yok'; end if;
  return query
  select b.id, b.nm, b.w, b.tp, b.ha, b.hs,
         (case when b.ha = 0 then 0::numeric else round(100.0 * b.hs / b.ha, 1) end),
         b.av, b.ab
  from (
    select p.id, p.full_name as nm,
      (select count(*)::int from public.words_learned x where x.student_id = p.id) as w,
      (select count(*)::int from public.topic_pass x where x.student_id = p.id and x.passed_at is not null) as tp,
      (select count(*)::int from public.homework_targets x where x.student_id = p.id) as ha,
      (select count(*)::int from public.homework_submissions x where x.student_id = p.id) as hs,
      (select round(avg(x.score)::numeric, 1) from public.homework_submissions x
        where x.student_id = p.id and x.score is not null) as av,
      (select count(*)::int from public.attendance_records r where r.student_id = p.id and r.status = 'absent') as ab
    from public.profiles p
    where p.role = 'student' and p.class_id = p_class
  ) b
  order by b.nm;
end $$;

-- Odev tamamlama durumu (staff)
create or replace function public.homework_completion(p_hw uuid)
returns table(student uuid, student_name text, submitted boolean, score int, status text, submitted_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_staff() or public.is_dba()) then raise exception 'yetki yok'; end if;
  return query
  select p.id, p.full_name, (s.id is not null), s.score::int, s.status::text, s.submitted_at
  from public.homework_targets t
  join public.profiles p on p.id = t.student_id
  left join public.homework_submissions s on s.homework_id = t.homework_id and s.student_id = t.student_id
  where t.homework_id = p_hw
  order by p.full_name;
end $$;

-- Devamsizlik istatistigi (staff)
create or replace function public.attendance_stats(p_class uuid default null, p_from date default null, p_to date default null)
returns table(student uuid, student_name text, present_count int, absent_count int, late_count int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_staff() or public.is_dba()) then raise exception 'yetki yok'; end if;
  return query
  select p.id, p.full_name,
    (select count(*)::int from public.attendance_records r join public.attendance_sessions s on s.id = r.session_id
      where r.student_id = p.id and r.status = 'present'
        and (p_from is null or s.date >= p_from) and (p_to is null or s.date <= p_to)),
    (select count(*)::int from public.attendance_records r join public.attendance_sessions s on s.id = r.session_id
      where r.student_id = p.id and r.status = 'absent'
        and (p_from is null or s.date >= p_from) and (p_to is null or s.date <= p_to)),
    (select count(*)::int from public.attendance_records r join public.attendance_sessions s on s.id = r.session_id
      where r.student_id = p.id and r.status = 'late'
        and (p_from is null or s.date >= p_from) and (p_to is null or s.date <= p_to))
  from public.profiles p
  where p.role = 'student' and (p_class is null or p.class_id = p_class)
  order by p.full_name;
end $$;

-- Toplu islemler
create or replace function public.grant_topic_to_class(p_class uuid, p_topic uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_staff() then raise exception 'yetki yok'; end if;
  with ins as (
    insert into public.topic_access(student_id, topic_id, granted_by)
    select p.id, p_topic, auth.uid() from public.profiles p
     where p.role = 'student' and p.active and p.class_id = p_class
    on conflict do nothing
    returning 1)
  select count(*)::int into n from ins;
  return n;
end $$;

create or replace function public.revoke_topic_from_class(p_class uuid, p_topic uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_staff() then raise exception 'yetki yok'; end if;
  delete from public.topic_access a
   where a.topic_id = p_topic
     and a.student_id in (select p.id from public.profiles p where p.role = 'student' and p.class_id = p_class);
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.assign_homework_to_class(p_hw uuid, p_class uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.has_perm('homework.manage') then raise exception 'yetki yok'; end if;
  with ins as (
    insert into public.homework_targets(homework_id, student_id)
    select p_hw, p.id from public.profiles p
     where p.role = 'student' and p.active and p.class_id = p_class
    on conflict do nothing
    returning 1)
  select count(*)::int into n from ins;
  return n;
end $$;

-- Cift kelimeleri birlestir (admin). words_learned kayitlari korunur.
create or replace function public.dedupe_words() returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; r record;
begin
  if not (public.is_admin() or public.is_dba()) then raise exception 'yetki yok'; end if;
  for r in
    select x.id, x.keep_id from (
      select w.id,
             first_value(w.id) over (partition by lower(trim(w.en)), lower(trim(w.tr)), w.level::text
                                     order by w.created_at, w.id) as keep_id
        from public.words w) x
     where x.id <> x.keep_id
  loop
    insert into public.words_learned(student_id, word_id, learned_at)
    select l.student_id, r.keep_id, l.learned_at from public.words_learned l
     where l.word_id = r.id
    on conflict do nothing;
    delete from public.words where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Arsivden geri yukleme (admin)
create or replace function public.restore_deleted(p_id bigint) returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  if not (public.is_admin() or public.is_dba()) then raise exception 'yetki yok'; end if;
  select * into r from public.deleted_items where id = p_id;
  if not found then raise exception 'arsiv kaydi yok: %', p_id; end if;
  if r.table_name not in ('topics','subtopics','questions','words','homework') then
    raise exception 'bu tablo geri yuklenemez: %', r.table_name;
  end if;
  execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I, $1) on conflict do nothing',
                 r.table_name, r.table_name) using r.data;
  get diagnostics n = row_count;
  if n > 0 then delete from public.deleted_items where id = p_id; end if;
  return n;
end $$;

-- Silinen konuyu alt konulari ve sorulariyla geri yukle (admin)
create or replace function public.restore_topic(p_topic uuid) returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  if not (public.is_admin() or public.is_dba()) then raise exception 'yetki yok'; end if;
  for r in
    select d.id from public.deleted_items d
     where (d.table_name = 'topics' and d.row_id = p_topic::text)
        or (d.table_name = 'subtopics' and d.data->>'topic_id' = p_topic::text)
        or (d.table_name = 'questions' and d.data->>'topic_id' = p_topic::text)
     order by case d.table_name when 'topics' then 1 when 'subtopics' then 2 else 3 end, d.id
  loop
    n := n + public.restore_deleted(r.id);
  end loop;
  return n;
end $$;

-- Eski kayitlari temizle (pg_cron ile her gece; admin elle de calistirabilir)
create or replace function public.cleanup_old_data() returns jsonb
language plpgsql security definer set search_path = public as $$
declare a int; b int; c int; d int;
begin
  if not (public.is_admin() or public.is_dba()) then raise exception 'yetki yok'; end if;
  delete from public.audit_log l where l."at" < now() - interval '180 days';
  get diagnostics a = row_count;
  delete from public.notifications n where n."read" is true and n.created_at < now() - interval '90 days';
  get diagnostics b = row_count;
  delete from public.help_requests h where h.status = 'resolved' and h.resolved_at < now() - interval '30 days';
  get diagnostics c = row_count;
  delete from public.deleted_items di where di.deleted_at < now() - interval '90 days';
  get diagnostics d = row_count;
  return jsonb_build_object('audit_log', a, 'notifications', b, 'help_requests', c, 'deleted_items', d);
end $$;

-- Kurulum saglik kontrolu: select * from public.system_check();
create or replace function public.system_check()
returns table(check_name text, ok boolean, detail text)
language plpgsql security definer set search_path = public as $$
declare
  t text; f text; n int; v_rls boolean; v_type text;
  tabs text[] := array['profiles','classes','words','topics','subtopics','questions','topic_access',
    'homework','homework_targets','homework_submissions','topic_complete','topic_pass','subtopic_done',
    'words_learned','daily_words','test_attempts','messages','message_targets','notifications','lessons',
    'lesson_students','attendance_sessions','attendance_records','teacher_classes','app_settings',
    'audit_log','help_requests','deleted_items','schema_migrations'];
  fns text[] := array['is_staff','is_admin','has_perm','my_class_ids','my_level','to_int','flag','is_dba',
    'deliver_due_messages','request_password_reset','resolve_help_request','protect_profile','log_change',
    'set_updated_at','archive_row','guard_submission','guard_progress','guard_notification',
    'validate_question','help_rate_ok','student_progress_summary','word_streak','leaderboard',
    'class_report','homework_completion','attendance_stats','grant_topic_to_class',
    'assign_homework_to_class','dedupe_words','restore_deleted','cleanup_old_data'];
  trgs text[] := array['protect_profile','audit_profiles','audit_topics','trg_guard_submission',
    'trg_guard_notification','trg_validate_question','trg_help_rate','trg_archive_topics'];
  rts text[] := array['topics','subtopics','questions','homework','homework_targets','topic_access','notifications'];
  cols text[] := array['profiles.level:integer','words.level:integer','topics.level:integer',
    'profiles.active:boolean','messages.sent:boolean','messages.audience:text'];
begin
  if not (public.is_admin() or public.is_dba()) then raise exception 'yetki yok'; end if;

  foreach t in array tabs loop
    select pc.relrowsecurity into v_rls from pg_class pc where pc.oid = to_regclass('public.' || t);
    check_name := 'tablo:' || t;
    ok := coalesce(v_rls, false);
    detail := case when v_rls is null then 'tablo YOK' when v_rls then 'rls acik' else 'RLS KAPALI' end;
    return next;
    select count(*)::int into n from pg_policies pp where pp.schemaname = 'public' and pp.tablename = t;
    check_name := 'policy:' || t;
    ok := n > 0;
    detail := n::text || ' policy';
    return next;
  end loop;

  foreach f in array fns loop
    check_name := 'fonksiyon:' || f;
    ok := exists (select 1 from pg_proc pr join pg_namespace ns on ns.oid = pr.pronamespace
                   where ns.nspname = 'public' and pr.proname = f);
    detail := case when ok then 'var' else 'YOK' end;
    return next;
  end loop;

  foreach f in array trgs loop
    check_name := 'tetikleyici:' || f;
    ok := exists (select 1 from pg_trigger tg where not tg.tgisinternal and tg.tgname = f);
    detail := case when ok then 'var' else 'YOK' end;
    return next;
  end loop;

  foreach t in array rts loop
    check_name := 'realtime:' || t;
    ok := exists (select 1 from pg_publication_tables pt
                   where pt.pubname = 'supabase_realtime' and pt.schemaname = 'public' and pt.tablename = t);
    detail := case when ok then 'yayinda' else 'YAYINDA DEGIL' end;
    return next;
  end loop;

  foreach f in array cols loop
    select ic.data_type into v_type from information_schema.columns ic
     where ic.table_schema = 'public'
       and ic.table_name = split_part(split_part(f, ':', 1), '.', 1)
       and ic.column_name = split_part(split_part(f, ':', 1), '.', 2);
    check_name := 'kolon tipi:' || split_part(f, ':', 1);
    ok := v_type is not distinct from split_part(f, ':', 2);
    detail := coalesce(v_type, 'YOK');
    return next;
  end loop;

  check_name := 'storage:content bucket';
  begin
    ok := exists (select 1 from storage.buckets sb where sb.id = 'content');
  exception when others then ok := false; end;
  detail := case when ok then 'var' else 'YOK/erisilemedi' end;
  return next;
end $$;

-- Yeni RPC'ler: anon cagiramaz, yalnizca giris yapmis kullanicilar (icerdeki yetki kontrolleri gecerli)
do $$
declare s text;
begin
  foreach s in array array[
    'public.word_streak(uuid)','public.student_progress_summary(uuid)','public.leaderboard(uuid,int)',
    'public.class_report(uuid)','public.homework_completion(uuid)','public.attendance_stats(uuid,date,date)',
    'public.grant_topic_to_class(uuid,uuid)','public.revoke_topic_from_class(uuid,uuid)',
    'public.assign_homework_to_class(uuid,uuid)','public.dedupe_words()','public.restore_deleted(bigint)',
    'public.restore_topic(uuid)','public.cleanup_old_data()','public.system_check()']
  loop
    begin
      execute format('revoke all on function %s from public, anon', s);
      execute format('grant execute on function %s to authenticated', s);
    exception when others then raise notice 'grant atlandi %: %', s, sqlerrm; end;
  end loop;
end $$;

-- ============ BOLUM K: STORAGE BUCKET + pg_cron ============
do $$ begin
  if to_regclass('storage.buckets') is null then
    raise notice 'storage semasi yok, bucket atlandi';
    return;
  end if;
  begin
    execute $s$insert into storage.buckets (id, name, public) values ('content','content', true)
               on conflict (id) do update set public = true$s$;
  exception when others then raise notice 'bucket atlandi: %', sqlerrm; end;
  begin
    execute 'drop policy if exists content_read on storage.objects';
    execute 'drop policy if exists content_insert on storage.objects';
    execute 'drop policy if exists content_update on storage.objects';
    execute 'drop policy if exists content_delete on storage.objects';
    execute $s$create policy content_read on storage.objects for select to anon, authenticated
               using (bucket_id = 'content')$s$;
    execute $s$create policy content_insert on storage.objects for insert to authenticated
               with check (bucket_id = 'content' and (select public.is_staff()))$s$;
    execute $s$create policy content_update on storage.objects for update to authenticated
               using (bucket_id = 'content' and (select public.is_staff()))
               with check (bucket_id = 'content' and (select public.is_staff()))$s$;
    execute $s$create policy content_delete on storage.objects for delete to authenticated
               using (bucket_id = 'content' and (select public.is_staff()))$s$;
  exception when others then raise notice 'storage policy atlandi: %', sqlerrm; end;
end $$;

-- pg_cron kuruluysa: mesaj dagitimi (dakikada bir) ve gece temizligi
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      execute $c$select cron.schedule('deliver-messages', '* * * * *', 'select public.deliver_due_messages()')$c$;
    exception when others then raise notice 'cron deliver atlandi: %', sqlerrm; end;
    begin
      execute $c$select cron.schedule('english-base-cleanup', '15 3 * * *', 'select public.cleanup_old_data()')$c$;
    exception when others then raise notice 'cron cleanup atlandi: %', sqlerrm; end;
  end if;
end $$;

-- ---------- I) DOGRULAMA (sadece SELECT) ----------
select 'tablolar' as kontrol, count(*)::text as deger from information_schema.tables
  where table_schema='public' and table_name in
  ('profiles','classes','words','topics','subtopics','questions','topic_access',
   'homework','homework_targets','homework_submissions','topic_complete','topic_pass',
   'subtopic_done','words_learned','daily_words','test_attempts','messages',
   'message_targets','notifications','lessons','lesson_students','attendance_sessions',
   'attendance_records','teacher_classes','app_settings','audit_log','help_requests',
   'deleted_items','schema_migrations')
union all
select 'rls_acik', count(*)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relrowsecurity
union all
select 'policy_sayisi', count(*)::text from pg_policies where schemaname='public'
union all
select 'realtime_tablo', count(*)::text from pg_publication_tables
  where pubname='supabase_realtime' and schemaname='public'
    and tablename in ('topics','subtopics','questions','homework','homework_targets','topic_access','notifications')
union all
select 'system_check_sorunlu', count(*)::text from public.system_check() sc where not sc.ok;
-- Beklenen: tablolar=29, rls_acik>=29, policy_sayisi>=50, realtime_tablo=7, system_check_sorunlu=0
-- (storage/cron yoksa system_check_sorunlu 1 olabilir; ayrinti: select * from public.system_check() where not ok;)
