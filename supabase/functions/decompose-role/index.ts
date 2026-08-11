import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Ты эксперт по декомпозиции профессиональных ролей для платформы InCORE.

InCORE платит за подтверждённый результат. Твоя задача — описать роль через 5-8 проверяемых навыков.

ВАЖНО:
- Не рассчитывай деньги и не создавай финансовые потоки.
- Не придумывай проценты выплат, ставки, escrow или цены навыков.
- Вес навыка показывает только его значимость внутри роли.
- Сумма весов должна быть ровно 1.000.
- Для каждого навыка нужны ожидаемый результат и конкретные критерии проверки.
- Уровень L4 используй только там, где результат реально можно подтвердить данными контракта/CRM.
- L3 используй для результатов, которые требуют накопления данных и оценки поведения/результативности.
- L1/L2 используй только когда это действительно уместно.
- Верни только JSON.`;

function userPrompt(input: any) {
  return `Разложи роль на навыки.

Название: ${input.name}
Описание: ${input.description}
Индустрия: ${input.industry}
Регион: ${input.region}

Формат:
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

serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const input = await req.json();
    if (!input?.name || !input?.description) {
      return new Response(JSON.stringify({ error: 'Название и описание роли обязательны.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY не настроен в Supabase Functions.');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt(input) },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI API: ${response.status} ${text}`);
    }

    const payload = await response.json();
    const result = payload?.choices?.[0]?.message?.content;
    if (!result) throw new Error('AI не вернул результат.');

    return new Response(JSON.stringify({ result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
