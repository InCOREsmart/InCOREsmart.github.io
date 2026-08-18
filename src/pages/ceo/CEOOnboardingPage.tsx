import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Building2, ArrowRight, Check } from 'lucide-react';

export function CEOOnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!companyName.trim() || !industry.trim() || !description.trim()) {
      setError('Заполните название, индустрию и описание бизнеса.');
      return;
    }
    setLoading(true); setError('');
    try {
      const { data: existing } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
      if (existing) { navigate('/ceo/roles/decompose', { replace: true }); return; }
      const { error: insertError } = await supabase.from('companies').insert({
        user_id: user.id,
        full_name: user.user_metadata?.full_name || user.email || '',
        display_name: companyName.trim(),
        company_name: companyName.trim(),
        company_type: 'ООО',
        industry: industry.trim(),
        description: description.trim(),
        team_size: teamSize ? Number(teamSize) : null,
      });
      if (insertError) throw insertError;
      navigate('/ceo/roles/decompose', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Не удалось создать компанию.');
    } finally { setLoading(false); }
  };

  return <div className="min-h-screen bg-[#F7F8FC] flex items-center justify-center p-4">
    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-sm border border-[#000052]/10 p-6 md:p-10">
      <div className="flex items-center gap-4 mb-8"><div className="w-12 h-12 rounded-2xl bg-[#000052]/5 flex items-center justify-center"><Building2 className="w-6 h-6 text-[#000052]" /></div><div><p className="text-sm font-semibold text-[#B8860B]">Первый запуск InCORE</p><h1 className="text-2xl md:text-3xl font-bold text-[#000052]">Создайте компанию</h1></div></div>
      <p className="text-gray-500 mb-8">Сначала опишем производственную систему. Финансовые показатели появятся только после создания реальных ролей и контрактов.</p>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-8">{['Компания','Роли','Рынок','Команда','Контракты'].map((s,i)=><div key={s} className="flex items-center gap-2 text-xs font-semibold text-[#000052]"><span className="w-6 h-6 rounded-full bg-[#000052] text-white flex items-center justify-center">{i+1}</span>{s}</div>)}</div>
      <form onSubmit={submit} className="space-y-5">
        <label className="block"><span className="text-sm font-semibold text-[#000052]">Название компании *</span><input value={companyName} onChange={e=>setCompanyName(e.target.value)} required className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#B8860B]" placeholder="Например, ООО «Альфа»" /></label>
        <label className="block"><span className="text-sm font-semibold text-[#000052]">Индустрия *</span><input value={industry} onChange={e=>setIndustry(e.target.value)} required className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#B8860B]" placeholder="Страхование, EdTech, консалтинг..." /></label>
        <label className="block"><span className="text-sm font-semibold text-[#000052]">Что делает бизнес? *</span><textarea value={description} onChange={e=>setDescription(e.target.value)} required rows={4} className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#B8860B] resize-none" placeholder="Опишите, какой результат создаёт компания и за что клиенты платят." /></label>
        <label className="block"><span className="text-sm font-semibold text-[#000052]">Размер команды</span><input type="number" min="0" value={teamSize} onChange={e=>setTeamSize(e.target.value)} className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#B8860B]" placeholder="Например, 25" /></label>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
        <button disabled={loading} className="w-full flex items-center justify-center gap-2 bg-[#000052] text-white py-3.5 rounded-xl font-semibold disabled:opacity-50">{loading?'Создаём компанию...':<>Создать компанию и перейти к роли <ArrowRight className="w-4 h-4" /></>}</button>
      </form>
      <div className="mt-6 flex items-center gap-2 text-xs text-gray-400"><Check className="w-4 h-4 text-emerald-600" /> Никаких демо-контрактов и финансовых цифр до появления реальных данных компании.</div>
    </div>
  </div>;
}
