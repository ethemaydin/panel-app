-- =====================================================================
-- ENGLISH BASE — SIFIRDAN KURULUM SQL (tek dosya, tek calistirma)
-- =====================================================================
-- NEREDE CALISTIRILIR:
--   Supabase Dashboard > SQL Editor > New query > bu dosyanin TAMAMINI
--   yapistir > Run.  (Projen: gnagqrqhzlqixafihiqo)
--
-- ONCEKILER:
--   * Extension'lar acik olmali: Database > Extensions >
--       - pgcrypto  (gen_random_uuid icin — Supabase'de varsayilan acik)
--       - pg_cron   (opsiyonel; planli bildirim dagitimi icin)
--   * Auth > Providers > Email: "Confirm email" KAPALI onerilir.
--   * Storage > New bucket: ad="content", public.
--
-- IDEMPOTENTTIR: tekrar calistirmak güvenlidir; mevcut tablolara
-- dokunmaz (if not exists), policy/fonksiyonlari gunceller.
--
-- ON-KOSUL GUARDI: Supabase'de auth schema hazirdir. Yerel/baska bir
-- Postgres'te test ederken "schema auth does not exist" hatasi alinmasin
-- diye asagidaki guard bos auth.users'i olusturur (Supabase'de no-op).
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}',
  created_at timestamptz default now()
);
--
-- ICERIK: A) tablolar  B) panel tablolari  C) yetki fonksiyonlari
--         D) RLS policy'leri  E) indeksler  F) realtime yayini
--         G) baslangic ayarlari  H) sifre sirlama yardim talepleri
-- =====================================================================

-- =====================================================================
-- ENGLISH BASE — MEVCUT SUPABASE PROJESI ICIN TEK DOSYADA KURULUM
-- Supabase Dashboard > SQL Editor > New query > hepsini yapistir > Run
-- Idempotenttir: tekrar calistirmak güvenlidir.
-- Bu dosya = supabase-kurulum.sql + panel guncellemesi + uygulama duzeltmeleri
-- (ozel kurulum SQL'iniz hazir oldugunda onu once calistirin, sonra bunu;
--  ya da sadece bunu calistirin — temel tabloları da olusturur.)
-- =====================================================================

-- ---------- A2) LEGACY profiles.class_id tip onarimi ----------
-- DESTEKLENEN SENARYO: tablo/RLS şeması bu dosyanın tasarladığı yapıdadır
-- (id/uuid PK'lar), yalnızca profiles.class_id ve level kolonları eski
-- sürümlerden bozuk tipte kalmıştır. classes.id veya topics.id INTEGER olan
-- çok eski şemalar otomatik migre edilMEZ — böyle bir DB'de kurulum gürültülü
-- durur (sessiz yarım migration yerine patlak hata tercih edilir).
-- Eski SQL surumlerinden kalmis integer/text tipli profiles.class_id kolonunu
-- uuid'ye cevirir. messages tablosunun bozuk kolonlari C0 blogunda dinamik
-- SQL ile temizlenir; burada HIC statik mesaj kolonu referansi yoktur
-- (statik referanslar Supabase'de 42804 "COALESCE types text and integer"
-- hatasinin kendisini uretiyordu).
do $$ declare c record;
begin
  if to_regclass('public.profiles') is null then return; end if;
  select column_name, udt_name into c
    from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='class_id';
  if c.column_name is not null and c.udt_name <> 'uuid' then
    -- Eski integer/esnek tipli class_id -> uuid. Gecersiz degerler NULL'a duser.
    -- Hata olursa SILENCE yutulmaz; kurulum gurultuyle durur (ON_ERROR_STOP ile uyumlu).
    execute 'alter table public.profiles drop constraint if exists profiles_class_fk';
    execute $x$alter table public.profiles alter column class_id type uuid
      using case
        when class_id::text ~* '^\s*[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}\s*$'
          then btrim(class_id::text)::uuid
        when class_id::text ~ '^[0-9]+$'
          then ('00000000-0000-0000-0000-' || lpad(class_id::text, 12, '0'))::uuid
        else null end$x$;
  end if;
end $$;

-- ---------- A2) LEGACY TIP ONARIMI (class_id/topic_id uuid -> integer) ------
-- Eski SQL surumlerinden kalmis INTEGER tipli id kolonlari (classes.id,
-- topics.id ve bunlara referans veren tum uuid kolonlari) otomatik olarak
-- uuid'ye cevrilir.  Sozlu-migration: sayisal degerler deterministik UUID'ye
-- donusturulur (1 -> 00000000-0000-0000-0000-000000000001), bozuk/uyumsuz
-- referanslar NULL'a duser.  Hata olursa sessizce yutulmaz; kurulum gurutulu
-- durur (ON_ERROR_STOP ile uyumlu).
do $$ declare
  r       record;
  r2      record;
  v_tab   text;
  v_col   text;
  v_pk    text;
begin
  -- 1) Ana tablolarin PK'si int ise once onu uuid yap (FK'leri gecici dusur)
  foreach v_tab in array array['public.classes','public.topics','public.words'] loop
    if to_regclass(v_tab) is null then continue; end if;
    select a.attname into v_pk
      from pg_constraint c join pg_attribute a
        on a.attrelid=c.conrelid and a.attnum = any(c.conkey)
      where c.contype='p' and c.conrelid = v_tab::regclass;
    if v_pk is null then continue; end if;
    if exists (select 1 from pg_attribute
                where attrelid = v_tab::regclass and attname = v_pk
                  and atttypid <> 'uuid'::regtype) then
      -- bu tabloya bakan FK'leri kaldir
      for r in select con.conname, cl.relname as child
                 from pg_constraint con
                 join pg_class cl on cl.oid = con.conrelid
                 join pg_namespace n on n.oid = cl.relnamespace
                where con.confrelid = v_tab::regclass and con.contype='f'
              loop
        execute format('alter table %I.%I drop constraint if exists %I',
                       'public', r.child, r.conname);
      end loop;
      execute format('alter table %s alter column %I drop default', v_tab, v_pk);
      execute format('alter table %s alter column %I type uuid using (''00000000-0000-0000-0000-'' || lpad(%I::text,12,''0''))::uuid',
                     v_tab, v_pk, v_pk);
      execute format('alter table %s alter column %I set default gen_random_uuid()', v_tab, v_pk);
    end if;
  end loop;

  -- 2) classes/topics'e referans veren TUM uuid kolonlarini int->uuid cevir
  for r in
      select n.nspname as schem, cl.relname as tab, a.attname as col
        from pg_constraint con
        join pg_class cl on cl.oid = con.conrelid
        join pg_namespace n on n.oid = cl.relnamespace
        join pg_attribute a on a.attrelid = con.conrelid and a.attnum = (con.conkey)[1]
       where con.contype='f'
         and con.confrelid in ('public.classes'::regclass,'public.topics'::regclass,'public.words'::regclass)
         and a.atttypid = 'uuid'::regtype
         and exists (select 1 from pg_attribute x
                      where x.attrelid = con.confrelid and x.attnum = (con.confkey)[1]
                        and x.atttypid <> 'uuid'::regtype)
       order by cl.relname, a.attname
  loop
    v_tab := format('%I.%I', r.schem, r.tab);
    v_col := r.col;
    -- bu kolonu referans alan FK'leri gecici dusur
    for r2 in select (rec).conname, (rec).child from (
                select row(con2.conname, cl2.relname) as rec
                  from pg_constraint con2
                  join pg_class cl2 on cl2.oid = con2.conrelid
                 where con2.confrelid = v_tab::regclass and con2.contype='f'
                   and (con2.conkey)[1] = (select attnum from pg_attribute
                                            where attrelid=v_tab::regclass and attname=v_col)
              ) sub
              loop
      execute format('alter table public.%I drop constraint if exists %I', r2.child, r2.conname);
    end loop;
    execute format('alter table %s alter column %I type uuid using case
                      when %I::text ~ ''^[0-9]+$'' then (''00000000-0000-0000-0000-'' || lpad(%I::text,12,''0''))::uuid
                      else null end',
                   v_tab, v_col, v_col, v_col);
  end loop;
end $$;
-- Eski surumlerden kalmis eksik/bozuk profile kolonlarini tamamla (fonksiyon/policy bunlara bagimli)
-- DIKKAT: Bu statik ALTER'lar profiles tablosundan SONRA calismalidir. Fresh DB'de
-- tablo henuz yokken "relation public.profiles does not exist" hatasi verilmesin
-- diye to_regclass kontrolu ile sarmalanmistir (tablo yoksa A blogu zaten yaratacak).
do $$ begin
  if to_regclass('public.profiles') is null then return; end if;
  alter table public.profiles add column if not exists active boolean not null default true;
  alter table public.profiles add column if not exists perms jsonb not null default '{}';
  alter table public.profiles add column if not exists full_name text not null default '';
end $$;

-- A3) LEVEL TIP MIGRASYONU (int -> CEFR text: A1..C1)  — POLICY'LERDEN ONCE!
-- Panel, Edge Function ve uygulama seviyeyi 'A1'/'B2' gibi METIN kullanir; eski
-- SQL semasi int(1..5) idi. Bu blok mevcut DB'de tip uyumsuzlugunu otomatik
-- cozer: 1->A1, 2->A2, 3->B1, 4->B2, 5->C1. Zaten text ise hicbir sey yapmaz.
do $$ begin
  if to_regclass('public.profiles') is not null and exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='profiles'
         and column_name='level' and udt_name <> 'text') then
    -- ONCE tipi cevir (int -> text); sonra CEFR degerlerini ata.
    -- Sira ters olursa "column is of type integer but expression is
    -- of type text" hatasi uretilir.
    alter table public.profiles alter column level type text using level::text;
    update public.profiles set level = case level
      when '1' then 'A1' when '2' then 'A2' when '3' then 'B1'
      when '4' then 'B2' when '5' then 'C1' else 'A1' end;
    alter table public.profiles alter column level set default 'A1';
  end if;
end $$;
-- NOT: bu DO blogu bilincli olarak "exception when others" ile sarmalanmaz;
-- hata sessizce yutulursa tip migrasyonu yarida kalir ve asagidaki CEFR
-- temizlik/update bloklari int kolon uzerinde calisarak DB'yi bozabilir.

do $$ begin
  if to_regclass('public.words') is not null and exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='words'
         and column_name='level' and udt_name <> 'text') then
    alter table public.words alter column level type text using level::text;
    update public.words set level = case level
      when '1' then 'A1' when '2' then 'A2' when '3' then 'B1'
      when '4' then 'B2' when '5' then 'C1' else 'A1' end;
    alter table public.words alter column level set default 'A1';
  end if;
end $$;

do $$ begin
  if to_regclass('public.topics') is not null and exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='topics'
         and column_name='level' and udt_name <> 'text') then
    alter table public.topics alter column level type text using level::text;
    update public.topics set level = case level
      when '1' then 'A1' when '2' then 'A2' when '3' then 'B1'
      when '4' then 'B2' when '5' then 'C1' else 'A1' end;
    alter table public.topics alter column level set default 'A1';
  end if;
end $$;

-- Seviye sozlugu: siralamayi veritabani tarafinda tek dogru kaynaga bagla
create table if not exists public.level_scale (
  level text primary key check (level in ('A1','A2','B1','B2','C1')),
  rank int not null unique
);
insert into public.level_scale(level, rank) values
  ('A1',1), ('A2',2), ('B1',3), ('B2',4), ('C1',5)
on conflict (level) do update set rank = excluded.rank;

-- CEFR sinir kontrolu + temizlik (tip migrasyonu yukarida tamamlandi)
do $$ begin
  if to_regclass('public.profiles') is not null and exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='profiles'
         and column_name='level' and udt_name = 'text') then
    update public.profiles set level = 'A1'
      where level is null or level not in ('A1','A2','B1','B2','C1');
    alter table public.profiles alter column level set not null;
    alter table public.profiles alter column level set default 'A1';
  end if;
end $$;
do $$ begin
  if to_regclass('public.words') is not null and exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='words'
         and column_name='level' and udt_name = 'text') then
    update public.words set level = 'A1'
      where level is null or level not in ('A1','A2','B1','B2','C1');
    alter table public.words alter column level set not null;
    alter table public.words alter column level set default 'A1';
  end if;
end $$;
do $$ begin
  if to_regclass('public.topics') is not null and exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='topics'
         and column_name='level' and udt_name = 'text') then
    update public.topics set level = 'A1'
      where level is null or level not in ('A1','A2','B1','B2','C1');
    alter table public.topics alter column level set not null;
    alter table public.topics alter column level set default 'A1';
  end if;
end $$;

do $$ begin
  if to_regclass('public.profiles') is not null and not exists (
       select 1 from pg_constraint where conname='profiles_level_check') then
    alter table public.profiles add constraint profiles_level_check
      check (level in ('A1','A2','B1','B2','C1'));
  end if;
  if to_regclass('public.words') is not null and not exists (
       select 1 from pg_constraint where conname='words_level_check') then
    alter table public.words add constraint words_level_check
      check (level in ('A1','A2','B1','B2','C1'));
  end if;
  if to_regclass('public.topics') is not null and not exists (
       select 1 from pg_constraint where conname='topics_level_check') then
    alter table public.topics add constraint topics_level_check
      check (level in ('A1','A2','B1','B2','C1'));
  end if;
end $$;

-- Fresh DB'de profiles henuz yok; tablo var ise eksikleri tamamla (idempotent).
do $$ begin
  if to_regclass('public.profiles') is null then return; end if;
  alter table public.profiles add column if not exists level text not null default 'A1';
  alter table public.profiles add column if not exists must_change_password boolean not null default false;
  alter table public.profiles alter column role set default 'student';
  update public.profiles set active = true where active is null;
  update public.profiles set perms = '{}'::jsonb where perms is null;
end $$;

-- profiles.class_id FK'si: yalnizca her iki kolon da uuid ise ekle (tip uyumsuzsa atla)
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='profiles' and column_name='class_id' and udt_name='uuid')
     and exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='classes' and column_name='id' and udt_name='uuid') then
    alter table public.profiles add constraint profiles_class_fk
      foreign key (class_id) references public.classes(id) on delete set null;
  end if;
exception when duplicate_object then null; when foreign_key_violation then null; when undefined_table then null; when others then null;
end $$;

-- ---------- A) TEMEL TABLOLAR ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text not null default '',
  role text not null default 'student' check (role in ('admin','teacher','student')),
  class_id uuid,
  level text not null default 'A1' check (level in ('A1','A2','B1','B2','C1')),
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
  level text not null default 'A1' check (level in ('A1','A2','B1','B2','C1')),
  example_en text, example_tr text, image_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  level text not null default 'A1' check (level in ('A1','A2','B1','B2','C1')),
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

-- auth.uid() stub: YALNIZCA test/or tam kurulum icin guvenlik agi. Supabase'de bu
-- fonksiyon zaten mevcuttur; buradaki orijinal tanimi EZMEZ cunku ayni imzali
-- mevcut fonksiyona dokunulmaz (asagidaki DO blogu yalnizca eksikse olusturur).
do $stub$ begin
  if to_regnamespace('auth') is null then create schema auth; end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                 where n.nspname='auth' and p.proname='uid') then
    execute $ddl$create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$$ddl$;
  end if;
end $stub$;

-- ---------- C0) ESKI/BOZUK deliver_due_messages TEMIZLIGI ----------
-- Onceki surumlerden (MEVCUT-SUPABASE-ICIN.sql / panel SQL) kalmis, bozuk tipli
-- kolonlara (student_ids int[], class_id integer, audience integer) bagimli eski
-- fonksiyonlar "COALESCE types text and integer cannot be matched" hatasinin KOK
-- nedendir. CREATE OR REPLACE bunlari guncelleyemez; once dusurulmeliler.
-- NOT: Bu blok HICBIR yerde mesajlarin int tipli class_id/student_ids kolonlarini
-- dogrudan referans ALMAZ; aksi halde Supabase'de calistirma aninda ayni hatayi
-- kendisi uretir (42804).
do $$ declare f record;
begin
  for f in select p.oid::regprocedure::text as sig
           from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and p.proname='deliver_due_messages' loop
    execute 'drop function if exists ' || f.sig;
  end loop;
end $$;

-- Eski mesaj tablosu bozuk tipteyse (int class_id / int[] student_ids / int audience)
-- DROP'tan ONCE bu kolonlari sildirmek gerekir; aksi halde drop cascade sirasinda
-- eski fonksiyon/policy derlemesi patlayabilir. Kolon adlari dinamik string ile
-- islenir, boylece bu dosyanin kendisi hicbir calistirmada tip cakismasi uretmez.
do $$ declare c record;
begin
  if to_regclass('public.messages') is null then return; end if;
  for c in
    select column_name from information_schema.columns
    where table_schema='public' and table_name='messages'
      and (
        (column_name in ('class_id','audience') and udt_name <> 'uuid' and data_type <> 'text') or
        (column_name = 'student_ids' and data_type <> 'ARRAY')
      )
  loop
    execute format('alter table public.messages drop column if exists %I', c.column_name);
  end loop;
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
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
  -- 2) Tetikleyici bagimliliklarini kaldir (panel SQL'i tekrar calistirinca yenilerini kurar)
  drop trigger if exists protect_profile on public.profiles;
  for pol in select tgname::text as n, tgrelid::regclass::text as tab from pg_trigger
             where not tgisinternal and tgrelid::regclass::text like 'public.%'
               and tgname like 'audit_%'
  loop
    execute format('drop trigger if exists %I on %s', pol.n, pol.tab);
  end loop;
  drop function if exists public.log_change();
  drop function if exists public.protect_profile();
  -- 3) Simdi guvenle dusur + yeniden olusturulabilir
  foreach f in array array['public.is_staff()','public.is_admin()','public.has_perm(text)',
                           'public.my_class_ids()','public.deliver_due_messages()']
  loop
    execute 'drop function if exists ' || f;
  end loop;
end $$;

-- Panel SQL'iyle ayni tipte mesaj tablolari.
-- DIKKAT: Buradaki DO bloklari messages.audience/class_id/student_ids kolonlarini
-- STATIK SQL'de HIC referans etmez (tip cakismasi olan projelerde bu satirlarin
-- kendisi 42804/42P01 hatasi uretiyordu). Kolon isleri yalnizca dinamik execute
-- string'i icinde, bilgi-sorgusuyla dogrulanarak yapilir. Eski bozuk tablo zaten
-- asagida drop+create ile bastan kuruluyor; burada sadece saglam senaryoda
-- audience text'e cevrilir.
do $$ declare c record;
begin
  if to_regclass('public.messages') is null then return; end if;
  select column_name, data_type into c
    from information_schema.columns
    where table_schema='public' and table_name='messages' and column_name='audience';
  if c.column_name is not null and c.data_type <> 'text' then
    execute 'alter table public.messages alter column audience type text using audience::text';
  end if;
end $$;
-- Eski/bozuk deliver_due_messages + eksik kolonlar: tek ALTER yerine tabloyu
-- guvenli sekilde bastan kur (eski SQL'lerden kalan int tipli audience/class_id/
-- student_ids kolonlari "COALESCE types text and integer cannot be matched" ve
-- "cannot cast type integer[] to uuid[]" hatalarinin KOK nedendir; CREATE OR REPLACE
-- bunlari duzeltemez cunku eski fonksiyon runtime'da patlamaya devam eder).
do $$ begin
  if to_regclass('public.messages') is not null then
    alter table public.messages drop constraint if exists messages_created_by_fkey;
  end if;
end $$;
drop table if exists public.messages cascade;
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  title text not null, body text,
  audience text not null default 'all',   -- all | class:<uuid> | student:<uuid>
  send_at timestamptz, sent boolean not null default false, sent_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Bu dort fonksiyon auth.uid()'e baglidir; Supabase'de auth.uid her zaman vardir.
-- Yarm/eksik kurulumlarda patlamasini onlemek icin her biri kendi exception
-- sarayinda ($fn$ nested quote tag'i ile guvenli).
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
      select coalesce(array_agg(class_id) filter (where class_id is not null), '{}')
      from public.teacher_classes where teacher_id = auth.uid()$fn$$ddl$;
exception when others then raise notice 'my_class_ids atlandi: %', sqlerrm; end $f4$;

-- Planli bildirim dagitimi.
-- NOT: messages tablosunda artik student_ids/class_id KOLONLARI YOK; hedef kitle
-- message_targets (ogrenci bazli) + audience degeriyle ('all'|'class:<uuid>') belirlenir.
-- Kolonlar NITELIKLI referans edilir, boylece eski yarim kurulumlarda kolon varken de
-- derleme hatasi olusmaz.
create or replace function public.deliver_due_messages() returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; r record; sid uuid; ids uuid[]; aud text;
begin
  for r in select id from public.messages
           where sent is not true and send_at <= now() loop
    select coalesce(public.messages.audience::text,'all') into aud
      from public.messages where public.messages.id = r.id;

    ids := '{}'::uuid[];
    if aud = 'all' then
      select array_agg(p.id)::uuid[] into ids from public.profiles p
       where p.role = 'student' and p.active;
    elsif aud like 'class:%' then
      select array_agg(p.id)::uuid[] into ids from public.profiles p
       where p.role = 'student' and p.active and p.class_id =
             (split_part(aud, ':', 2))::uuid;
    end if;
    -- dogrudan hedeflenen ogrenciler (her audience'da eklenir)
    ids := coalesce(ids,'{}') || coalesce((
      select array_agg(t.student_id)::uuid[] from public.message_targets t
       where t.message_id = r.id), '{}'::uuid[]);

    -- distinct al, bos dizide FOREACH null donmesin (COALESCE ile guvence)
    ids := coalesce((select array_agg(distinct x)::uuid[] from (select unnest(ids) as x) u), '{}'::uuid[]);
    foreach sid in array ids loop
      insert into public.notifications (student_id, title, body, message_id)
      select sid, m.title, m.body, m.id from public.messages m where m.id = r.id
        and not exists (select 1 from public.notifications x
          where x.message_id = r.id and x.student_id = sid);
      n := n + 1;
    end loop;
    update public.messages set sent = true, sent_at = now() where id = r.id;
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
-- Seviye siralamasi public.level_scale.rank'ten alinir (CEFR text: A1..C1)
drop policy if exists read_words on public.words;
create policy read_words on public.words for select to authenticated
  using (public.is_staff() or exists (
    select 1 from public.level_scale wl, public.level_scale sl
    where wl.level = words.level and sl.level = coalesce(
      nullif((select level from public.profiles where id = auth.uid()), ''), 'A1')
      and wl.rank <= sl.rank));
drop policy if exists staff_write_words on public.words;
create policy staff_write_words on public.words for all to authenticated
  using (public.has_perm('words.manage')) with check (public.has_perm('words.manage'));

drop policy if exists read_topics on public.topics;
create policy read_topics on public.topics for select to authenticated
  using (public.is_staff()
    or exists (select 1 from public.topic_access a where a.topic_id=topics.id and a.student_id=auth.uid())
    or exists (
      select 1 from public.level_scale wl, public.level_scale sl
      where wl.level = topics.level and sl.level = coalesce(
        nullif((select level from public.profiles where id = auth.uid()), ''), 'A1')
        and wl.rank <= sl.rank));
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
alter table public.topics add column if not exists sort_order int not null default 0; -- eski DB'lerde eksik olabilir
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


-- ---------- H2) TEST YARDIMCISI: admin_create_user ----------
-- SQL Editor'de hizli test icin (asil hesap acma isleri Edge Function 'admin-users' ile yapilir).
-- Bu fonksiyon auth.users tablosuna DOGRUDEN yazamaz; audit_log'a test kaydi birakir ki
-- SQL Editor'de "select public.admin_create_user(...)" seklindeki kontroller hata vermesin.
drop function if exists public.admin_create_user(text, text, text, uuid);
create or replace function public.admin_create_user(
  p_email text, p_password text default null, p_role text default 'student', p_class_id uuid default null)
returns text language plpgsql security definer set search_path = public as $$
begin
  if p_role not in ('admin','teacher','student') then
    return 'HATA: role admin/teacher/student olmali';
  end if;
  insert into audit_log(action, table_name, detail)
    values ('SQL_TEST:create_user', 'auth.users',
            jsonb_build_object('email', p_email, 'role', p_role, 'class_id', p_class_id));
  return 'OK: admin_create_user calisti; test kaydi audit_log tablosuna yazildi. Gercek hesap acmak icin paneli veya Edge Function kullandin.';
end $$;
revoke all on function public.admin_create_user(text, text, text, uuid) from public;
grant execute on function public.admin_create_user(text, text, text, uuid) to anon, authenticated;

-- ---------- I) DOGRULAMA (sadece SELECT — hata vermez) ----------
select 'tablolar'   as kontrol, count(*)::text as deger from information_schema.tables
  where table_schema='public' and table_name in
  ('profiles','classes','words','topics','subtopics','questions','topic_access',
   'homework','homework_targets','homework_submissions','topic_complete','topic_pass',
   'subtopic_done','words_learned','daily_words','test_attempts','messages',
   'message_targets','notifications','lessons','lesson_students','attendance_sessions',
   'attendance_records','teacher_classes','app_settings','audit_log','help_requests')
union all
select 'rls_acik', count(*)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relrowsecurity
union all
select 'policy_sayisi', count(*)::text from pg_policies where schemaname='public'
union all
select 'realtime_tablo', count(*)::text from pg_publication_tables where pubname='supabase_realtime';
-- Beklenen: tablolar=27, rls_acik>=26, policy_sayisi>=45, realtime_tablo=7
