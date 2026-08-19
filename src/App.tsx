import { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { CEODashboard } from './pages/ceo/CEODashboard';
import { CEOSettings } from './pages/ceo/CEOSettings';
import { CEOContractsPage } from './pages/ceo/CEOContractsPage';
import { CEOContractDetailPage } from './pages/ceo/CEOContractDetailPage';
import { CEODisputesPage } from './pages/ceo/CEODisputesPage';
import { CEOAgentsPage } from './pages/ceo/CEOAgentsPage';
import { AgentProfilePage } from './pages/ceo/AgentProfilePage';
import { CEOIntegrationsPage } from './pages/ceo/CEOIntegrationsPage';
import { CEOAccountingExport } from './pages/ceo/CEOAccountingExport';
import { RoleDecompositionPage } from './pages/ceo/RoleDecompositionPage';
import { HHMarketPage } from './pages/ceo/HHMarketPage';
import { AgentDashboard } from './pages/agent/AgentDashboard';
import { AgentSettings } from './pages/agent/AgentSettings';
import { AgentContractsPage } from './pages/agent/AgentContractsPage';
import { AgentContractDetailPage } from './pages/agent/AgentContractDetailPage';
import { AgentPayoutsPage } from './pages/agent/AgentPayoutsPage';
import { HrLossCalculatorPage } from './pages/public/HrLossCalculatorPage';
import { RoleSkillsProgressPanel } from './components/role/RoleSkillsProgressPanel';
import { DashboardLayout } from './components/layouts/DashboardLayout';
import { LegacyUiTranslator } from './components/common/LegacyUiTranslator';

const HH_MARKET_FUNCTION = 'https://utsuzqmzawunqpiguuhk.supabase.co/functions/v1/hh-market';

function HHOAuthCallback() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const connected = params.get('hh_connected');
    const error = params.get('error');

    if (connected === '1') {
      setStatus('success');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    if (error) {
      setStatus('error');
      setMessage(params.get('error_description') || error);
      return;
    }
    if (!code) return;

    let cancelled = false;
    setStatus('loading');

    fetch(`${HH_MARKET_FUNCTION}?action=exchange&code=${encodeURIComponent(code)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || data.details?.error_description || 'HH OAuth exchange failed');
        if (data.success !== true) throw new Error(data.error || 'HH OAuth exchange failed');
        if (!cancelled) {
          window.history.replaceState({}, document.title, window.location.pathname);
          setStatus('success');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setStatus('error');
          setMessage(err instanceof Error ? err.message : 'HH OAuth exchange failed');
        }
      });
    return () => { cancelled = true; };
  }, []);

  if (status === 'idle') return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white p-6">
      <div className="max-w-md w-full rounded-xl border border-[#000052]/10 p-6 text-center">
        {status === 'loading' && <><h2 className="text-xl font-bold text-[#000052]">Подключаем HH.ru</h2><p className="mt-2 text-sm text-[#000052]/70">Сохраняем защищённый доступ к рынку труда...</p></>}
        {status === 'success' && <><h2 className="text-xl font-bold text-[#000052]">HH.ru подключён</h2><p className="mt-2 text-sm text-[#000052]/70">Авторизация успешно завершена.</p><button className="mt-5 px-4 py-2 rounded-lg bg-[#000052] text-white" onClick={() => window.location.replace('/#/ceo/roles/market')}>Перейти в HH Market</button></>}
        {status === 'error' && <><h2 className="text-xl font-bold text-red-700">Не удалось подключить HH.ru</h2><p className="mt-2 text-sm text-[#000052]/70 break-words">{message}</p></>}
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  if (loading) return <div className="flex h-screen items-center justify-center text-[#000052]">{t('common.loading')}</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
function CEOContractWithRoleProgress() { return <><CEOContractDetailPage /><RoleSkillsProgressPanel /></>; }
function AgentContractWithRoleProgress() { return <><AgentContractDetailPage /><RoleSkillsProgressPanel /></>; }

function App() {
  const { i18n } = useTranslation();
  const languageKey = i18n.resolvedLanguage || i18n.language || 'ru';

  // HR Calculator is deployed as a standalone Pages site under /hr-calculator/.
  // Keep it outside the main authenticated HashRouter so it can never redirect to /login.
  if (window.location.pathname.replace(/\/$/, '') === '/hr-calculator') {
    return <LegacyUiTranslator key={languageKey}><HrLossCalculatorPage /></LegacyUiTranslator>;
  }

  return (
    <LegacyUiTranslator key={languageKey}>
      <AuthProvider>
        <HHOAuthCallback />
        <Router>
          <Routes>
            <Route path="/hr-calculator" element={<HrLossCalculatorPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/ceo" element={<ProtectedRoute><DashboardLayout><CEODashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/ceo/settings" element={<ProtectedRoute><DashboardLayout><CEOSettings /></DashboardLayout></ProtectedRoute>} />
            <Route path="/ceo/contracts" element={<ProtectedRoute><DashboardLayout><CEOContractsPage /></DashboardLayout></ProtectedRoute>} />
            <Route path="/ceo/contracts/:id" element={<ProtectedRoute><DashboardLayout><CEOContractWithRoleProgress /></DashboardLayout></ProtectedRoute>} />
            <Route path="/ceo/disputes" element={<ProtectedRoute><DashboardLayout><CEODisputesPage /></DashboardLayout></ProtectedRoute>} />
            <Route path="/ceo/agents" element={<ProtectedRoute><DashboardLayout><CEOAgentsPage /></DashboardLayout></ProtectedRoute>} />
            <Route path="/ceo/agents/:id" element={<ProtectedRoute><DashboardLayout><AgentProfilePage /></DashboardLayout></ProtectedRoute>} />
            <Route path="/ceo/roles/decompose" element={<ProtectedRoute><DashboardLayout><RoleDecompositionPage /></DashboardLayout></ProtectedRoute>} />
            <Route path="/ceo/roles/market" element={<ProtectedRoute><DashboardLayout><HHMarketPage /></DashboardLayout></ProtectedRoute>} />
            <Route path="/ceo/integrations" element={<ProtectedRoute><DashboardLayout><CEOIntegrationsPage /></DashboardLayout></ProtectedRoute>} />
            <Route path="/ceo/accounting" element={<ProtectedRoute><DashboardLayout><CEOAccountingExport /></DashboardLayout></ProtectedRoute>} />
            <Route path="/agent" element={<ProtectedRoute><DashboardLayout><AgentDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/agent/settings" element={<ProtectedRoute><DashboardLayout><AgentSettings /></DashboardLayout></ProtectedRoute>} />
            <Route path="/agent/contracts" element={<ProtectedRoute><DashboardLayout><AgentContractsPage /></DashboardLayout></ProtectedRoute>} />
            <Route path="/agent/contracts/:id" element={<ProtectedRoute><DashboardLayout><AgentContractDetailPage /></DashboardLayout></ProtectedRoute>} />
            <Route path="/agent/payouts" element={<ProtectedRoute><DashboardLayout><AgentPayoutsPage /></DashboardLayout></ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </LegacyUiTranslator>
  );
}
export default App;
