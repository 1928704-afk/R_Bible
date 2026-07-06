-- Supabase SQL Editor에서 실행하세요.
-- 시간 기준은 UTC입니다. 아래 cron은 매일 한국시간 21:00(KST), UTC 12:00에 리마인드를 호출합니다.
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
  '0 12 * * *',
  $$
  select
    net.http_post(
      url := 'https://<PROJECT_REF>.functions.supabase.co/send-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', '<REMINDER_CRON_SECRET>'
      ),
      body := '{}'::jsonb
    );
  $$
);
