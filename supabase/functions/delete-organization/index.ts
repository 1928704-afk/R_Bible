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

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const action = typeof body?.action === 'string' ? body.action : 'deleteOrganization';

  let error: { message: string } | null = null;

  if (action === 'deleteOrganization') {
    const organizationId = typeof body?.organizationId === 'string' ? body.organizationId.trim() : '';
    if (!organizationId) {
      return Response.json({ error: 'organizationId is required.' }, { status: 400, headers: corsHeaders });
    }
    ({ error } = await supabase.from('organizations').delete().eq('id', organizationId));
  } else if (action === 'updateOrganization') {
    const organization = body?.organization as Record<string, unknown> | undefined;
    if (!organization?.id) {
      return Response.json({ error: 'organization is required.' }, { status: 400, headers: corsHeaders });
    }
    ({ error } = await supabase
      .from('organizations')
      .update({
        name: organization.name,
        invite_code: organization.invite_code,
        owner_name: organization.owner_name,
        target_metric: organization.target_metric,
      })
      .eq('id', organization.id));
  } else if (action === 'upsertDepartment') {
    const department = body?.department as Record<string, unknown> | undefined;
    if (!department?.id) {
      return Response.json({ error: 'department is required.' }, { status: 400, headers: corsHeaders });
    }
    ({ error } = await supabase.from('departments').upsert(department, { onConflict: 'id' }));
  } else if (action === 'deleteDepartment') {
    const departmentId = typeof body?.departmentId === 'string' ? body.departmentId.trim() : '';
    if (!departmentId) {
      return Response.json({ error: 'departmentId is required.' }, { status: 400, headers: corsHeaders });
    }
    ({ error } = await supabase.from('departments').delete().eq('id', departmentId));
  } else if (action === 'updateMember') {
    const member = body?.member as Record<string, unknown> | undefined;
    if (!member?.id) {
      return Response.json({ error: 'member is required.' }, { status: 400, headers: corsHeaders });
    }
    ({ error } = await supabase
      .from('members')
      .update({
        name: member.name,
        department_id: member.department_id,
        role: member.role,
      })
      .eq('id', member.id));

    if (!error) {
      const logUpdate = await supabase
        .from('reading_logs')
        .update({ member_name: member.name, department_id: member.department_id })
        .eq('member_id', member.id);
      error = logUpdate.error;
    }
  } else if (action === 'deleteMember') {
    const memberId = typeof body?.memberId === 'string' ? body.memberId.trim() : '';
    if (!memberId) {
      return Response.json({ error: 'memberId is required.' }, { status: 400, headers: corsHeaders });
    }
    ({ error } = await supabase.from('members').delete().eq('id', memberId));
  } else if (action === 'updateLog') {
    const log = body?.log as Record<string, unknown> | undefined;
    if (!log?.id) {
      return Response.json({ error: 'log is required.' }, { status: 400, headers: corsHeaders });
    }
    ({ error } = await supabase
      .from('reading_logs')
      .update({
        passage: log.passage,
        reflection: log.reflection,
        read_chapters: log.read_chapters,
      })
      .eq('id', log.id));
  } else if (action === 'deleteLog') {
    const logId = typeof body?.logId === 'string' ? body.logId.trim() : '';
    if (!logId) {
      return Response.json({ error: 'logId is required.' }, { status: 400, headers: corsHeaders });
    }
    ({ error } = await supabase.from('reading_logs').delete().eq('id', logId));
  } else if (action === 'upsertAnnouncement') {
    const announcement = body?.announcement as Record<string, unknown> | undefined;
    if (!announcement?.id) {
      return Response.json({ error: 'announcement is required.' }, { status: 400, headers: corsHeaders });
    }
    ({ error } = await supabase.from('announcements').upsert(announcement, { onConflict: 'id' }));
  } else {
    return Response.json({ error: 'Unknown action.' }, { status: 400, headers: corsHeaders });
  }

  if (error) {
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }

  return Response.json({ ok: true, action }, { headers: corsHeaders });
});
