import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  reminder_enabled?: boolean | null;
  reminder_times?: string[] | null;
  reminder_timezone?: string | null;
  reminder_last_sent_key?: string | null;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com';
const reminderCronSecret = Deno.env.get('REMINDER_CRON_SECRET');

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

function getLocalDateParts(timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function parseReminderTime(value: unknown) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^([0-2]\d):([0-5]\d)$/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23) return null;
  return { value, minutes: hour * 60 + minute };
}

function findDueReminder(subscription: PushSubscriptionRow) {
  const timeZone = subscription.reminder_timezone || 'Asia/Seoul';
  const now = getLocalDateParts(timeZone);
  const times = subscription.reminder_times?.length ? subscription.reminder_times : ['21:00'];

  for (const time of times) {
    const parsed = parseReminderTime(time);
    if (!parsed) continue;

    const isWithinSendWindow = now.minutes >= parsed.minutes && now.minutes < parsed.minutes + 10;
    const sentKey = `${now.date} ${parsed.value}`;

    if (isWithinSendWindow && subscription.reminder_last_sent_key !== sentKey) {
      return sentKey;
    }
  }

  return null;
}

serve(async (request) => {
  if (reminderCronSecret && request.headers.get('x-cron-secret') !== reminderCronSecret) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return Response.json({ error: 'Missing Supabase or VAPID environment variables.' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const body = await request.json().catch(() => ({}));
  const force = body?.force === true;
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id,endpoint,p256dh,auth,reminder_enabled,reminder_times,reminder_timezone,reminder_last_sent_key')
    .eq('reminder_enabled', true);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const dueSubscriptions = ((subscriptions ?? []) as PushSubscriptionRow[])
    .map((subscription) => ({
      subscription,
      sentKey: force ? null : findDueReminder(subscription),
    }))
    .filter(({ sentKey }) => force || sentKey);

  const payload = JSON.stringify({
    title: '성경읽기 챌린지',
    body: '오늘의 성경읽기 인증을 남겨주세요.',
    url: '/',
  });

  const results = await Promise.allSettled(
    dueSubscriptions.map(async ({ subscription, sentKey }) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload,
        );

        if (sentKey) {
          await supabase
            .from('push_subscriptions')
            .update({ reminder_last_sent_key: sentKey, updated_at: new Date().toISOString() })
            .eq('id', subscription.id);
        }

        return { id: subscription.id, sent: true };
      } catch (error) {
        const statusCode = typeof error === 'object' && error && 'statusCode' in error ? Number(error.statusCode) : 0;

        if (statusCode === 404 || statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', subscription.id);
        }

        return { id: subscription.id, sent: false, statusCode };
      }
    }),
  );

  const sent = results.filter((result) => result.status === 'fulfilled' && result.value.sent).length;

  return Response.json({
    subscriptions: subscriptions?.length ?? 0,
    attempted: dueSubscriptions.length,
    sent,
    force,
  });
});
