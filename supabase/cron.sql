-- Supabase SQL Editor에서 실행하세요.
-- 시간 기준은 UTC입니다. 아래 cron은 10분마다 함수를 호출합니다.
-- 실제 전송 여부는 각 사용자의 알림 시간 설정을 Edge Function이 한국시간 기준으로 판단합니다.
-- <PROJECT_REF>는 Supabase project ref, <REMINDER_CRON_SECRET>은 Edge Function Secret과 같은 값으로 교체하세요.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('daily-reading-reminder')
where exists (
  select 1
  from cron.job
  where jobname = 'daily-reading-reminder'
);

select cron.schedule(
  'daily-reading-reminder',
  '*/10 * * * *',
  $$
  select
    net.http_post(
      url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', '<REMINDER_CRON_SECRET>'
      ),
      body := '{}'::jsonb
    );
  $$
);
