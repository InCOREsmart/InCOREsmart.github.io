import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, serviceRoleKey);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!serviceRoleKey) return json({ error: 'Contract engine is not configured' }, 503);

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? 'process_contract');
    const contractId = body.contract_id ? String(body.contract_id) : null;

    if (action === 'apply_retention_clawback') {
      if (!contractId) return json({ error: 'contract_id is required' }, 400);
      const { data, error } = await supabase.rpc('apply_retention_clawback', { p_contract_id: contractId });
      if (error) throw error;
      return json({ success: true, affected: data ?? 0 });
    }

    const query = supabase
      .from('contracts')
      .select('id,created_at,client_left_date,execution_status,status')
      .limit(100);

    const { data: contracts, error } = contractId
      ? await query.eq('id', contractId)
      : await query.eq('execution_status', 'ACTIVE');

    if (error) throw error;

    const results: Array<{ contract_id: string; action: string; affected: number }> = [];
    const now = Date.now();

    for (const contract of contracts ?? []) {
      if (!contract.client_left_date || !contract.created_at) continue;

      const createdAt = new Date(contract.created_at).getTime();
      const leftAt = new Date(contract.client_left_date).getTime();
      const retentionDeadline = createdAt + 90 * 24 * 60 * 60 * 1000;

      if (leftAt < retentionDeadline && leftAt <= now) {
        const { data: affected, error: clawbackError } = await supabase.rpc('apply_retention_clawback', {
          p_contract_id: contract.id,
        });
        if (clawbackError) throw clawbackError;
        results.push({
          contract_id: contract.id,
          action: 'RETENTION_90_DAYS',
          affected: Number(affected ?? 0),
        });
      }
    }

    return json({ success: true, processed: results.length, results });
  } catch (error) {
    console.error('contract-engine error', error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
