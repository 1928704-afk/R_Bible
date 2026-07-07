import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
const adminDeleteSecret = Deno.env.get('ADMIN_DELETE_SECRET');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-delete-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: corsHeaders });
  }

  if (!supabaseUrl || !serviceRoleKey || !adminDeleteSecret) {
    return Response.json({ error: 'Missing Supabase or admin delete environment variables.' }, { status: 500, headers: corsHeaders });
  }

  if (request.headers.get('x-admin-delete-secret') !== adminDeleteSecret) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401, headers: corsHeaders });
  }

  const body = await request.json().catch(() => null) as { organizationId?: string } | null;
  const organizationId = body?.organizationId?.trim();

  if (!organizationId) {
    return Response.json({ error: 'organizationId is required.' }, { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { error } = await supabase.from('organizations').delete().eq('id', organizationId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }

  return Response.json({ deleted: true, organizationId }, { headers: corsHeaders });
});
