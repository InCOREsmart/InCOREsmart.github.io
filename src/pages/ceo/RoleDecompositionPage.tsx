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

type SavedRoleRelation = {
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
  role_skills: SavedRoleRelation[];
};

function normalizeRoleSkills(rows: SavedRoleRelation[]): SavedRoleRelation[] {
  return rows.flatMap(row => {
    if (!row.skills) return [];
    if (Array.isArray(row.skills)) {
      return row.skills.map(skill => ({ ...row, skills: skill }));
    }
    return [row];
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
      setSavedRoles(normalizeRoleSkills((data ?? []) as SavedRole[]));
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
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/ceo/agents')} className="p-2 rounded-xl hover:bg-[#000052]/5 text-[#000052]" aria-label="Назад"><ArrowLeft className="w-5 h-5" /></button>
        <div><h1 className="text-[26px] md:text-3xl font-bold text-[#000052]">Декомпозиция роли</h1><p className="text-sm text-gray-400 mt-1">AI конвертирует реальную работу роли в проверяемые навыки.</p></div>
      </div>

      {!result && (
        <div className="space-y-5 max-w-5xl">
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
            <div><label className="block text-sm font-semibold text-[#000052] mb-1.5">Название роли *</label><input value={input.name} onChange={e => setInput({ ...input, name: e.target.value })} placeholder="Например: Страховой агент" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/20" /></div>
            <div>
              <div className="grid grid-cols-[1fr_1fr_40px] gap-3 items-center mb-2"><div><label className="block text-sm font-semibold text-[#000052]">Что делает человек?</label><span className="text-xs text-gray-400">Конкретное действие</span></div><div><label className="block text-sm font-semibold text-[#000052]">Какой ожидаемый результат?</label><span className="text-xs text-gray-400">Что должно быть достигнуто</span></div><div /></div>
              <div className="space-y-2">{input.actions.map((item, index) => <div key={index} className="grid grid-cols-[1fr_1fr_40px] gap-3 items-center"><input value={item} onChange={e => updateList('actions', index, e.target.value)} placeholder={`Действие ${index + 1}`} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-[#000052]" /><div className="relative"><span className="absolute -left-2 top-1/2 -translate-y-1/2 text-gray-300">→</span><input value={input.expected_results[index] ?? ''} onChange={e => updateList('expected_results', index, e.target.value)} placeholder={`Результат ${index + 1}`} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-[#000052] pl-5" /></div><button onClick={() => removeListItem(index)} disabled={input.actions.length === 1} className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button></div>)}</div>
              <button onClick={addListItem} className="mt-3 inline-flex items-center gap-1 text-sm text-[#000052] font-semibold"><Plus className="w-4 h-4" /> Добавить действие</button>
            </div>
            <div className="border-t border-gray-100 pt-5">
              <label className="block text-sm font-semibold text-[#000052] mb-2">Должностная инструкция</label>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) void handleDocument(file); }} />
              <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-[#000052] hover:bg-gray-50"><Upload className="w-4 h-4" /> Загрузить документ</button>
              {documentName && <span className="ml-3 text-sm text-gray-500">{documentName}</span>}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-semibold text-[#000052] mb-1.5">Отрасль</label><select value={input.industry} onChange={e => setInput({ ...input, industry: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#000052]">{INDUSTRIES.map(industry => <option key={industry.value} value={industry.value}>{industry.label}</option>)}</select></div>
              <div><label className="block text-sm font-semibold text-[#000052] mb-1.5">Регион</label><select value={input.region} onChange={e => setInput({ ...input, region: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#000052]"><option value="az">Азербайджан</option><option value="ru">Россия</option><option value="kz">Казахстан</option><option value="other">Другой</option></select></div>
            </div>
            <button type="button" onClick={() => void decompose()} disabled={loading} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#000052] text-white font-semibold disabled:opacity-50"><Sparkles className="w-4 h-4" /> {loading ? 'Декомпозирую...' : 'Декомпозировать роль'}</button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4"><div><h2 className="text-lg font-bold text-[#000052]">Сохранённые роли</h2><p className="text-sm text-gray-400">Откройте роль, чтобы посмотреть декомпозицию и рыночный анализ.</p></div><button onClick={() => void loadSavedRoles()} className="p-2 rounded-xl hover:bg-gray-50 text-[#000052]" aria-label="Обновить"><RefreshCw className={`w-4 h-4 ${loadingRoles ? 'animate-spin' : ''}`} /></button></div>
            {loadingRoles ? <div className="py-8 text-center text-sm text-gray-400">Загрузка...</div> : savedRoles.length === 0 ? <div className="py-8 text-center text-sm text-gray-400">Сохранённых ролей пока нет.</div> : <div className="grid md:grid-cols-2 gap-3">{savedRoles.map(role => <button key={role.id} type="button" onClick={() => void openSavedRole(role)} disabled={openingRoleId === role.id} className="text-left border border-gray-200 rounded-xl p-4 hover:border-[#000052]/30 hover:bg-gray-50 transition-colors"><div className="flex items-center justify-between gap-3"><span className="font-semibold text-[#000052]">{role.name}</span>{openingRoleId === role.id && <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />}</div><p className="text-sm text-gray-500 mt-1 line-clamp-2">{role.description || 'Без описания'}</p><div className="text-xs text-gray-400 mt-2">{normalizeRoleSkills(role.role_skills).length} навыков</div></button>)}</div>}
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3"><button onClick={() => setResult(null)} className="inline-flex items-center gap-2 text-sm font-semibold text-[#000052]"><ArrowLeft className="w-4 h-4" /> К списку ролей</button><div className="flex items-center gap-2"><button onClick={() => setResult(null)} className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600"><X className="w-4 h-4" /> Закрыть</button>{validation?.valid && <button onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#000052] text-white text-sm font-semibold disabled:opacity-50"><Save className="w-4 h-4" /> {saving ? 'Сохраняю...' : 'Сохранить роль'}</button>}</div></div>
          <div className="bg-white rounded-2xl shadow-sm p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-bold text-[#000052]">{result.role.name}</h2><p className="text-gray-500 mt-1">{result.role.description}</p></div><span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#000052]/5 text-[#000052]">{result.role.industry}</span></div></div>
          <div className="bg-white rounded-2xl shadow-sm p-6"><h3 className="text-lg font-bold text-[#000052] mb-4">Навыки роли</h3><div className="space-y-3">{result.skills.map((skill, index) => <div key={`${skill.name}-${index}`} className="border border-gray-100 rounded-xl p-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="font-semibold text-[#000052]">{skill.name}</div><p className="text-sm text-gray-500 mt-1">{skill.description}</p></div><div className="w-28 shrink-0"><label className="text-xs text-gray-400">Вес, %</label><input type="number" min="0" max="100" step="1" value={Math.round(skill.weight * 100)} onChange={e => updateWeight(index, e.target.value)} className="w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm" /></div></div><div className="grid md:grid-cols-2 gap-3 mt-3 text-xs text-gray-500"><div><span className="font-semibold text-gray-600">Тип:</span> {skill.skill_type}</div><div><span className="font-semibold text-gray-600">Проверка:</span> {VERIFICATION_LABELS[skill.verification_level] ?? skill.verification_level}</div></div></div>)}</div></div>
          {result.skills_relations.length > 0 && <div className="bg-white rounded-2xl shadow-sm p-6"><h3 className="text-lg font-bold text-[#000052] mb-4">Связи навыков</h3><div className="space-y-2">{result.skills_relations.map((relation, index) => <div key={`${relation.skill_from}-${relation.skill_to}-${index}`} className="flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold text-[#000052]">{relation.skill_from}</span><span className="text-gray-400">{RELATION_LABELS[relation.relation_type] ?? relation.relation_type}</span><span className="font-semibold text-[#000052]">{relation.skill_to}</span><span className="text-xs text-gray-400">({Math.round(relation.strength * 100)}%)</span></div>)}</div></div>}
          <RoleMarketAnalysis roleName={result.role.name} skills={result.skills} />
        </div>
      )}

      {error && <div className="fixed bottom-5 right-5 max-w-md bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-lg text-sm">{error}</div>}
    </div>
  );
}
