import { useEffect, useState } from 'react';
import { MarketValueCalculatorPage } from './MarketValueCalculatorPage';
import { MarketValueGrowthMatrix } from './MarketValueGrowthMatrix';
import { useAuth } from '../../contexts/AuthContext';

type Lang = 'ru' | 'en' | 'kk' | 'az';
type Skill = { name: string; level: number; criticality: number; evidence: string };

const MATRIX_HEADINGS = ['Чек-лист декомпозиции твоих навыков','Skill decomposition checklist','Дағдыларды декомпозициялау чек-парағы','Bacarıqların dekompozisiyası checklist-i'];

function readSkillProfile(): { role: string; skills: Skill[] } {
  const headings = Array.from(document.querySelectorAll('h2'));
  const heading = headings.find(h => MATRIX_HEADINGS.includes((h.textContent || '').trim()));
  const section = heading?.closest('section');
  if (!section) return { role: '', skills: [] };
  const inputs = Array.from(section.querySelectorAll('input')) as HTMLInputElement[];
  if (inputs.length < 2) return { role: '', skills: [] };
  const role = inputs[0]?.value || '';
  const skills: Skill[] = [];
  for (let i = 2; i + 3 < inputs.length; i += 4) {
    const name = inputs[i]?.value?.trim() || '';
    if (!name) continue;
    const level = Math.max(1, Math.min(10, Number(inputs[i + 1]?.value) || 5));
    const criticality = Math.max(1, Math.min(10, Number(inputs[i + 2]?.value) || 5));
    const evidence = inputs[i + 3]?.value || '';
    skills.push({ name, level, criticality, evidence });
  }
  return { role, skills };
}

export function MarketValueCalculatorJourney() {
  const { signOut } = useAuth();
  const [showMatrix, setShowMatrix] = useState(false);
  const [lang, setLang] = useState<Lang>('ru');
  const [profile, setProfile] = useState<{ role: string; skills: Skill[] }>({ role: '', skills: [] });

  const handleExit = async () => {
    try { await signOut(); } finally {
      localStorage.removeItem('incore-b2c-calculator');
      window.location.replace('/#/market-value');
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('incore-lang') as Lang | null;
    if (stored) setLang(stored);
    const check = () => {
      const text = document.body.textContent || '';
      const result = ['Твоя реальная рыночная стоимость', 'Your real market value', 'Нарықтағы нақты құның', 'Bazarda real dəyərin'].some(x => text.includes(x));
      setShowMatrix(result);
      if (result) {
        const nextProfile = readSkillProfile();
        setProfile(prev => JSON.stringify(prev) === JSON.stringify(nextProfile) ? prev : nextProfile);
      }
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    window.addEventListener('storage', check);
    return () => { observer.disconnect(); window.removeEventListener('storage', check); };
  }, []);

  useEffect(() => {
    const onLang = () => setLang((localStorage.getItem('incore-lang') as Lang | null) || 'ru');
    window.addEventListener('storage', onLang);
    const id = window.setInterval(onLang, 500);
    return () => { window.removeEventListener('storage', onLang); window.clearInterval(id); };
  }, []);

  return <div className="min-h-screen">
    <div className="mx-auto flex max-w-5xl justify-end px-4 pt-3">
      <button type="button" onClick={handleExit} className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50" aria-label="Выйти из аккаунта и перейти к регистрации">
        Выйти из аккаунта
      </button>
    </div>

    <style>{`[data-market-value-calculator] section[aria-label*="2026"]{display:none!important;}`}</style>
    <div data-market-value-calculator>
      <MarketValueCalculatorPage />
    </div>

    {showMatrix && <div className="mx-auto max-w-5xl px-4 pb-10"><MarketValueGrowthMatrix lang={lang} role={profile.role} skills={profile.skills} /></div>}
  </div>;
}
