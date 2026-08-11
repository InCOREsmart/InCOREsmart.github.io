import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, FileText, Plus, RefreshCw, Save, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { insuranceAgentDecomposition } from '../../data/insuranceAgentDecomposition';
import { validateDecomposition } from '../../lib/decomposition';
import { RoleDecomposition, RoleInput } from '../../types/decomposition';

const INDUSTRIES = [
  { value: 'insurance', label: 'Страхование' },
  { value: 'sales', label: 'Продажи' },
  { value: 'management', label: 'Управление' },
  { value: 'finance', label: 'Финансы' },
  { value: 'other', label: 'Другое' },
];

const VERIFICATION_LABELS: Record<string, string> = {
  L1_bio: 'L1 · Биоаналитика',
  L2_simulation: 'L2 · Симуляция',
  L3_digital_twin: 'L3 · Цифровой двойник',
  L4_smart_contract: 'L4 · Смарт-контракт',
};

const RELATION_LABELS: Record<string, string> = {
  requires: 'требует',
  related_to: 'связан с',
  conflicts_with: 'конфликтует с',
  enhances: 'усиливает',
};

const INSURANCE_DESCRIPTION = 'Продажа корпоративных страховых продуктов, развитие и удержание клиентского портфеля.';
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

const emptyInput: RoleInput = {
  name: '',
  description: '',
  industry: 'insurance',
  region: 'az',
  actions: [''],
  expected_results: [''],
};

function cleanList(items: string[]) {
  return items.map(item => item.trim()).filter(Boolean);
}

export function RoleDecompositionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState<RoleInput>(emptyInput);
  const [result, setResult] = useState<RoleDecomposition | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [documentName, setDocumentName] = useState('');

  const validation = useMemo(() => result ? validateDecomposition(result) : null, [result]);
  const isInsuranceDemo = input.name.trim().toLowerCase() === 'страховой агент';

  const updateList = (field: 'actions' | 'expected_results', index: number, value: string) => {
    setInput(prev => ({ ...prev, [field]: prev[field].map((item, i) => i === index ? value : item) }));
  };

  const addListItem = (field: 'actions' | 'expected_results') => {
    setInput(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  };

  const removeListItem = (field: 'actions' | 'expected_results', index: number) => {
    setInput(prev => {
      const next = prev[field].filter((_, i) => i !== index);
      return { ...prev, [field]: next.length ? next : [''] };
    });
  };

  const handleDocument = async (file: File) => {
    setError('');
    if (file.size > MAX_DOCUMENT_SIZE) {
      setError('Файл слишком большой. Максимальный размер документа — 10 МБ.');
      return;
    }
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'];
    if (!allowed.includes(file.type) && !/\.(pdf|docx|txt|md)$/i.test(file.name)) {
      setError('Поддерживаются PDF, DOCX, TXT и MD.');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
      }
      const base64 = btoa(binary);
      setDocumentName(file.name);
      setInput(prev => ({
        ...prev,
        source_document_name: file.name,
        source_document_data: base64,
        source_document_type: file.type || 'application/octet-stream',
      }));
    } catch (err) {
      console.error(err);
      setError('Не удалось прочитать документ.');
    }
  };

  const decompose = async () => {
    const actions = cleanList(input.actions);
    const expectedResults = cleanList(input.expected_results);
    const normalizedInput: RoleInput = {
      ...input,
      description: (input.description ?? '').trim() || (isInsuranceDemo ? INSURANCE_DESCRIPTION : ''),
      actions,
      expected_results: expectedResults,
    };

    if (!normalizedInput.name.trim()) {
      setError('Укажите название роли.');
      return;
    }
    if (!normalizedInput.description && !normalizedInput.source_document_data && !actions.length && !expectedResults.length) {
      setError('Добавьте действия, ожидаемые результаты или загрузите должностную инструкцию.');
      return;
    }

    setInput(normalizedInput);
    setLoading(true);
    setError('');
    try {
      if (isInsuranceDemo && !normalizedInput.source_document_data && !actions.length && !expectedResults.length) {
        setResult(insuranceAgentDecomposition);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke('decompose-role', { body: normalizedInput });
      if (fnError) throw fnError;
      const parsed = typeof data?.result === 'string' ? JSON.parse(data.result) : data?.result;
      if (!parsed) throw new Error('AI не вернул результат.');
      setResult(parsed as RoleDecomposition);
    } catch (err) {
      console.error(err);
      setError('Не удалось выполнить AI-декомпозицию. Проверьте документ и настройки AI.');
    } finally {
      setLoading(false);
    }
  };

  const updateWeight = (index: number, value: string) => {
    if (!result) return;
    const parsed = Number(value.replace(',', '.'));
    if (!Number.isFinite(parsed)) return;
    const weight = Math.max(0, Math.min(100, parsed)) / 100;
    setResult({ ...result, skills: result.skills.map((skill, i) => i === index ? { ...skill, weight } : skill) });
  };

  const save = async () => {
    if (!result || !validation?.valid || !user) return;
    setSaving(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('save_role_decomposition', {
        p_name: result.role.name,
        p_description: result.role.description,
        p_industry: result.role.industry,
        p_category: result.role.category,
        p_region: input.region,
        p_source: isInsuranceDemo ? 'template' : 'ai',
        p_skills: result.skills,
        p_relations: result.skills_relations,
      });
      if (rpcError) throw rpcError;
      if (!data) throw new Error('Роль не сохранена.');
      alert('Роль сохранена. Финансовые расчёты контрактов не изменены.');
      navigate(`/ceo/contracts?roleId=${data}`);
    } catch (err) {
      console.error(err);
      setError('Не удалось сохранить роль. Проверьте миграцию Supabase и права CEO.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/ceo/agents')} className="p-2 rounded-xl hover:bg-[#000052]/5 text-[#000052]" aria-label="Назад"><ArrowLeft className="w-5 h-5" /></button>
        <div><h1 className="text-[26px] md:text-3xl font-bold text-[#000052]">Декомпозиция роли</h1><p className="text-sm text-gray-400 mt-1">AI превращает реальную работу роли в проверяемые навыки. Финансовая модель InCORE остаётся отдельно.</p></div>
      </div>

      {!result && (
        <div className="space-y-5 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">Название роли *</label>
              <input value={input.name} onChange={e => setInput({ ...input, name: e.target.value })} placeholder="Например: Страховой агент" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/20" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2"><label className="block text-sm font-semibold text-[#000052]">Что делает человек?</label><span className="text-xs text-gray-400">Конкретные действия</span></div>
              <div className="space-y-2">
                {input.actions.map((item, index) => <div key={index} className="flex gap-2"><input value={item} onChange={e => updateList('actions', index, e.target.value)} placeholder="Например: заключает корпоративные договоры" className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-[#000052]" />{input.actions.length > 1 && <button onClick={() => removeListItem('actions', index)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}</div>)}
              </div>
              <button onClick={() => addListItem('actions')} className="mt-2 inline-flex items-center gap-1 text-sm text-[#000052] font-semibold"><Plus className="w-4 h-4" /> Добавить действие</button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2"><label className="block text-sm font-semibold text-[#000052]">Какой ожидаемый результат?</label><span className="text-xs text-gray-400">Что должно быть достигнуто</span></div>
              <div className="space-y-2">
                {input.expected_results.map((item, index) => <div key={index} className="flex gap-2"><input value={item} onChange={e => updateList('expected_results', index, e.target.value)} placeholder="Например: план новых продаж выполнен" className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-[#000052]" />{input.expected_results.length > 1 && <button onClick={() => removeListItem('expected_results', index)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}</div>)}
              </div>
              <button onClick={() => addListItem('expected_results')} className="mt-2 inline-flex items-center gap-1 text-sm text-[#000052] font-semibold"><Plus className="w-4 h-4" /> Добавить результат</button>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <label className="block text-sm font-semibold text-[#000052] mb-2">Должностная инструкция</label>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) void handleDocument(file); e.currentTarget.value = ''; }} />
              {!documentName ? (
                <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-[#B8860B]/50 transition-colors">
                  <Upload className="w-6 h-6 mx-auto text-[#B8860B]" /><div className="mt-2 font-semibold text-[#000052]">Загрузить должностную инструкцию</div><div className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT или MD, до 10 МБ</div>
                </button>
              ) : (
                <div className="flex items-center justify-between gap-3 p-4 bg-[#000052]/5 rounded-xl"><div className="flex items-center gap-3"><FileText className="w-5 h-5 text-[#B8860B]" /><span className="text-sm font-semibold text-[#000052]">{documentName}</span></div><button onClick={() => { setDocumentName(''); setInput(prev => ({ ...prev, source_document_name: undefined, source_document_data: undefined, source_document_type: undefined })); }} className="p-1 text-gray-400 hover:text-red-600"><X className="w-4 h-4" /></button></div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">Индустрия</label>
              <select value={input.industry} onChange={e => setInput({ ...input, industry: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#000052]">{INDUSTRIES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            </div>

            {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
            <button onClick={decompose} disabled={loading} className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-[#000052] text-white rounded-xl font-semibold disabled:opacity-50"><Sparkles className="w-5 h-5" />{loading ? 'AI анализирует роль...' : 'AI-декомпозировать роль'}</button>
          </div>
        </div>
      )}

      {result && validation && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl shadow-sm p-6"><div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4"><div><h2 className="text-2xl font-bold text-[#000052]">{result.role.name}</h2><p className="text-sm text-gray-500 mt-1">{result.role.description}</p></div><div className={`px-3 py-2 rounded-xl text-sm font-semibold ${validation.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{validation.valid ? 'Декомпозиция проверена' : 'Нужно исправить'}</div></div>{!validation.valid && <div className="mt-4 p-4 bg-red-50 rounded-xl text-sm text-red-700">{validation.errors.map(errorItem => <div key={errorItem}>• {errorItem}</div>)}</div>}</div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100"><h3 className="font-bold text-[#000052]">Навыки роли</h3><p className="text-xs text-gray-400 mt-1">Изменяйте веса. Это значимость навыка внутри роли, а не распределение денег контракта.</p></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[1050px]"><thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase"><th className="text-left p-3">Навык</th><th className="text-left p-3 w-28">Вес</th><th className="text-left p-3">Верификация</th><th className="text-left p-3">Ожидаемый результат</th><th className="text-left p-3">Критерий проверки</th></tr></thead><tbody className="divide-y divide-gray-100">{result.skills.map((skill, index) => <tr key={skill.name} className="align-top"><td className="p-3"><div className="font-semibold text-[#000052]">{skill.name}</div><div className="text-xs text-gray-500 mt-1 max-w-[280px]">{skill.description}</div></td><td className="p-3"><div className="relative"><input type="number" min="0" max="100" step="1" value={(skill.weight * 100).toFixed(0)} onChange={e => updateWeight(index, e.target.value)} className="w-20 px-3 py-2 pr-7 border border-gray-200 rounded-lg font-bold text-[#B8860B]" /><span className="absolute right-3 top-2 text-[#B8860B]">%</span></div></td><td className="p-3 text-sm text-[#000052]">{VERIFICATION_LABELS[skill.verification_level]}</td><td className="p-3 text-sm text-gray-600">{skill.expected_outcomes.map(item => <div key={item}>• {item}</div>)}</td><td className="p-3 text-sm text-gray-600">{skill.verification_criteria.map(item => <div key={item}>• {item}</div>)}</td></tr>)}</tbody><tfoot><tr className="bg-gray-50 border-t-2 border-gray-200"><td className="p-3 font-bold text-[#000052]">Итого</td><td className={`p-3 font-bold ${Math.abs(result.skills.reduce((sum, skill) => sum + skill.weight, 0) - 1) < 0.001 ? 'text-emerald-600' : 'text-red-600'}`}>{(result.skills.reduce((sum, skill) => sum + skill.weight, 0) * 100).toFixed(0)}%</td><td colSpan={3}></td></tr></tfoot></table></div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5"><h3 className="font-bold text-[#000052] mb-3">Связи между навыками</h3><div className="space-y-2">{result.skills_relations.map((relation, index) => <div key={`${relation.skill_from}-${relation.skill_to}-${index}`} className="text-sm flex flex-wrap items-center gap-2"><span className="font-medium text-[#000052]">{relation.skill_from}</span><span className="px-2 py-1 bg-[#000052]/5 rounded-lg text-xs">{RELATION_LABELS[relation.relation_type]}</span><span className="font-medium text-[#000052]">{relation.skill_to}</span><span className="text-gray-400">{Math.round(relation.strength * 100)}%</span></div>)}</div></div>

          {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
          <div className="flex flex-col md:flex-row gap-3"><button onClick={() => { setResult(null); setError(''); }} className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-white border border-gray-200 text-[#000052] rounded-xl font-semibold"><RefreshCw className="w-4 h-4" />Изменить входные данные</button><button onClick={save} disabled={!validation.valid || saving} className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl font-semibold disabled:opacity-50"><Save className="w-4 h-4" />{saving ? 'Сохранение...' : 'Подтвердить и сохранить'}</button></div>
        </div>
      )}
    </div>
  );
}
