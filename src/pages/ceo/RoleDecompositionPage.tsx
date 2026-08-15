import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, FileText, Plus, RefreshCw, Save, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { insuranceAgentDecomposition } from '../../data/insuranceAgentDecomposition';
import { validateDecomposition } from '../../lib/decomposition';
import { RoleDecomposition, RoleInput } from '../../types/decomposition';
import { RoleMarketAnalysis } from '../../components/role/RoleMarketAnalysis';

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

type SavedSkill = {
  id: string;
  name: string;
  description: string | null;
  skill_type: 'hard' | 'soft' | 'hybrid';
  verification_level: 'L1_bio' | 'L2_simulation' | 'L3_digital_twin' | 'L4_smart_contract';
  is_required: boolean;
  expected_outcomes: string[];
  verification_criteria: string[];
};

type SavedRoleSkill = {
  weight: number;
  is_required?: boolean;
  skills: SavedSkill | SavedSkill[] | null;
};

type SavedRole = {
  id: string;
  name: string;
  description: string | null;
  industry: string;
  category: string | null;
  created_at: string;
  role_skills: SavedRoleSkill[];
};

function normalizeRoleSkills(rows: SavedRoleSkill[]): Array<{ weight: number; is_required?: boolean; skills: SavedSkill | null }> {
  return rows.flatMap(row => {
    const skill = row.skills;
    if (!skill) return [];
    if (Array.isArray(skill)) {
      return skill.map(item => ({
        weight: row.weight,
        is_required: row.is_required,
        skills: item,
      }));
    }
    return [{
      weight: row.weight,
      is_required: row.is_required,
      skills: skill,
    }];
  });
}

function cleanList(items: string[]) {
  return items.map(item => item.trim()).filter(Boolean);
}

export function RoleDecompositionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState<RoleInput>(emptyInput);
  const [result, setResult] = useState<RoleDecomposition | null>(null);
  const [savedRoles, setSavedRoles] = useState<SavedRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openingRoleId, setOpeningRoleId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [documentName, setDocumentName] = useState('');

  const validation = useMemo(() => result ? validateDecomposition(result) : null, [result]);
  const isInsuranceDemo = input.name.trim().toLowerCase() === 'страховой агент';

  const loadSavedRoles = async () => {
    setLoadingRoles(true);
    try {
      const { data, error: rolesError } = await supabase
        .from('roles')
        .select('id, name, description, industry, category, created_at, role_skills(weight, is_required, skills(id, name, description, skill_type, verification_level, is_required, expected_outcomes, verification_criteria))')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (rolesError) throw rolesError;
      setSavedRoles((data ?? []) as unknown as SavedRole[]);
    } catch (err) {
      console.error('Ошибка загрузки сохранённых ролей:', err);
      setSavedRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  };

  useEffect(() => {
    if (user) void loadSavedRoles();
  }, [user]);

  const openSavedRole = async (role: SavedRole) => {
    setOpeningRoleId(role.id);
    setError('');
    try {
      const { data: relationRows, error: relationError } = await supabase
        .from('skills_relations')
        .select('relation_type, strength, is_directed, skill_from_id, skill_to_id')
        .eq('role_id', role.id);
      if (relationError) throw relationError;

      const roleSkills = normalizeRoleSkills(role.role_skills ?? []);
      const skills = roleSkills.map(item => item.skills).filter((skill): skill is SavedSkill => Boolean(skill));
      const skillById = new Map(skills.map(skill => [skill.id, skill.name]));
      const relations = (relationRows ?? []).map(row => ({
        skill_from: skillById.get(row.skill_from_id) ?? '',
        skill_to: skillById.get(row.skill_to_id) ?? '',
        relation_type: row.relation_type,
        strength: Number(row.strength),
        is_directed: Boolean(row.is_directed),
      })).filter(row => row.skill_from && row.skill_to) as RoleDecomposition['skills_relations'];

      const decomposition: RoleDecomposition = {
        role: {
          name: role.name,
          description: role.description ?? '',
          industry: role.industry,
          category: role.category ?? '',
        },
        skills: roleSkills.map(item => item.skills ? ({
          name: item.skills.name,
          description: item.skills.description ?? '',
          skill_type: item.skills.skill_type,
          verification_level: item.skills.verification_level,
          weight: Number(item.weight),
          is_required: Boolean(item.is_required ?? item.skills.is_required),
          expected_outcomes: Array.isArray(item.skills.expected_outcomes) ? item.skills.expected_outcomes : [],
          verification_criteria: Array.isArray(item.skills.verification_criteria) ? item.skills.verification_criteria : [],
        }) : null).filter((skill): skill is NonNullable<typeof skill> => Boolean(skill)),
        skills_relations: relations,
      };

      setInput(prev => ({ ...prev, name: role.name, description: role.description ?? '', industry: role.industry, region: 'az', actions: [''], expected_results: [''] }));
      setResult(decomposition);
    } catch (err) {
      console.error('Ошибка открытия сохранённой роли:', err);
      setError('Не удалось открыть сохранённую роль.');
    } finally {
      setOpeningRoleId(null);
    }
  };

  const updateList = (field: 'actions' | 'expected_results', index: number, value: string) => {
    setInput(prev => ({ ...prev, [field]: prev[field].map((item, i) => i === index ? value : item) }));
  };

  const addListItem = () => {
    setInput(prev => ({ ...prev, actions: [...prev.actions, ''], expected_results: [...prev.expected_results, ''] }));
  };

  const removeListItem = (index: number) => {
    setInput(prev => {
      if (prev.actions.length <= 1) return prev;
      return {
        ...prev,
        actions: prev.actions.filter((_, i) => i !== index),
        expected_results: prev.expected_results.filter((_, i) => i !== index),
      };
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
      for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
      const base64 = btoa(binary);
      setDocumentName(file.name);
      setInput(prev => ({ ...prev, source_document_name: file.name, source_document_data: base64, source_document_type: file.type || 'application/octet-stream' }));
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
      setResult(null);
      setInput(emptyInput);
      setDocumentName('');
      await loadSavedRoles();
    } catch (err) {
      console.error('Ошибка сохранения роли:', err);
      setError('Не удалось сохранить роль.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-w-0 p-4 md:p-8 space-y-6 max-w-7xl mx-auto overflow-x-hidden">
      <div className="flex items-start gap-2 sm:gap-3 min-w-0">
        <button onClick={() => navigate('/ceo/agents')} className="shrink-0 p-2 rounded-xl hover:bg-[#000052]/5 text-[#000052]" aria-label="Назад"><ArrowLeft className="w-5 h-5" /></button>
        <div className="min-w-0"><h1 className="text-[24px] sm:text-[26px] md:text-3xl font-bold text-[#000052] break-words">Декомпозиция роли</h1><p className="text-sm text-gray-400 mt-1 break-words">AI конвертирует реальную работу роли в проверяемые навыки.</p></div>
      </div>

      {!result && (
        <div className="space-y-5 max-w-5xl min-w-0">
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 space-y-5 min-w-0">
            <div><label className="block text-sm font-semibold text-[#000052] mb-1.5">Название роли *</label><input value={input.name} onChange={e => setInput({ ...input, name: e.target.value })} placeholder="Например: Страховой агент" className="w-full min-w-0 px-4 py-3 border border-gray-200 rounded-xl text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/20" /></div>
            <div className="min-w-0">
              <div className="hidden md:grid grid-cols-[1fr_1fr_40px] gap-3 items-center mb-2"><div><label className="block text-sm font-semibold text-[#000052]">Что делает человек?</label><span className="text-xs text-gray-400">Конкретное действие</span></div><div><label className="block text-sm font-semibold text-[#000052]">Какой ожидаемый результат?</label><span className="text-xs text-gray-400">Что должно быть достигнуто</span></div><div /></div>
              <div className="space-y-3">{input.actions.map((item, index) => <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_40px] gap-2 md:gap-3 items-stretch md:items-center p-3 md:p-0 rounded-xl bg-gray-50/70 md:bg-transparent border border-gray-100 md:border-0">
                <div className="min-w-0"><label className="md:hidden block text-xs font-semibold text-gray-500 mb-1">Действие</label><input value={item} onChange={e => updateList('actions', index, e.target.value)} placeholder={`Действие ${index + 1}`} className="w-full min-w-0 px-4 py-2.5 border border-gray-200 rounded-xl text-[#000052] bg-white" /></div>
                <div className="relative min-w-0"><span className="hidden md:block absolute -left-2 top-1/2 -translate-y-1/2 text-gray-300">→</span><label className="md:hidden block text-xs font-semibold text-gray-500 mb-1">Ожидаемый результат</label><input value={input.expected_results[index] ?? ''} onChange={e => updateList('expected_results', index, e.target.value)} placeholder={`Результат ${index + 1}`} className="w-full min-w-0 px-4 py-2.5 border border-gray-200 rounded-xl text-[#000052] bg-white md:pl-5" /></div>
                <button onClick={() => removeListItem(index)} disabled={input.actions.length === 1} className="justify-self-end md:justify-self-auto p-2 text-gray-400 hover:text-red-600 disabled:opacity-30" aria-label={`Удалить действие ${index + 1}`}><Trash2 className="w-4 h-4" /></button>
              </div>)}</div>
              <button onClick={addListItem} className="mt-3 inline-flex items-center gap-1 text-sm text-[#000052] font-semibold"><Plus className="w-4 h-4" /> Добавить действие</button>
            </div>
            <div className="border-t border-gray-100 pt-5">
              <label className="block text-sm font-semibold text-[#000052] mb-2">Должностная инструкция</label>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) void handleDocument(file); e.currentTarget.value = ''; }} />
              {!documentName ? <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-5 sm:p-6 text-center hover:border-[#B8860B]/50 transition-colors"><Upload className="w-6 h-6 mx-auto text-[#B8860B]" /><div className="mt-2 font-semibold text-[#000052]">Загрузить должностную инструкцию</div><div className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT или MD, до 10 МБ</div></button> : <div className="flex items-start sm:items-center justify-between gap-3 p-4 bg-[#000052]/5 rounded-xl min-w-0"><div className="flex items-start sm:items-center gap-3 min-w-0"><FileText className="w-5 h-5 shrink-0 text-[#B8860B]" /><span className="text-sm font-semibold text-[#000052] break-all">{documentName}</span></div><button onClick={() => { setDocumentName(''); setInput(prev => ({ ...prev, source_document_name: undefined, source_document_data: undefined, source_document_type: undefined })); }} className="shrink-0 p-1 text-gray-400 hover:text-red-600"><X className="w-4 h-4" /></button></div>}
            </div>
            <div><label className="block text-sm font-semibold text-[#000052] mb-1.5">Индустрия</label><select value={input.industry} onChange={e => setInput({ ...input, industry: e.target.value })} className="w-full min-w-0 px-4 py-3 border border-gray-200 rounded-xl text-[#000052]">{INDUSTRIES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm break-words">{error}</div>}
            <button onClick={decompose} disabled={loading} className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-[#000052] text-white rounded-xl font-semibold disabled:opacity-50"><Sparkles className="w-5 h-5 shrink-0" />{loading ? 'AI анализирует роль...' : 'AI-декомпозировать роль'}</button>
          </div>
        </div>
      )}

      {result && validation && (
        <div className="space-y-5 min-w-0">
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 min-w-0"><div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 min-w-0"><div className="min-w-0"><h2 className="text-xl sm:text-2xl font-bold text-[#000052] break-words">{result.role.name}</h2><p className="text-sm text-gray-500 mt-1 break-words">{result.role.description}</p></div><div className={`shrink-0 self-start px-3 py-2 rounded-xl text-sm font-semibold ${validation.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{validation.valid ? 'Декомпозиция проверена' : 'Нужно исправить'}</div></div>{!validation.valid && <div className="mt-4 p-4 bg-red-50 rounded-xl text-sm text-red-700 break-words">{validation.errors.map(errorItem => <div key={errorItem}>• {errorItem}</div>)}</div>}</div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden min-w-0">
            <div className="p-4 sm:p-5 border-b border-gray-100"><h3 className="font-bold text-[#000052]">Навыки роли</h3><p className="text-xs text-gray-400 mt-1">Изменяйте веса. Это значимость навыка внутри роли, а не распределение денег контракта.</p></div>

            <div className="md:hidden p-4 space-y-3">
              {result.skills.map((skill, index) => <article key={skill.name} className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 min-w-0">
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div className="min-w-0"><h4 className="font-semibold text-[#000052] break-words">{skill.name}</h4><p className="text-xs text-gray-500 mt-1 break-words">{skill.description}</p></div>
                  <div className="relative shrink-0"><input type="number" min="0" max="100" step="1" value={(skill.weight * 100).toFixed(0)} onChange={e => updateWeight(index, e.target.value)} className="w-[76px] px-2 py-2 pr-6 border border-gray-200 rounded-lg font-bold text-[#B8860B] bg-white" /><span className="absolute right-2 top-2 text-[#B8860B]">%</span></div>
                </div>
                <div className="mt-3 space-y-3 text-sm">
                  <div><div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Верификация</div><div className="text-[#000052] break-words">{VERIFICATION_LABELS[skill.verification_level]}</div></div>
                  <div><div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Ожидаемый результат</div><div className="text-gray-600 space-y-1">{skill.expected_outcomes.map(item => <div key={item} className="break-words">• {item}</div>)}</div></div>
                  <div><div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Критерий проверки</div><div className="text-gray-600 space-y-1">{skill.verification_criteria.map(item => <div key={item} className="break-words">• {item}</div>)}</div></div>
                </div>
              </article>)}
              <div className="flex items-center justify-between rounded-xl bg-gray-50 border-t-2 border-gray-200 px-4 py-3"><span className="font-bold text-[#000052]">Итого</span><span className={`font-bold ${Math.abs(result.skills.reduce((sum, skill) => sum + skill.weight, 0) - 1) < 0.001 ? 'text-emerald-600' : 'text-red-600'}`}>{(result.skills.reduce((sum, skill) => sum + skill.weight, 0) * 100).toFixed(0)}%</span></div>
            </div>

            <div className="hidden md:block overflow-x-auto"><table className="w-full min-w-[1050px]"><thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase"><th className="text-left p-3">Навык</th><th className="text-left p-3 w-28">Вес</th><th className="text-left p-3">Верификация</th><th className="text-left p-3">Ожидаемый результат</th><th className="text-left p-3">Критерий проверки</th></tr></thead><tbody className="divide-y divide-gray-100">{result.skills.map((skill, index) => <tr key={skill.name} className="align-top"><td className="p-3"><div className="font-semibold text-[#000052]">{skill.name}</div><div className="text-xs text-gray-500 mt-1 max-w-[280px]">{skill.description}</div></td><td className="p-3"><div className="relative"><input type="number" min="0" max="100" step="1" value={(skill.weight * 100).toFixed(0)} onChange={e => updateWeight(index, e.target.value)} className="w-20 px-3 py-2 pr-7 border border-gray-200 rounded-lg font-bold text-[#B8860B]" /><span className="absolute right-3 top-2 text-[#B8860B]">%</span></div></td><td className="p-3 text-sm text-[#000052]">{VERIFICATION_LABELS[skill.verification_level]}</td><td className="p-3 text-sm text-gray-600">{skill.expected_outcomes.map(item => <div key={item}>• {item}</div>)}</td><td className="p-3 text-sm text-gray-600">{skill.verification_criteria.map(item => <div key={item}>• {item}</div>)}</td></tr>)}</tbody><tfoot><tr className="bg-gray-50 border-t-2 border-gray-200"><td className="p-3 font-bold text-[#000052]">Итого</td><td className={`p-3 font-bold ${Math.abs(result.skills.reduce((sum, skill) => sum + skill.weight, 0) - 1) < 0.001 ? 'text-emerald-600' : 'text-red-600'}`}>{(result.skills.reduce((sum, skill) => sum + skill.weight, 0) * 100).toFixed(0)}%</td><td colSpan={3}></td></tr></tfoot></table></div>
          </div>

          <div className="min-w-0 overflow-hidden"><RoleMarketAnalysis skills={result.skills} /></div>

          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 min-w-0"><h3 className="font-bold text-[#000052] mb-3">Связи между навыками</h3><div className="space-y-2">{result.skills_relations.map((relation, index) => <div key={`${relation.skill_from}-${relation.skill_to}-${index}`} className="text-sm flex flex-wrap items-center gap-2 min-w-0"><span className="font-medium text-[#000052] break-words max-w-full">{relation.skill_from}</span><span className="shrink-0 px-2 py-1 bg-[#000052]/5 rounded-lg text-xs">{RELATION_LABELS[relation.relation_type]}</span><span className="font-medium text-[#000052] break-words max-w-full">{relation.skill_to}</span><span className="shrink-0 text-gray-400">{Math.round(relation.strength * 100)}%</span></div>)}</div></div>

          {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm break-words">{error}</div>}
          <div className="flex flex-col md:flex-row gap-3"><button onClick={() => { setResult(null); setError(''); }} className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-white border border-gray-200 text-[#000052] rounded-xl font-semibold"><RefreshCw className="w-4 h-4 shrink-0" />Изменить входные данные</button><button onClick={save} disabled={!validation.valid || saving} className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl font-semibold disabled:opacity-50"><Save className="w-4 h-4 shrink-0" />{saving ? 'Сохранение...' : 'Подтвердить и сохранить'}</button></div>
        </div>
      )}

      {!result && <section className="space-y-4 min-w-0"><div className="flex items-start sm:items-center justify-between gap-3"><div className="min-w-0"><h2 className="text-xl font-bold text-[#000052]">Сохранённые роли</h2><p className="text-sm text-gray-400 mt-1">Все сохранённые декомпозиции вашей компании.</p></div><button onClick={() => void loadSavedRoles()} className="shrink-0 p-2 rounded-xl hover:bg-[#000052]/5 text-[#000052]" title="Обновить"><RefreshCw className="w-4 h-4" /></button></div>{loadingRoles ? <div className="bg-white rounded-2xl p-6 text-sm text-gray-400">Загрузка ролей...</div> : savedRoles.length === 0 ? <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-400">Сохранённых ролей пока нет.</div> : <div className="grid gap-4 md:grid-cols-2">{savedRoles.map(role => <div key={role.id} className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 border border-gray-100 min-w-0"><div className="flex items-start justify-between gap-3 min-w-0"><div className="min-w-0"><h3 className="font-bold text-[#000052] text-lg break-words">{role.name}</h3><p className="text-xs text-gray-400 mt-1 break-words">{role.industry}{role.category ? ` · ${role.category}` : ''}</p></div><span className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold">Сохранена</span></div>{role.description && <p className="text-sm text-gray-500 mt-3 break-words">{role.description}</p>}<div className="mt-4 space-y-2">{normalizeRoleSkills(role.role_skills).map((item, index) => { const skillName = item.skills?.name; return skillName ? <div key={`${skillName}-${index}`} className="flex items-start justify-between gap-3 text-sm min-w-0"><span className="text-[#000052] break-words min-w-0">{skillName}</span><span className="shrink-0 font-bold text-[#B8860B]">{Math.round(Number(item.weight) * 100)}%</span></div> : null; })}</div><div className="mt-5 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-2"><button onClick={() => void openSavedRole(role)} disabled={openingRoleId === role.id} className="flex-1 px-3 py-2.5 rounded-xl border border-[#000052] text-[#000052] text-sm font-semibold disabled:opacity-50">{openingRoleId === role.id ? 'Открываем...' : 'Открыть роль'}</button><button onClick={() => navigate(`/ceo/contracts?roleId=${role.id}`)} className="flex-1 px-3 py-2.5 rounded-xl bg-[#000052] text-white text-sm font-semibold">Создать контракт</button></div></div>)}</div>}</section>}
    </div>
  );
}
