alter table public.push_subscriptions
  add column if not exists reminder_enabled boolean not null default true,
  add column if not exists reminder_count integer not null default 1 check (reminder_count between 1 and 3),
  add column if not exists reminder_times text[] not null default array['21:00'],
  add column if not exists reminder_timezone text not null default 'Asia/Seoul',
  add column if not exists reminder_last_sent_key text;
