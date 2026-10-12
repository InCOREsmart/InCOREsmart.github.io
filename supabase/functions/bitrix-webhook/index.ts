import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-incore-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } });

function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aa = enc.encode(a);
  const bb = enc.encode(b);
  let diff = aa.length ^ bb.length;
  const length = Math.max(aa.length, bb.length);
  for (let i = 0; i < length; i++) diff |= (aa[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const expectedSecret = Deno.env.get('BITRIX_WEBHOOK_SECRET');
  if (!expectedSecret) {
    console.error('BITRIX_WEBHOOK_SECRET is not configured');
    return json({ error: 'Webhook integration is not configured' }, 503);
  }
  const suppliedSecret = req.headers.get('x-incore-webhook-secret') ?? '';
  if (!constantTimeEqual(suppliedSecret, expectedSecret)) return json({ error: 'Unauthorized' }, 401);

  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > 64 * 1024) return json({ error: 'Payload too large' }, 413);

  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > 64 * 1024) return json({ error: 'Payload too large' }, 413);
    let payload: Record<string, any>;
    try { payload = JSON.parse(raw); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const dealIdValue = payload.data?.ID ?? payload.ID;
    const dealId = dealIdValue == null ? '' : String(dealIdValue).trim();
    const stageRaw = payload.data?.STAGE_ID ?? payload.STAGE_ID;
    const stageId = typeof stageRaw === 'string' ? stageRaw.toLowerCase() : '';
    const titleRaw = payload.data?.TITLE ?? payload.TITLE;
    const title = typeof titleRaw === 'string' ? titleRaw.slice(0, 240) : null;
    if (!dealId || dealId.length > 160) return json({ error: 'Invalid deal ID' }, 400);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Supabase service configuration is missing');
      return json({ error: 'Integration is not configured' }, 503);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, kpi_calls, kpi_meetings, kpi_proposals, target_clients')
      .eq('bitrix_deal_id', dealId)
      .maybeSingle();
    if (contractError) {
      console.error('Contract lookup failed', contractError.message);
      return json({ error: 'Could not process webhook' }, 500);
    }
    if (!contract) return json({ success: false, message: 'Contract not found' }, 404);

    const updateData: Record<string, number> = {};
    if (stageId.includes('call')) updateData.kpi_calls = (contract.kpi_calls || 0) + 1;
    if (stageId.includes('meeting')) updateData.kpi_meetings = (contract.kpi_meetings || 0) + 1;
    if (stageId.includes('won') || stageId.includes('complete')) updateData.target_clients = (contract.target_clients || 0) + 1;

    if (Object.keys(updateData).length) {
      const { error: updateError } = await supabase.from('contracts').update(updateData).eq('id', contract.id);
      if (updateError) {
        console.error('Contract update failed', updateError.message);
        return json({ error: 'Could not process webhook' }, 500);
      }
    }

    const { error: logError } = await supabase.from('bitrix_webhooks_log').insert({
      deal_id: dealId,
      stage_id: stageRaw == null ? null : String(stageRaw).slice(0, 160),
      title,
      payload: { event: payload.event ?? null, data: { ID: dealId, STAGE_ID: stageRaw ?? null, TITLE: title } },
    });
    if (logError) console.error('Webhook audit log insert failed', logError.message);

    return json({ success: true, updated: updateData });
  } catch (error) {
    console.error('Webhook processing failed', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'Could not process webhook' }, 500);
  }
});
