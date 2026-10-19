-- =====================================================================
-- English Base - Panel güncellemesi (yetkiler, işlem kaydı, ayarlar, istatistik)
-- ÖNCE 'supabase-kurulum.sql' çalıştırılmış olmalı.
-- Supabase > SQL Editor > New query > hepsini yapıştır > Run.
-- Tekrar çalıştırmak güvenlidir.
-- =====================================================================

-- ---------- 1) YENİ ALANLAR VE TABLOLAR ----------
alter table public.profiles add column if not exists perms jsonb not null default '{}';

create table if not exists public.teacher_classes (
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  primary key (teacher_id, class_id)
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default 'null',
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor uuid,
  actor_name text,
  action text not null,
  table_name text not null,
  row_id text,
  detail jsonb
);
create index if not exists idx_audit_at on public.audit_log(at desc);
create index if not exists idx_audit_actor on public.audit_log(actor, at desc);

-- ---------- 2) YETKİ FONKSİYONLARI ----------
-- Yardımcılar (kurulum dosyasında varsa tekrar oluşturulmaz, yoksa panel tek başına da çalışır)
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

-- Planlı bildirimleri zamanı gelince öğrencilere dağıtır.
-- Supabase > Database > Extensions > pg_cron açıksa:
--   select cron.schedule('deliver-messages','* * * * *','select public.deliver_due_messages()');
-- Kapalıysa panel "Bildirimler" sayfasını açtığında çalışır.
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
    update public.messages set sent = true, sent_at = now() where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Yönetici (admin) her şeyi yapar. Öğretmen sadece panelde işaretlenen yetkileri kullanır.
create or replace function public.has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
    where id = auth.uid() and active
      and (role = 'admin' or (role = 'teacher' and coalesce((perms->>p)::boolean, false))))
$$;

-- Öğretmen bu sınıfa erişebilir mi? (admin: evet, 'all_classes' yetkisi: evet, yoksa atandığı sınıflar)
create or replace function public.teaches(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles me
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

-- ---------- 3) PROFİL KORUMASI (v2) ----------
-- Admin: serbest. Öğretmen: sadece öğrencileri ve sadece yetkisi olan alanları değiştirebilir.
-- Öğrenci/öğretmen kendi rolünü, yetkisini, sınıfını vs. değiştiremez.
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if new.id <> old.id or new.role <> old.role or new.perms <> old.perms then
    raise exception 'Rol ve yetkileri sadece yönetici değiştirebilir';
  end if;
  if public.is_staff() and old.id <> auth.uid() and old.role = 'student' then
    if new.active <> old.active and not public.has_perm('students.deactivate') then
      raise exception 'Öğrenciyi pasife alma yetkin yok'; end if;
    if new.class_id is distinct from old.class_id then
      if not public.has_perm('students.move') then raise exception 'Öğrenciyi sınıf değiştirme yetkin yok'; end if;
      if new.class_id is not null and not public.teaches(new.class_id) then
        raise exception 'Bu sınıfa öğrenci taşıma yetkin yok'; end if;
    end if;
    if (new.full_name <> old.full_name or new.level <> old.level or new.email is distinct from old.email
        or new.must_change_password is distinct from old.must_change_password)
       and not public.has_perm('students.edit') then
      raise exception 'Öğrenci bilgisi düzenleme yetkin yok'; end if;
    return new;
  end if;
  -- kendi profilini düzenleyen herkes
  if new.class_id is distinct from old.class_id or new.level <> old.level
     or new.active <> old.active or new.email is distinct from old.email then
    raise exception 'Bu alanları değiştiremezsin';
  end if;
  if new.must_change_password and not old.must_change_password then
    raise exception 'Bu alan değiştirilemez'; end if;
  return new;
end $$;

-- ---------- 4) GÜVENLİK KURALLARI (RLS) YENİDEN ----------
-- Eski "öğretmen her şeyi yapar" kuralı kaldırılıp yetkiye bağlı kurallar konuyor.
do $$
declare t text;
begin
  foreach t in array array['classes','topics','subtopics','topic_access','questions','words',
    'homework','homework_targets','homework_submissions','lessons','lesson_students',
    'attendance_sessions','attendance_records','messages','message_targets','notifications']
  loop
    execute format('drop policy if exists staff_all on public.%I', t);
  end loop;
end $$;

-- A) Genel içerik: herkes (öğretmen) okur, yazma yetkiye bağlı
do $$
declare r record;
begin
  for r in select * from (values
    ('classes','classes.manage'),
    ('topics','topics.manage'), ('subtopics','topics.manage'), ('questions','topics.manage'),
    ('words','words.manage'),
    ('homework','homework.manage'), ('lessons','lessons.manage'), ('messages','messages.send')
  ) as v(tbl, perm) loop
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

-- B) Öğrenciye bağlı tablolar: yetki + öğretmenin sınıf kapsamı
do $$
declare r record;
begin
  for r in select * from (values
    ('topic_access','topics.manage'), ('homework_targets','homework.manage'),
    ('lesson_students','lessons.manage'), ('message_targets','messages.send'),
    ('attendance_records','attendance.take')
  ) as v(tbl, perm) loop
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

-- C) Yoklama oturumları: sınıf kapsamı
drop policy if exists staff_read on public.attendance_sessions;
drop policy if exists staff_ins on public.attendance_sessions;
drop policy if exists staff_upd on public.attendance_sessions;
drop policy if exists staff_del on public.attendance_sessions;
create policy staff_read on public.attendance_sessions for select to authenticated
  using (public.is_staff() and public.teaches(class_id));
create policy staff_ins on public.attendance_sessions for insert to authenticated
  with check (public.has_perm('attendance.take') and public.teaches(class_id));
create policy staff_upd on public.attendance_sessions for update to authenticated
  using (public.has_perm('attendance.take') and public.teaches(class_id))
  with check (public.has_perm('attendance.take') and public.teaches(class_id));
create policy staff_del on public.attendance_sessions for delete to authenticated
  using (public.has_perm('attendance.take') and public.teaches(class_id));

-- D) Ödev cevapları ve bildirimler: sadece okuma
drop policy if exists staff_read on public.homework_submissions;
create policy staff_read on public.homework_submissions for select to authenticated
  using (public.has_perm('homework.manage') and public.student_in_scope(student_id));
drop policy if exists staff_read on public.notifications;
create policy staff_read on public.notifications for select to authenticated
  using (public.has_perm('messages.send') and public.student_in_scope(student_id));

-- E) İlerleme tabloları: istatistik yetkisi + sınıf kapsamı
do $$
declare t text;
begin
  foreach t in array array['subtopic_done','topic_pass','topic_complete','test_attempts',
    'words_learned','daily_words','puzzle_state','puzzles_done']
  loop
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

-- H) Ayarlar: herkes okur (uygulama tasarımı), sadece admin yazar
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

-- ---------- 5) İŞLEM KAYDI (kim ne yaptı) ----------
create or replace function public.log_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare rec jsonb; nm text;
begin
  if auth.uid() is null then return null; end if;               -- sunucu işlemleri kendi kaydını yazar
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
    execute format('drop trigger if exists audit_%s on public.%I', t, t);
    execute format('create trigger audit_%s after insert or update or delete on public.%I for each row execute function public.log_change()', t, t);
  end loop;
end $$;

-- ---------- 6) İSTATİSTİK FONKSİYONLARI ----------
create or replace function public.stats_students()
returns table (id uuid, full_name text, email text, class_id uuid, class_name text, level text, active boolean,
               registered_at timestamptz, last_login timestamptz, topics_done bigint, topics_total bigint,
               words_learned bigint, tests_taken bigint, puzzles bigint, hw_done bigint, hw_total bigint,
               attendance_pct numeric)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.email, p.class_id, c.name, p.level, p.active, p.created_at, u.last_sign_in_at,
    (select count(*) from public.topic_complete x where x.student_id = p.id),
    (select count(*) from public.topic_access a where a.student_id = p.id),
    (select count(*) from public.words_learned w where w.student_id = p.id),
    (select count(*) from public.test_attempts t where t.student_id = p.id),
    (select count(*) from public.puzzles_done d where d.student_id = p.id),
    (select count(*) from public.homework_submissions s where s.student_id = p.id
        and (s.score is not null or coalesce(s.text_answer, '') <> '')),
    (select count(*) from public.homework_targets h where h.student_id = p.id),
    (select round(100.0 * count(*) filter (where r.status <> 'y') / nullif(count(*), 0), 0)
        from public.attendance_records r where r.student_id = p.id)
  from public.profiles p
  left join public.classes c on c.id = p.class_id
  left join auth.users u on u.id = p.id
  where p.role = 'student' and public.has_perm('stats.view')
    and ((p.class_id is null and public.has_perm('all_classes')) or public.teaches(p.class_id))
$$;

create or replace function public.stats_teachers()
returns table (id uuid, full_name text, email text, role text, active boolean, created_at timestamptz,
               last_login timestamptz, actions_30d bigint, last_action timestamptz, classes text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.email, p.role, p.active, p.created_at, u.last_sign_in_at,
    (select count(*) from public.audit_log a where a.actor = p.id and a.at > now() - interval '30 days'),
    (select max(a.at) from public.audit_log a where a.actor = p.id),
    (select string_agg(c.name, ', ') from public.teacher_classes tc
        join public.classes c on c.id = tc.class_id where tc.teacher_id = p.id)
  from public.profiles p left join auth.users u on u.id = p.id
  where p.role in ('admin', 'teacher')
    -- Yönetici hepsini görür; "öğrencileri görme" yetkisi olan öğretmen de listeyi görür
    -- (yalnızca yöneticinin sınıflarını görebilir — sınıf atamaları alt sorguda RLS ile zaten kısıtlı).
    and (public.is_admin() or public.has_perm('students.view'))
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

-- ---------- 8) MEVCUT YÖNETİCİ TAM YETKİLİ ----------
-- (admin rolü zaten her şeyi yapar; ek işlem gerekmez)

-- =====================================================================
-- BİTTİ.
-- =====================================================================
