import { ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { CEODashboard } from './pages/ceo/CEODashboard';
import { CEOSettings } from './pages/ceo/CEOSettings';
import { CEOContractsPage } from './pages/ceo/CEOContractsPage';
import { CEOContractDetailPage } from './pages/ceo/CEOContractDetailPage';
import { CEODisputesPage } from './pages/ceo/CEODisputesPage';
import { CEOAgentsPage } from './pages/ceo/CEOAgentsPage';
import { AgentDashboard } from './pages/agent/AgentDashboard';
import { AgentSettings } from './pages/agent/AgentSettings';
import { AgentContractsPage } from './pages/agent/AgentContractsPage';

function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles: string[] }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;

  if (role && !allowedRoles.includes(role)) {
    if (role === 'CEO') return <Navigate to="/ceo/dashboard" replace />;
    if (role === 'AGENT') return <Navigate to="/agent/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
  }

  if (user && role) {
    if (role === 'CEO') return <Navigate to="/ceo/dashboard" replace />;
    if (role === 'AGENT') return <Navigate to="/agent/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      <Route path="/agent/dashboard" element={<ProtectedRoute allowedRoles={['AGENT']}><AgentDashboard /></ProtectedRoute>} />
      <Route path="/agent/contracts" element={<ProtectedRoute allowedRoles={['AGENT']}><AgentContractsPage /></ProtectedRoute>} />
      <Route path="/agent/settings" element={<ProtectedRoute allowedRoles={['AGENT']}><AgentSettings /></ProtectedRoute>} />

      <Route path="/ceo/dashboard" element={<ProtectedRoute allowedRoles={['CEO']}><CEODashboard /></ProtectedRoute>} />
      <Route path="/ceo/contracts" element={<ProtectedRoute allowedRoles={['CEO']}><CEOContractsPage /></ProtectedRoute>} />
      <Route path="/ceo/contracts/:id" element={<ProtectedRoute allowedRoles={['CEO']}><CEOContractDetailPage /></ProtectedRoute>} />
      <Route path="/ceo/agents" element={<ProtectedRoute allowedRoles={['CEO']}><CEOAgentsPage /></ProtectedRoute>} />
      <Route path="/ceo/disputes" element={<ProtectedRoute allowedRoles={['CEO']}><CEODisputesPage /></ProtectedRoute>} />
      <Route path="/ceo/settings" element={<ProtectedRoute allowedRoles={['CEO']}><CEOSettings /></ProtectedRoute>} />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
}

export default App;