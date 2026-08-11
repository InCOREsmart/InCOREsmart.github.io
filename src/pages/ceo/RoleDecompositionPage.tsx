import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, RefreshCw, Save, Sparkles } from 'lucide-react';
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

export function RoleDecompositionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [input, setInput] = useState<RoleInput>({ name: '', description: '', industry: 'insurance', region: 'az' });
  const [result, setResult] = useState<RoleDecomposition | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const validation = useMemo(() => result ? validateDecomposition(result) : null, [result]);
  const isInsuranceDemo = input.name.trim().toLowerCase() === 'страховой агент';

  const decompose = async () => {
    if (!input.name.trim() || !input.description.trim()) {
      setError('Заполните название и описание роли.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (isInsuranceDemo) {
        setResult(insuranceAgentDecomposition);
        return;
      }
      const { data, error: fnError } = await supabase.functions.invoke('decompose-role', { body: input });
      if (fnError) throw fnError;
      const parsed = typeof data?.result === 'string' ? JSON.parse(data.result) : data?.result;
      if (!parsed) throw new Error('AI не вернул результат.');
      setResult(parsed as RoleDecomposition);
    } catch (err) {
      console.error(err);
      setError('Не удалось выполнить AI-декомпозицию. Для роли «Страховой агент» доступна готовая проверенная декомпозиция.');
    } finally {
      setLoading(false);
    }
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
      navigate('/ceo/agents');
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
        <div>
          <h1 className="text-[26px] md:text-3xl font-bold text-[#000052]">AI-декомпозиция роли</h1>
          <p className="text-sm text-gray-400 mt-1">Разложение роли на проверяемые навыки без вмешательства в финансовую модель InCORE.</p>
        </div>
      </div>

      {!result && (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5 max-w-3xl">
          <div>
            <label className="block text-sm font-semibold text-[#000052] mb-1.5">Название роли *</label>
            <input value={input.name} onChange={e => setInput({ ...input, name: e.target.value })} placeholder="Например: Страховой агент" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/20" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#000052] mb-1.5">Описание роли *</label>
            <textarea value={input.description} onChange={e => setInput({ ...input, description: e.target.value })} rows={4} placeholder="Какие результаты должен обеспечивать человек в этой роли?" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/20" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">Индустрия</label>
              <select value={input.industry} onChange={e => setInput({ ...input, industry: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#000052]">{INDUSTRIES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">Регион</label>
              <input value={input.region} onChange={e => setInput({ ...input, region: e.target.value })} placeholder="az" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#000052]" />
            </div>
          </div>
          {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
          <button onClick={decompose} disabled={loading} className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-[#000052] text-white rounded-xl font-semibold disabled:opacity-50"><Sparkles className="w-5 h-5" />{loading ? 'AI анализирует роль...' : 'Декомпозировать роль'}</button>
          <p className="text-xs text-gray-400">Для роли «Страховой агент» используется подготовленная декомпозиция, поэтому API-ключ AI для первого теста не нужен.</p>
        </div>
      )}

      {result && validation && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div><h2 className="text-2xl font-bold text-[#000052]">{result.role.name}</h2><p className="text-sm text-gray-500 mt-1">{result.role.description}</p></div>
              <div className={`px-3 py-2 rounded-xl text-sm font-semibold ${validation.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{validation.valid ? 'Декомпозиция проверена' : 'Есть ошибки'}</div>
            </div>
            {!validation.valid && <div className="mt-4 p-4 bg-red-50 rounded-xl text-sm text-red-700">{validation.errors.map(errorItem => <div key={errorItem}>• {errorItem}</div>)}</div>}
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100"><h3 className="font-bold text-[#000052]">Навыки роли</h3><p className="text-xs text-gray-400 mt-1">Вес показывает значимость навыка внутри роли. Он не распределяет деньги контракта.</p></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[1000px]"><thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase"><th className="text-left p-3">Навык</th><th className="text-left p-3">Вес</th><th className="text-left p-3">Верификация</th><th className="text-left p-3">Результат</th><th className="text-left p-3">Проверка</th><th className="text-left p-3">Обязательный</th></tr></thead><tbody className="divide-y divide-gray-100">{result.skills.map(skill => <tr key={skill.name} className="align-top"><td className="p-3"><div className="font-semibold text-[#000052]">{skill.name}</div><div className="text-xs text-gray-500 mt-1 max-w-[300px]">{skill.description}</div></td><td className="p-3 font-bold text-[#B8860B]">{(skill.weight * 100).toFixed(0)}%</td><td className="p-3 text-sm text-[#000052]">{VERIFICATION_LABELS[skill.verification_level]}</td><td className="p-3 text-sm text-gray-600">{skill.expected_outcomes.map(item => <div key={item}>• {item}</div>)}</td><td className="p-3 text-sm text-gray-600">{skill.verification_criteria.map(item => <div key={item}>• {item}</div>)}</td><td className="p-3">{skill.is_required ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : '—'}</td></tr>)}</tbody></table></div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5"><h3 className="font-bold text-[#000052] mb-3">Связи между навыками</h3><div className="space-y-2">{result.skills_relations.map((relation, index) => <div key={`${relation.skill_from}-${relation.skill_to}-${index}`} className="text-sm flex flex-wrap items-center gap-2"><span className="font-medium text-[#000052]">{relation.skill_from}</span><span className="px-2 py-1 bg-[#000052]/5 rounded-lg text-xs">{RELATION_LABELS[relation.relation_type]}</span><span className="font-medium text-[#000052]">{relation.skill_to}</span><span className="text-gray-400">{Math.round(relation.strength * 100)}%</span></div>)}</div></div>

          {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
          <div className="flex flex-col md:flex-row gap-3"><button onClick={() => { setResult(null); setError(''); }} className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-white border border-gray-200 text-[#000052] rounded-xl font-semibold"><RefreshCw className="w-4 h-4" />Изменить роль</button><button onClick={save} disabled={!validation.valid || saving} className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl font-semibold disabled:opacity-50"><Save className="w-4 h-4" />{saving ? 'Сохранение...' : 'Подтвердить и сохранить'}</button></div>
        </div>
      )}
    </div>
  );
}
