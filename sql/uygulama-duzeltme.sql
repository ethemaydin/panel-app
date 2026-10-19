-- Uygulama <-> Schema Uyum Duzeltmeleri (3. sirayla calistir)
# supabase-kurulum.sql ve panel/1-supabase-panel-guncelleme.sql ÇALIŞTIRILDIKTAN
# sonra bu dosyayı çalıştır. İdempotenttir (if not exists / or replace).

-- 1) Konu meta verisi uygulama ile hizalanır (icon/desc/exp/level burada saklanır)
alter table public.topics add column if not exists data jsonb not null default '{}';

-- 2) Ödev türü + soruları + geçme notu (uygulamanın type/q/pass alanları)
alter table public.homework add column if not exists hw_type text not null default 'write'; -- write|ex|test
alter table public.homework add column if not exists pass int;
alter table public.homework add column if not exists questions jsonb not null default '[]';

-- 3) Öğrenci ödev teslimları için upsert edilebilirlik
create unique index if not exists ux_hwsub on public.homework_submissions(homework_id, student_id);

-- 4) Yetki cast güvenliği: perms->>'x' null/'true'/garbage → hata yerine false
--    (orijinal has_perm JSON tipi bozuk gelirse tüm RLS policy'yi patlatıyordu)
create or replace function public.has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active
      and (role = 'admin'
           or (role = 'teacher' and lower(coalesce(perms->>p,'')) = 'true'))
  );
$$;

-- 5) topic_access okuma/yazma indeksleri (senkron sorguları için)
create index if not exists ix_topic_access_student on public.topic_access(student_id);
create index if not exists ix_topic_access_topic   on public.topic_access(topic_id);

-- 6) Realtime yayın listesine uygulama senkronunun okuduğu tabloları ekle (idempotent).
--    Uygulama ayrıca 60 sn polling fallback'ına sahiptir; bu blok olmasa da çalışır,
--    ama realtime ile öğretmen verisi öğrenciye <1 sn içinde düşer.
do $$
declare t text;
begin
  foreach t in array array['topics','subtopics','questions','homework','homework_targets',
                           'topic_access','notifications']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;  -- zaten listede
    end;
  end loop;
end $$;

-- 7) Ödev hedefleri için arama indeksi (senkron sorgusu homework_id ile filtreliyor)
create index if not exists ix_hw_targets_hw on public.homework_targets(homework_id);
create index if not exists ix_notifications_student on public.notifications(student_id, created_at desc);

-- 8) Planlı mesaj dağıtımı (pg_cron açıksa; kapalıysa bu satırı atla — docs/kurulum.md §4)
-- select cron.schedule('deliver-messages','* * * * *','select public.deliver_due_messages()');
