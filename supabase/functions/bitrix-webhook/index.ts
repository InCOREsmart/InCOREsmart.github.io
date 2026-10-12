// @ts-ignore: Deno environment types are not recognized by VS Code Node.js setup
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore: Deno environment types are not recognized by VS Code Node.js setup
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    console.log('Получен вебхук от Битрикс24:', payload)

    // @ts-ignore: Deno is a global object in Supabase Edge Functions
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    // @ts-ignore: Deno is a global object in Supabase Edge Functions
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const dealId = payload.data?.ID?.toString() || payload.ID?.toString()
    const stageId = payload.data?.STAGE_ID || payload.STAGE_ID
    const title = payload.data?.TITLE || payload.TITLE

    if (!dealId) {
      throw new Error('deal_id не найден в вебхуке')
    }

    // Логируем вебхук для отладки
    await supabase.from('bitrix_webhooks_log').insert({
      deal_id: dealId,
      stage_id: stageId,
      title: title,
      payload: payload
    })

    // Ищем контракт по bitrix_deal_id
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, kpi_calls, kpi_meetings, kpi_proposals, target_clients')
      .eq('bitrix_deal_id', dealId)
      .maybeSingle()

    if (contractError) {
      console.error('Ошибка поиска контракта:', contractError)
      throw contractError
    }

    if (!contract) {
      return new Response(
        JSON.stringify({ success: false, message: 'Контракт не найден' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    let updateData: Record<string, any> = {}

    if (stageId && stageId.toLowerCase().includes('call')) {
      updateData.kpi_calls = (contract.kpi_calls || 0) + 1
    }
    
    if (stageId && stageId.toLowerCase().includes('meeting')) {
      updateData.kpi_meetings = (contract.kpi_meetings || 0) + 1
    }

    if (stageId && (stageId.toLowerCase().includes('won') || stageId.toLowerCase().includes('complete'))) {
      updateData.target_clients = (contract.target_clients || 0) + 1
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('contracts')
        .update(updateData)
        .eq('id', contract.id)

      if (updateError) {
        console.error('Ошибка обновления контракта:', updateError)
        throw updateError
      }
    }

    return new Response(
      JSON.stringify({ success: true, updated: updateData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
    console.error('Ошибка обработки вебхука:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})