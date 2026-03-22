-- ================================================
-- 자동 갱신 pg_cron 설정
-- Supabase SQL Editor에서 실행
-- ================================================

-- pg_cron 확장 활성화 (대시보드 Extensions에서 먼저 켜야 함)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 기존 job 제거 (재설정 시)
SELECT cron.unschedule('pubg-auto-sync') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'pubg-auto-sync'
);

-- 매일 새벽 4시(UTC 기준 19:00 = 한국 04:00) 자동 갱신
-- 한국 시간 = UTC + 9시간
-- 새벽 4시(KST) = 전날 19:00(UTC)
SELECT cron.schedule(
  'pubg-auto-sync',
  -- '0 19 * * *',  -- 매일 UTC 19:00 = KST 04:00
   '0 */6 * * *',  -- 매일 UTC 19:00 = KST 04:00
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/auto-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 설정값 저장 (Edge Function에서 읽을 수 있게)
-- Supabase 대시보드 > Settings > API 에서 확인한 값으로 교체
ALTER DATABASE postgres SET "app.supabase_url" = 'https://cgjqnwyaerekfxqgcolg.supabase.co';
ALTER DATABASE postgres SET "app.supabase_anon_key" = 'ALTER DATABASE postgres SET "app.supabase_anon_key" = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnanFud3lhZXJla2Z4cWdjb2xnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMDUyNDIsImV4cCI6MjA4OTY4MTI0Mn0.-66tEEUpUevTGmJ7-S9RkhttHxFbrwfLPWO4pu86Lmg';
';

-- 등록된 job 확인
SELECT * FROM cron.job;
