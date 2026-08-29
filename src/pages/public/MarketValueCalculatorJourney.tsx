import { useEffect, useState } from 'react';
import { MarketValueCalculatorPage } from './MarketValueCalculatorPage';
import { MarketValueGrowthMatrix } from './MarketValueGrowthMatrix';

type Lang = 'ru' | 'en' | 'kk' | 'az';

export function MarketValueCalculatorJourney() {
  const [showMatrix, setShowMatrix] = useState(false);
  const [lang, setLang] = useState<Lang>('ru');

  useEffect(() => {
    const stored = localStorage.getItem('incore-lang') as Lang | null;
    if (stored) setLang(stored);
    const check = () => {
      const text = document.body.textContent || '';
      const result = ['Твоя реальная рыночная стоимость', 'Your real market value', 'Нарықтағы нақты құның', 'Bazarda real dəyərin'].some(x => text.includes(x));
      setShowMatrix(result);
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

  return <>
    <MarketValueCalculatorPage />
    {showMatrix && <div className="mx-auto max-w-5xl px-4 pb-10"><MarketValueGrowthMatrix lang={lang} role="" skills={[]} /></div>}
  </>;
}
