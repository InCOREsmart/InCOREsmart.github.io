import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://incoresmart.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `Ты эксперт по декомпозиции профессиональных ролей для платформы InCORE.

InCORE превращает реальные действия человека в проверяемые результаты. Твоя задача — превратить действия и ожидаемые результаты роли в 5-8 проверяемых навыков.

Правила:
- Не рассчитывай деньги, ставки, escrow или финансовые потоки.
- Вес показывает только значимость навыка внутри роли. Сумма всех весов должна быть ровно 1.000.
- Для каждого навыка дай конкретные ожидаемые результаты и критерии проверки.
- L4 используй только там, где результат реально подтверждается CRM, договором, оплатой или другим цифровым фактом.
- L3 используй для накопительных и долгосрочных результатов.
- Не придумывай обязанности, которых нет в исходных данных без логичного основания.
- Если есть должностная инструкция, используй ее как основной источник.
- Построй связи между навыками.
- Верни только JSON.`;

const INSURANCE_FALLBACK = {
  role: {
    name: 'Страховой агент',
    description: 'Продажа корпоративных страховых продуктов, развитие и удержание клиентского портфеля.',
    industry: 'insurance',
    category: 'insurance',
  },
  skills: [
    { name: 'Продажи корпоративного страхования', description: 'Привлечение корпоративных клиентов, подготовка предложения, заключение и активация договоров.', skill_type: 'hard', verification_level: 'L4_smart_contract', weight: 0.50, is_required: true, expected_outcomes: ['Заключены и оплачены новые корпоративные договоры страхования.'], verification_criteria: ['Договор создан и активирован.', 'Оплата клиента подтверждена.'] },
    { name: 'Удержание клиентов', description: 'Сопровождение действующих корпоративных клиентов и своевременное продление договоров.', skill_type: 'hybrid', verification_level: 'L3_digital_twin', weight: 0.15, is_required: true, expected_outcomes: ['Действующие договоры продлены в установленный срок.'], verification_criteria: ['Есть подтвержденное продление договора.'] },
    { name: 'Кросс-продажи', description: 'Выявление дополнительных потребностей действующих клиентов и продажа дополнительных страховых продуктов.', skill_type: 'hard', verification_level: 'L4_smart_contract', weight: 0.10, is_required: false, expected_outcomes: ['Действующим клиентам проданы дополнительные страховые продукты.'], verification_criteria: ['Дополнительный договор или продукт активирован и оплачен.'] },
    { name: 'Выполнение плана продаж', description: 'Выполнение установленного плана продаж и KPI.', skill_type: 'hard', verification_level: 'L4_smart_contract', weight: 0.10, is_required: true, expected_outcomes: ['Установленный план продаж и KPI выполнены.'], verification_criteria: ['Фактический результат подтвержден данными системы учета.'] },
    { name: 'Удержание 90 дней', description: 'Стабилизация клиента после заключения договора и предотвращение досрочного расторжения.', skill_type: 'hybrid', verification_level: 'L4_smart_contract', weight: 0.10, is_required: true, expected_outcomes: ['Клиент сохраняется не менее 90 дней после заключения договора.'], verification_criteria: ['Нет досрочного расторжения, возврата или отмены в течение 90 дней.'] },
    { name: 'Долгосрочная результативность', description: 'Стабильное выполнение целей роли и поддержание результата в течение года.', skill_type: 'hybrid', verification_level: 'L3_digital_twin', weight: 0.05, is_required: false, expected_outcomes: ['Годовые условия результативности выполнены.'], verification_criteria: ['Накопленный результат и годовые KPI подтверждены системой.'] },
  ],
  skills_relations: [
    { skill_from: 'Продажи корпоративного страхования', skill_to: 'Удержание клиентов', relation_type: 'related_to', strength: 0.68, is_directed: false },
    { skill_from: 'Продажи корпоративного страхования', skill_to: 'Кросс-продажи', relation_type: 'related_to', strength: 0.62, is_directed: false },
    { skill_from: 'Продажи корпоративного страхования', skill_to: 'Выполнение плана продаж', relation_type: 'enhances', strength: 0.55, is_directed: true },
    { skill_from: 'Удержание 90 дней', skill_to: 'Продажи корпоративного страхования', relation_type: 'requires', strength: 0.80, is_directed: true },
    { skill_from: 'Долгосрочная результативность', skill_to: 'Удержание 90 дней', relation_type: 'requires', strength: 0.70, is_directed: true },
    { skill_from: 'Долгосрочная результативность', skill_to: 'Выполнение плана продаж', relation_type: 'requires', strength: 0.65, is_directed: true },
  ],
};

function buildPrompt(input: any) {
  return `Декомпозируй роль для InCORE.\n\nНазвание: ${input.name}\nИндустрия: ${input.industry || 'не указана'}\n\nЧто делает человек:\n${(input.actions || []).join('\n') || 'Не указано'}\n\nОжидаемые результаты:\n${(input.expected_results || []).join('\n') || 'Не указано'}\n\nДополнительное описание:\n${input.description || 'Не указано'}\n\nВерни строго JSON.`;
}

function dataUrl(mime: string, base64: string) {
  return `data:${mime || 'application/octet-stream'};base64,${base64}`;
}

function normalizeResult(result: any) {
  if (!result?.role || !Array.isArray(result.skills) || !Array.isArray(result.skills_relations)) throw new Error('AI вернул результат неверного формата.');
  if (result.skills.length < 5 || result.skills.length > 8) throw new Error(`AI вернул ${result.skills.length} навыков. Допустимо от 5 до 8.`);
  const rawWeights = result.skills.map((skill: any) => Number(skill.weight));
  if (rawWeights.some((weight: number) => !Number.isFinite(weight) || weight < 0)) throw new Error('AI вернул некорректные веса навыков.');
  const total = rawWeights.reduce((sum: number, weight: number) => sum + weight, 0);
  if (total <= 0) throw new Error('AI не сформировал веса навыков.');
  return { ...result, skills: result.skills.map((skill: any, index: number) => ({ ...skill, weight: rawWeights[index] / total, expected_outcomes: Array.isArray(skill.expected_outcomes) ? skill.expected_outcomes : [], verification_criteria: Array.isArray(skill.verification_criteria) ? skill.verification_criteria : [] })) };
}

serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Требуется авторизация.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase environment variables are not configured.');

    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: 'Недействительная сессия.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const input = await req.json();
    if (!input?.name) return new Response(JSON.stringify({ error: 'Название роли обязательно.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const isInsuranceAgent = String(input.name).trim().toLowerCase() === 'страховой агент';

    // Страховой агент является первым утвержденным шаблоном InCORE.
    // Для него AI и OPENAI_API_KEY вообще не требуются. Это позволяет протестировать
    // весь пользовательский сценарий декомпозиции без настройки внешнего API.
    if (isInsuranceAgent) {
      return new Response(JSON.stringify({ result: INSURANCE_FALLBACK, source: 'template' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) throw new Error('AI сейчас не настроен для пользовательских ролей. Для роли «Страховой агент» используется готовая декомпозиция без AI.');

    const userContent: any[] = [{ type: 'input_text', text: buildPrompt(input) }];
    if (input.source_document_data) userContent.push({ type: 'input_file', filename: input.source_document_name || 'job-description', file_data: dataUrl(input.source_document_type, input.source_document_data) });

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4.1-mini', temperature: 0.2, input: [{ role: 'system', content: [{ type: 'input_text', text: SYSTEM_PROMPT }] }, { role: 'user', content: userContent }] }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI API: ${response.status} ${text.slice(0, 500)}`);
    }

    const payload = await response.json();
    const resultText = payload?.output_text;
    if (!resultText) throw new Error('AI не вернул результат.');
    const result = normalizeResult(JSON.parse(resultText));

    return new Response(JSON.stringify({ result, source: 'ai' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('decompose-role:', message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
