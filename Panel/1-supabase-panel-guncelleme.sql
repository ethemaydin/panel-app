-- =====================================================================
-- English Base - Panel güncellemesi (DÜZELTİLMİŞ SÜRÜM, tek parça)
-- ÖNCE 'supabase-kurulum.sql' çalıştırılmış olmalı.
-- Supabase > SQL Editor > New query > hepsini yapıştır > Run (TEK SEFERDE).
-- Tekrar çalıştırmak güvenlidir.
-- =====================================================================

-- ---------- 0) ÖN KONTROL ----------
do $$ begin
  if not exists (select 1 from pg_tables where schemaname='public' and tablename='profiles') then
    raise exception 'public.profiles tablosu bulunamadı. ONCE supabase-kurulum.sql dosyasını çalıştırın.';
  end if;
  if not exists (select 1 from pg_tables where schemaname='public' and tablename='classes') then
    raise exception 'public.classes tablosu bulunamadı. ONCE supabase-kurulum.sql dosyasını çalıştırın.';
  end if;
end $$;

-- ---------- 1) YENİ ALANLAR VE TABLOLAR ----------
alter table public.profiles add column if not exists class_id uuid references public.classes(id) on delete set null;
alter table public.profiles add column if not exists level text not null default 'A1';
alter table public.profiles add column if not exists active boolean not null default true;
alter table public.profiles add column if not exists must_change_password boolean not null default false;
alter table public.profiles add column if not exists perms jsonb not null default '{}';
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();

-- Eski kurulumda profiles.level sayısal (integer) olabilir; 'A1','A2'... metnine çevrilir.
-- Eşleme: 1=A1, 2=A2, 3=B1, 4=B2, 5=C1, 6=C2, diğer/boş=A1
do $$
declare dt text; c record;
begin
  select data_type into dt from information_schema.columns
   where table_schema='public' and table_name='profiles' and column_name='level';
  if dt in ('integer','smallint','bigint','numeric') then
    for c in select conname from pg_constraint
             where conrelid = 'public.profiles'::regclass and contype = 'c'
               and pg_get_constraintdef(oid) ilike '%level%'
    loop
      execute format('alter table public.profiles drop constraint %I', c.conname);
    end loop;
    alter table public.profiles alter column level drop default;
    alter table public.profiles alter column level type text using (
      case level::int when 1 then 'A1' when 2 then 'A2' when 3 then 'B1'
                      when 4 then 'B2' when 5 then 'C1' when 6 then 'C2' else 'A1' end);
    update public.profiles set level = 'A1' where level is null;
    alter table public.profiles alter column level set default 'A1';
    alter table public.profiles alter column level set not null;
  end if;
end $$;

-- Yardımcı tablolar (yoksa oluşturulur, varsa eksik sütunlar eklenir)
create table if not exists public.teacher_classes (
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  class_id   uuid not null references public.classes(id) on delete cascade,
  primary key (teacher_id, class_id)
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now()
);
alter table public.audit_log add column if not exists at timestamptz not null default now();
alter table public.audit_log add column if not exists actor uuid;
alter table public.audit_log add column if not exists actor_name text;
alter table public.audit_log add column if not exists action text;
alter table public.audit_log add column if not exists table_name text;
alter table public.audit_log add column if not exists row_id text;
alter table public.audit_log add column if not exists detail jsonb;

create table if not exists public.help_requests (
  id uuid primary key default gen_random_uuid(),
  email text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
alter table public.help_requests add column if not exists email text;
alter table public.help_requests add column if not exists status text not null default 'open';
alter table public.help_requests add column if not exists created_at timestamptz not null default now();
alter table public.help_requests add column if not exists resolved_at timestamptz;
alter table public.help_requests add column if not exists resolved_by uuid;

-- Planlı bildirimler için gerekli sütunlar (tablo varsa)
do $$ begin
  if to_regclass('public.messages') is not null then
    alter table public.messages add column if not exists sent boolean not null default false;
    alter table public.messages add column if not exists sent_at timestamptz;
    alter table public.messages add column if not exists send_at timestamptz not null default now();
  end if;
  if to_regclass('public.notifications') is not null then
    alter table public.notifications add column if not exists message_id uuid;
  end if;
end $$;

-- E-posta normalizasyonu
create or replace function public.norm_email(e text) returns text
language sql immutable as $$ select lower(btrim(coalesce(e,''))) $$;

-- auth.users oluşunca profiles satırı otomatik açılsın
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role, class_id, level, active, must_change_password, perms)
  values (
    new.id,
    public.norm_email(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(nullif(new.raw_user_meta_data->>'role',''), 'student'),
    nullif(new.raw_user_meta_data->>'class_id','')::uuid,
    coalesce(nullif(new.raw_user_meta_data->>'level',''), 'A1'),
    true,
    coalesce(nullif(new.raw_user_meta_data->>'must_change_password','')::boolean, false),
    '{}'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = case when public.profiles.full_name = '' then excluded.full_name else public.profiles.full_name end;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.norm_profile_email() returns trigger
language plpgsql as $$ begin
  if new.email is not null then new.email := public.norm_email(new.email); end if;
  return new;
end $$;
drop trigger if exists profile_email_norm on public.profiles;
create trigger profile_email_norm before insert or update of email on public.profiles
  for each row execute function public.norm_profile_email();

-- ---------- 2) YETKİ FONKSİYONLARI ----------
-- Dönüş tipi değişmiş olabilecek eski fonksiyonlar önce silinir (yetkiler aşağıda yeniden verilir)
drop function if exists public.deliver_due_messages();
drop function if exists public.request_password_reset(text);
drop function if exists public.resolve_help_request(uuid);
drop function if exists public.stats_students();
drop function if exists public.stats_teachers();

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

-- Admin her şeyi yapar. Öğretmen sadece panelde işaretlenen yetkileri kullanır.
create or replace function public.has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
    where id = auth.uid() and active
      and (role = 'admin' or (role = 'teacher' and coalesce((perms->>p)::boolean, false))))
$$;

-- Öğretmen bu sınıfa erişebilir mi? (admin / 'all_classes' yetkisi / atandığı sınıflar)
create or replace function public.teaches(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select cid is not null and exists (select 1 from public.profiles me
    where me.id = auth.uid() and me.active
      and (me.role = 'admin'
           or (me.role = 'teacher' and (coalesce((me.perms->>'all_classes')::boolean, false)
                or exists (select 1 from public.teacher_classes tc where tc.teacher_id = me.id and tc.class_id = cid)))))
$$;

create or replace function public.student_in_scope(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles s
    where s.id = sid and s.role = 'student'
      and ((s.class_id is null and public.has_perm('all_classes')) or public.teaches(s.class_id)))
$$;

-- Yoklama oturumunun kapsamı: oturumun sınıf sütunu yok, ders öğrencileri üzerinden hesaplanır
create or replace function public.lesson_in_scope(lid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select lid is not null and (
    public.is_admin()
    or exists (select 1 from public.lesson_students ls
               where ls.lesson_id = lid and public.student_in_scope(ls.student_id))
  )
$$;

-- Planlı bildirimleri zamanı gelince öğrencilere dağıtır.
-- pg_cron açıksa: select cron.schedule('deliver-messages','* * * * *','select public.deliver_due_messages()');
create or replace function public.deliver_due_messages() returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; r record;
begin
  for r in select id from public.messages
           where sent is not true and send_at <= now() loop
    insert into public.notifications (student_id, title, body, message_id)
      select t.student_id, m.title, m.body, m.id
      from public.messages m join public.message_targets t on t.message_id = m.id
      where m.id = r.id
        and not exists (select 1 from public.notifications x
                        where x.message_id = m.id and x.student_id = t.student_id);
    n := n + 1;
  end loop;
  update public.messages set sent = true, sent_at = now()
   where sent is not true and send_at <= now();
  return n;
end $$;

-- Şifre sıfırlama talebi (anonim): e-posta normalize edilir, 5 dk spam koruması
create or replace function public.request_password_reset(p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare em text := public.norm_email(p_email);
begin
  if em = '' or position('@' in em) = 0 then
    raise exception 'Geçerli bir e-posta yaz';
  end if;
  if exists (select 1 from public.help_requests h
              where h.email = em and h.status = 'open' and h.created_at > now() - interval '5 minutes') then
    return;
  end if;
  insert into public.help_requests (email) values (em);
end $$;

-- Talebi kapatma (yalnızca yönetici)
create or replace function public.resolve_help_request(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  update public.help_requests
     set status = 'resolved', resolved_at = now(), resolved_by = auth.uid()
   where id = p_id and status = 'open';
end $$;

-- Execute yetkileri: önce hepsini kapat, sonra gerekenleri aç
revoke all on function public.request_password_reset(text) from public, anon, authenticated;
revoke all on function public.resolve_help_request(uuid) from public, anon, authenticated;
revoke all on function public.deliver_due_messages() from public, anon, authenticated;
revoke all on function public.lesson_in_scope(uuid) from public, anon, authenticated;
grant execute on function public.request_password_reset(text) to anon, authenticated;
grant execute on function public.resolve_help_request(uuid) to authenticated;
grant execute on function public.deliver_due_messages() to authenticated;
grant execute on function public.lesson_in_scope(uuid) to authenticated;

-- ---------- 3) PROFİL KORUMASI ----------
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Silme: bu tetikleyici engellemez (yetkiyi RLS belirler). NULL döndürmek silmeyi iptal ederdi.
  if TG_OP = 'DELETE' then return old; end if;
  if auth.uid() is null then return new; end if;                  -- service role / cron: serbest
  if public.is_admin() then return new; end if;
  if new.id is distinct from old.id or new.role is distinct from old.role
     or new.perms is distinct from old.perms then
    raise exception 'Rol ve yetkileri sadece yönetici değiştirebilir';
  end if;
  if public.is_staff() and old.id <> auth.uid() and old.role = 'student' then
    if new.active is distinct from old.active and not public.has_perm('students.deactivate') then
      raise exception 'Öğrenciyi pasife alma yetkin yok'; end if;
    if new.class_id is distinct from old.class_id then
      if not public.has_perm('students.move') then raise exception 'Öğrenciyi sınıf değiştirme yetkin yok'; end if;
      if new.class_id is not null and not public.teaches(new.class_id) then
        raise exception 'Bu sınıfa öğrenci taşıma yetkin yok'; end if;
    end if;
    if (new.full_name is distinct from old.full_name or new.level is distinct from old.level
        or new.email is distinct from old.email
        or new.must_change_password is distinct from old.must_change_password)
       and not public.has_perm('students.edit') then
      raise exception 'Öğrenci bilgisi düzenleme yetkin yok'; end if;
    return new;
  end if;
  -- kendi profilini düzenleyen herkes
  if new.class_id is distinct from old.class_id or new.level is distinct from old.level
     or new.active is distinct from old.active or new.email is distinct from old.email then
    raise exception 'Bu alanları değiştiremezsin';
  end if;
  if coalesce(new.must_change_password,false) and not coalesce(old.must_change_password,false) then
    raise exception 'Bu alan değiştirilemez'; end if;
  return new;
end $$;

drop trigger if exists profile_protect on public.profiles;
create trigger profile_protect before update or delete on public.profiles
  for each row execute function public.protect_profile();

-- ---------- 4) GÜVENLİK KURALLARI (RLS) ----------
-- Eski "staff_all" kuralları kaldırılır (olmayan tablolar atlanır)
do $$
declare t text;
begin
  foreach t in array array['classes','topics','subtopics','topic_access','questions','words',
    'homework','homework_targets','homework_submissions','lessons','lesson_students',
    'attendance_sessions','attendance_records','messages','message_targets','notifications']
  loop
    continue when to_regclass('public.'||t) is null;
    execute format('drop policy if exists staff_all on public.%I', t);
  end loop;
end $$;

-- A) Genel içerik: öğretmenler okur, yazma yetkiye bağlı
do $$
declare r record;
begin
  for r in select * from (values
    ('classes','classes.manage'),
    ('topics','topics.manage'), ('subtopics','topics.manage'), ('questions','topics.manage'),
    ('words','words.manage'),
    ('homework','homework.manage'), ('lessons','lessons.manage'), ('messages','messages.send')
  ) as v(tbl, perm) loop
    continue when to_regclass('public.'||r.tbl) is null;
    execute format('drop policy if exists staff_read on public.%I', r.tbl);
    execute format('drop policy if exists staff_ins on public.%I', r.tbl);
    execute format('drop policy if exists staff_upd on public.%I', r.tbl);
    execute format('drop policy if exists staff_del on public.%I', r.tbl);
    execute format('create policy staff_read on public.%I for select to authenticated using (public.is_staff())', r.tbl);
    execute format('create policy staff_ins on public.%I for insert to authenticated with check (public.has_perm(%L))', r.tbl, r.perm);
    execute format('create policy staff_upd on public.%I for update to authenticated using (public.has_perm(%L)) with check (public.has_perm(%L))', r.tbl, r.perm, r.perm);
    execute format('create policy staff_del on public.%I for delete to authenticated using (public.has_perm(%L))', r.tbl, r.perm);
  end loop;
end $$;

-- B) Öğrenciye bağlı tablolar: yetki + sınıf kapsamı (student_id sütunu olmayan tablo atlanır)
do $$
declare r record;
begin
  for r in select * from (values
    ('topic_access','topics.manage'), ('homework_targets','homework.manage'),
    ('lesson_students','lessons.manage'), ('message_targets','messages.send'),
    ('attendance_records','attendance.take')
  ) as v(tbl, perm) loop
    continue when to_regclass('public.'||r.tbl) is null;
    if not exists (select 1 from information_schema.columns
                   where table_schema='public' and table_name=r.tbl and column_name='student_id') then
      raise notice 'Atlandı (student_id sütunu yok): %', r.tbl;
      continue;
    end if;
    execute format('drop policy if exists staff_read on public.%I', r.tbl);
    execute format('drop policy if exists staff_ins on public.%I', r.tbl);
    execute format('drop policy if exists staff_upd on public.%I', r.tbl);
    execute format('drop policy if exists staff_del on public.%I', r.tbl);
    execute format('create policy staff_read on public.%I for select to authenticated using (public.is_staff() and (public.is_admin() or public.student_in_scope(student_id)))', r.tbl);
    execute format('create policy staff_ins on public.%I for insert to authenticated with check (public.has_perm(%L) and public.student_in_scope(student_id))', r.tbl, r.perm);
    execute format('create policy staff_upd on public.%I for update to authenticated using (public.has_perm(%L) and public.student_in_scope(student_id)) with check (public.has_perm(%L) and public.student_in_scope(student_id))', r.tbl, r.perm, r.perm);
    execute format('create policy staff_del on public.%I for delete to authenticated using (public.has_perm(%L) and public.student_in_scope(student_id))', r.tbl, r.perm);
  end loop;
end $$;

-- C) Yoklama oturumları: kapsam dersin öğrencileri üzerinden (tabloda class_id YOK)
drop policy if exists staff_read on public.attendance_sessions;
drop policy if exists staff_ins on public.attendance_sessions;
drop policy if exists staff_upd on public.attendance_sessions;
drop policy if exists staff_del on public.attendance_sessions;
create policy staff_read on public.attendance_sessions for select to authenticated
  using (public.is_staff() and public.lesson_in_scope(lesson_id));
create policy staff_ins on public.attendance_sessions for insert to authenticated
  with check (public.has_perm('attendance.take') and public.lesson_in_scope(lesson_id));
create policy staff_upd on public.attendance_sessions for update to authenticated
  using (public.has_perm('attendance.take') and public.lesson_in_scope(lesson_id))
  with check (public.has_perm('attendance.take') and public.lesson_in_scope(lesson_id));
create policy staff_del on public.attendance_sessions for delete to authenticated
  using (public.has_perm('attendance.take') and public.lesson_in_scope(lesson_id));

-- D) Ödev cevapları ve bildirimler: sadece okuma
drop policy if exists staff_read on public.homework_submissions;
create policy staff_read on public.homework_submissions for select to authenticated
  using (public.has_perm('homework.manage') and public.student_in_scope(student_id));
drop policy if exists staff_read on public.notifications;
create policy staff_read on public.notifications for select to authenticated
  using (public.has_perm('messages.send') and public.student_in_scope(student_id));

-- E) İlerleme tabloları: istatistik yetkisi + sınıf kapsamı (olmayan tablo / sütun atlanır)
do $$
declare t text;
begin
  foreach t in array array['subtopic_done','topic_pass','topic_complete','test_attempts',
    'words_learned','daily_words','puzzle_state','puzzles_done']
  loop
    continue when to_regclass('public.'||t) is null;
    continue when not exists (select 1 from information_schema.columns
                   where table_schema='public' and table_name=t and column_name='student_id');
    execute format('drop policy if exists staff_read on public.%I', t);
    execute format('create policy staff_read on public.%I for select to authenticated using (public.has_perm(%L) and public.student_in_scope(student_id))', t, 'stats.view');
  end loop;
end $$;

-- F) Profiller
drop policy if exists profiles_read on public.profiles;
drop policy if exists profiles_staff_all on public.profiles;
drop policy if exists profiles_admin_all on public.profiles;
drop policy if exists profiles_staff_upd on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin()
         or (role = 'student' and public.has_perm('students.view')
             and ((class_id is null and public.has_perm('all_classes')) or public.teaches(class_id))));
create policy profiles_admin_all on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy profiles_staff_upd on public.profiles for update to authenticated
  using (role = 'student' and public.is_staff()
         and ((class_id is null and public.has_perm('all_classes')) or public.teaches(class_id)))
  with check (role = 'student' and public.is_staff()
         and ((class_id is null and public.has_perm('all_classes')) or public.teaches(class_id)));

-- G) Öğretmen-sınıf atamaları: sadece admin yazar, öğretmen kendininkini okur
alter table public.teacher_classes enable row level security;
drop policy if exists admin_all on public.teacher_classes;
drop policy if exists own_read on public.teacher_classes;
create policy admin_all on public.teacher_classes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy own_read on public.teacher_classes for select to authenticated
  using (teacher_id = auth.uid());

-- H) Ayarlar: herkes okur, sadece admin yazar
alter table public.app_settings enable row level security;
drop policy if exists settings_read on public.app_settings;
drop policy if exists settings_admin on public.app_settings;
create policy settings_read on public.app_settings for select to anon, authenticated using (true);
create policy settings_admin on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- I) İşlem kaydı: sadece admin okur, doğrudan yazma yok
alter table public.audit_log enable row level security;
drop policy if exists audit_admin_read on public.audit_log;
create policy audit_admin_read on public.audit_log for select to authenticated
  using (public.is_admin());

-- J) Yardım talepleri: sadece admin görür (yazma anonim fonksiyon üzerinden)
alter table public.help_requests enable row level security;
drop policy if exists help_admin_all on public.help_requests;
create policy help_admin_all on public.help_requests for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- 5) İŞLEM KAYDI (kim ne yaptı) ----------
create or replace function public.log_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare rec jsonb; nm text;
begin
  if auth.uid() is null then return null; end if;
  if TG_TABLE_NAME = 'profiles' and not public.is_staff() then return null; end if;
  rec := case when TG_OP = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  select full_name into nm from public.profiles where id = auth.uid();
  insert into public.audit_log (actor, actor_name, action, table_name, row_id, detail)
  values (auth.uid(), nm, TG_OP, TG_TABLE_NAME, coalesce(rec->>'id', ''), rec);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['classes','profiles','topics','subtopics','questions','words','homework',
    'lessons','attendance_sessions','attendance_records','messages','teacher_classes','app_settings',
    'topic_access','homework_targets','lesson_students','message_targets']
  loop
    continue when to_regclass('public.'||t) is null;
    execute format('drop trigger if exists audit_%s on public.%I', t, t);
    execute format('create trigger audit_%s after insert or update or delete on public.%I for each row execute function public.log_change()', t, t);
  end loop;
end $$;

-- ---------- 6) İSTATİSTİK FONKSİYONLARI ----------
create or replace function public.stats_students()
returns table (id uuid, full_name text, email text, class_id uuid, class_name text, active boolean,
               registered_at timestamptz, last_login timestamptz, topics_done bigint, topics_total bigint,
               words_learned bigint, tests_taken bigint, puzzles bigint, hw_done bigint, hw_total bigint,
               attendance_pct numeric, level text, must_change_password boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name::text, p.email::text, p.class_id, c.name::text, p.active,
    p.created_at, u.last_sign_in_at,
    (select count(*) from public.topic_complete x where x.student_id = p.id),
    (select count(*) from public.topic_access a where a.student_id = p.id),
    (select count(*) from public.words_learned w where w.student_id = p.id),
    (select count(*) from public.test_attempts t where t.student_id = p.id),
    (select count(*) from public.puzzles_done d where d.student_id = p.id),
    (select count(*) from public.homework_submissions s where s.student_id = p.id
        and s.submitted_at is not null),
    (select count(*) from public.homework_targets h where h.student_id = p.id),
    -- Yoklama: oturumlardaki present/absent dizilerinden hesaplanır
    (select round(100.0 * count(*) filter (where p.id::text = any(s.present::text[]))
                  / nullif(count(*), 0), 0)
        from public.attendance_sessions s
        where p.id::text = any(s.present::text[]) or p.id::text = any(s.absent::text[])),
    coalesce(p.level, 'A1')::text,
    coalesce(p.must_change_password, false)
  from public.profiles p
  left join public.classes c on c.id = p.class_id
  left join auth.users u on u.id = p.id
  where public.has_perm('stats.view')
    and p.role = 'student'
    and (public.is_admin() or public.has_perm('all_classes')
         or (p.class_id is not null
             and exists (select 1 from public.teacher_classes ts
                         where ts.teacher_id = auth.uid() and ts.class_id = p.class_id)))
$$;

create or replace function public.stats_teachers()
returns table (id uuid, full_name text, email text, role text, active boolean, created_at timestamptz,
               last_login timestamptz, actions_30d bigint, last_action timestamptz, classes text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name::text, p.email::text, p.role::text, p.active, p.created_at, u.last_sign_in_at,
    (select count(*) from public.audit_log a where a.actor = p.id and a.at > now() - interval '30 days'),
    (select max(a.at) from public.audit_log a where a.actor = p.id),
    (select string_agg(c.name::text, ', ') from public.teacher_classes tc
        join public.classes c on c.id = tc.class_id where tc.teacher_id = p.id)
  from public.profiles p left join auth.users u on u.id = p.id
  where p.role in ('admin', 'teacher') and public.is_admin()
$$;

revoke all on function public.has_perm(text) from public, anon;
revoke all on function public.teaches(uuid) from public, anon;
revoke all on function public.student_in_scope(uuid) from public, anon;
revoke all on function public.stats_students() from public, anon;
revoke all on function public.stats_teachers() from public, anon;
grant execute on function public.has_perm(text) to authenticated;
grant execute on function public.teaches(uuid) to authenticated;
grant execute on function public.student_in_scope(uuid) to authenticated;
grant execute on function public.stats_students() to authenticated;
grant execute on function public.stats_teachers() to authenticated;

-- ---------- 7) VARSAYILAN UYGULAMA AYARLARI ----------
insert into public.app_settings (key, value) values
  ('app_name', to_jsonb('English Base'::text)),
  ('primary_color', to_jsonb('#D80621'::text)),
  ('background_color', to_jsonb('#FFF4F5'::text)),
  ('text_color', to_jsonb('#25151A'::text)),
  ('logo_url', to_jsonb(''::text)),
  ('welcome_text', to_jsonb(''::text)),
  ('word_goal_min', to_jsonb(5)),
  ('word_goal_max', to_jsonb(30)),
  ('pass_mark', to_jsonb(60)),
  ('maintenance_message', to_jsonb(''::text)),
  ('custom_css', to_jsonb(''::text))
on conflict (key) do nothing;

-- =====================================================================
-- BİTTİ.
-- =====================================================================
