-- ── Denetim Günlüğü Saklama Politikası (retention) ────────────────────
-- Supabase SQL Editor'de bir kez çalıştır. audit_log tablosunu 180 günden
-- eski kayıtlardan otomatik temizler. pg_cron kapalıysa bu komut hata verir;
-- o durumda GitHub Actions/panel üzerinden aylık temizlik yapın.

-- 1) pg_cron'un yüklü olduğunu doğrula (boş dönerse eklenti kapalıdır):
--    select * from pg_extension where extname = 'pg_cron';

-- 2) Aylık temizlik görevi (her ayın 1'i 04:00 UTC):
select cron.schedule(
  'audit-log-retention',
  '0 4 1 * *',
  $$delete from public.audit_log where at < now() - interval '180 days'$$
);

-- 3) Zamanlanmış görevleri listele / iptal et:
--    select jobid, jobname, schedule from cron.job;
--    select cron.unschedule('audit-log-retention');
