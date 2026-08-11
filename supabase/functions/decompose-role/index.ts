import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://incoresmart.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `Ты эксперт по декомпозиции профессиональных ролей для платформы InCORE.

InCORE связывает работу человека с подтверждаемым результатом. Твоя задача — превратить реальные действия и ожидаемые результаты роли в 5-8 проверяемых навыков.

ПРАВИЛА:
- Не рассчитывай деньги, ставки, escrow или финансовые потоки.
- Вес навыка показывает только его значимость внутри роли. Сумма весов ровно 1.000.
- Для каждого навыка дай конкретный ожидаемый результат и критерии проверки.
- L4 используй только там, где результат реально подтверждается данными CRM/контракта/оплаты.
- L3 используй для накопительных результатов и долгосрочной результативности.
- Не придумывай обязанности, которых нет в исходных данных, если их нельзя логично вывести из результата роли.
- Если загружен документ, сначала извлеки из него обязанности, ответственность, KPI и ожидаемые результаты, затем используй их как основной источник.
- Построй связи между навыками.
- Верни только JSON без markdown и пояснений.`;

function buildPrompt(input: any) {
  return `Декомпозируй роль для InCORE.

Название: ${input.name}
Индустрия: ${input.industry}

Что делает человек:
${(input.actions || []).join('\n') || 'Не указано'}

Ожидаемые результаты:
${(input.expected_results || []).join('\n') || 'Не указано'}

Дополнительное описание:
${input.description || 'Не указано'}

Верни строго:
{
  "role": { "name": "string", "description": "string", "industry": "string", "category": "string" },
  "skills": [
    {
      "name": "string",
      "description": "string",
      "skill_type": "hard|soft|hybrid",
      "verification_level": "L1_bio|L2_simulation|L3_digital_twin|L4_smart_contract",
      "weight": 0.000,
      "is_required": true,
      "expected_outcomes": ["string"],
      "verification_criteria": ["string"]
    }
  ],
  "skills_relations": [
    {
      "skill_from": "string",
      "skill_to": "string",
      "relation_type": "requires|related_to|conflicts_with|enhances",
      "strength": 0.000,
      "is_directed": true
    }
  ]
}`;
}

function dataUrl(mime: string, base64: string) {
  return `data:${mime || 'application/octet-stream'};base64,${base64}`;
}

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Требуется авторизация.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment variables are not configured.');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Недействительная сессия.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const input = await req.json();
    if (!input?.name) {
      return new Response(JSON.stringify({ error: 'Название роли обязательно.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY не настроен в Supabase Functions.');

    const userContent: any[] = [{ type: 'input_text', text: buildPrompt(input) }];
    if (input.source_document_data) {
      userContent.push({
        type: 'input_file',
        filename: input.source_document_name || 'job-description',
        file_data: dataUrl(input.source_document_type, input.source_document_data),
      });
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        temperature: 0.2,
        input: [
          { role: 'system', content: [{ type: 'input_text', text: SYSTEM_PROMPT }] },
          { role: 'user', content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI API: ${response.status} ${text}`);
    }

    const payload = await response.json();
    const result = payload?.output_text;
    if (!result) throw new Error('AI не вернул результат.');

    return new Response(JSON.stringify({ result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
