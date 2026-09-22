import { MarketValueCalculatorPage } from './MarketValueCalculatorPage';
import { useAuth } from '../../contexts/AuthContext';

export function MarketValueCalculatorJourney() {
  const { signOut } = useAuth();

  const handleExit = async () => {
    try { await signOut(); } finally {
      localStorage.removeItem('incore-b2c-calculator');
      window.location.replace('/#/market-value');
    }
  };

  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-4 flex justify-end">
        <button type="button" onClick={handleExit} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100" aria-label="Выйти из аккаунта и перейти к регистрации">
          Выйти из аккаунта
        </button>
      </div>
      <MarketValueCalculatorPage />
    </div>
  </main>;
}
