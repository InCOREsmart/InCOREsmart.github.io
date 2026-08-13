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
import { HHMarketCollectorPage } from './pages/ceo/HHMarketCollectorPage';
import { AgentDashboard } from './pages/agent/AgentDashboard';
import { AgentSettings } from './pages/agent/AgentSettings';
import { AgentContractsPage } from './pages/agent/AgentContractsPage';
import { AgentContractDetailPage } from './pages/agent/AgentContractDetailPage';
import { AgentPayoutsPage } from './pages/agent/AgentPayoutsPage';
import { RoleSkillsProgressPanel } from './components/role/RoleSkillsProgressPanel';
import { DashboardLayout } from './components/layouts/DashboardLayout';
import { LegacyUiTranslator } from './components/common/LegacyUiTranslator';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  if (loading) return <div className="flex items-center justify-center h-screen text-[#000052]">{t('common.loading')}</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function CEOContractWithRoleProgress() {
  return <><CEOContractDetailPage /><RoleSkillsProgressPanel /></>;
}

function AgentContractWithRoleProgress() {
  return <><AgentContractDetailPage /><RoleSkillsProgressPanel /></>;
}

function App() {
  return <LegacyUiTranslator><AuthProvider><Router><Routes>
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
    <Route path="/ceo/roles/market" element={<ProtectedRoute><DashboardLayout><HHMarketCollectorPage /></DashboardLayout></ProtectedRoute>} />
    <Route path="/ceo/integrations" element={<ProtectedRoute><DashboardLayout><CEOIntegrationsPage /></DashboardLayout></ProtectedRoute>} />
    <Route path="/ceo/accounting" element={<ProtectedRoute><DashboardLayout><CEOAccountingExport /></DashboardLayout></ProtectedRoute>} />
    <Route path="/agent" element={<ProtectedRoute><DashboardLayout><AgentDashboard /></DashboardLayout></ProtectedRoute>} />
    <Route path="/agent/settings" element={<ProtectedRoute><DashboardLayout><AgentSettings /></DashboardLayout></ProtectedRoute>} />
    <Route path="/agent/contracts" element={<ProtectedRoute><DashboardLayout><AgentContractsPage /></DashboardLayout></ProtectedRoute>} />
    <Route path="/agent/contracts/:id" element={<ProtectedRoute><DashboardLayout><AgentContractWithRoleProgress /></DashboardLayout></ProtectedRoute>} />
    <Route path="/agent/payouts" element={<ProtectedRoute><DashboardLayout><AgentPayoutsPage /></DashboardLayout></ProtectedRoute>} />
    <Route path="/" element={<Navigate to="/login" replace />} />
  </Routes></Router></AuthProvider></LegacyUiTranslator>;
}

export default App;
