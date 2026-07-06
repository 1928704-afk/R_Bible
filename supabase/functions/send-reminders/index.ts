import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

serve(async () => {
  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return Response.json({ error: 'Missing Supabase or VAPID environment variables.' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id,endpoint,p256dh,auth');

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const payload = JSON.stringify({
    title: '성경읽기 챌린지',
    body: '오늘의 성경읽기 인증을 남겨주세요.',
    url: '/',
  });

  const results = await Promise.allSettled(
    ((subscriptions ?? []) as PushSubscriptionRow[]).map(async (subscription) => {
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
    attempted: subscriptions?.length ?? 0,
    sent,
  });
});
